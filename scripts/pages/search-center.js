let ITEMS = [],
  CURRENT = null,
  AUTH = {};
const esc = s =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
async function loadIndex(refresh = false) {
  AUTH = {
    adminName: document.getElementById("name").value.trim(),
    password: document.getElementById("password").value
  };
  const status = document.getElementById(refresh ? "index-status" : "login-status");
  status.textContent = "正在读取 Supabase 内容…";
  try {
    const res = await fetch("./api/admin-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...AUTH, action: "search-index" })
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || "读取失败");
    ITEMS = out.data || [];
    document.getElementById("login").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    status.textContent = `索引已生成：${new Date(out.generatedAt).toLocaleString("zh-CN")}`;
    metrics();
    render();
  } catch (e) {
    status.textContent = e.message;
  }
}
function metrics() {
  const all = new Set(ITEMS.flatMap(x => x.keywords || []));
  document.getElementById("total").textContent = ITEMS.length;
  document.getElementById("articles").textContent = ITEMS.filter(x => x.type === "article").length;
  document.getElementById("cases").textContent = ITEMS.filter(x => x.type === "case").length;
  document.getElementById("keyword-count").textContent = all.size;
  const freq = {};
  ITEMS.flatMap(x => x.keywords || []).forEach(k => (freq[k] = (freq[k] || 0) + 1));
  document.getElementById("keywords").innerHTML =
    Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `<span class="keyword">${esc(k)} · ${n}</span>`)
      .join("") || '<span class="status">暂无关键词</span>';
}
function render() {
  const q = document.getElementById("query").value.trim().toLowerCase(),
    type = document.getElementById("type-filter").value;
  const rows = ITEMS.filter(
    x =>
      (!type || x.type === type) &&
      (!q ||
        [x.title, x.intro, x.body, x.topic, ...(x.keywords || [])]
          .join(" ")
          .toLowerCase()
          .includes(q))
  );
  document.getElementById("index-status").textContent =
    `当前显示 ${rows.length} / ${ITEMS.length} 条`;
  document.getElementById("results").innerHTML =
    rows
      .map(
        x =>
          `<button class="result" onclick="selectItem('${x.id}')"><b>${esc(x.title)}</b><small>${esc(x.type)} · ${esc(x.topic)} · ${esc(x.seo_description || x.intro).slice(0, 100)}</small></button>`
      )
      .join("") || '<p class="status">没有匹配内容。</p>';
}
function selectItem(id) {
  CURRENT = ITEMS.find(x => String(x.id) === String(id));
  if (!CURRENT) return;
  document.getElementById("empty-editor").classList.add("hidden");
  document.getElementById("editor").classList.remove("hidden");
  document.getElementById("edit-title").value = CURRENT.title || "";
  document.getElementById("seo-title").value = CURRENT.seo_title || CURRENT.title || "";
  document.getElementById("seo-description").value = CURRENT.seo_description || CURRENT.intro || "";
  document.getElementById("edit-keywords").value = (CURRENT.keywords || []).join("，");
  document.getElementById("open-content").href =
    `content.html?slug=${encodeURIComponent(CURRENT.slug || "")}`;
  document.getElementById("save-status").textContent =
    CURRENT.type === "thought" ? "随笔参与搜索，但不写入 SEO 元数据。" : "";
}
async function saveSeo() {
  if (!CURRENT || CURRENT.type === "thought") return;
  const payload = {
    ...AUTH,
    id: CURRENT.id,
    title: document.getElementById("edit-title").value.trim(),
    intro: CURRENT.intro || "",
    topic: CURRENT.topic || "未分类",
    body: CURRENT.body || "",
    template: CURRENT.template,
    knowledgeLevel: CURRENT.knowledge_level,
    archive: CURRENT.archive,
    relatedDocuments: CURRENT.related_documents,
    seoTitle: document.getElementById("seo-title").value.trim(),
    seoDescription: document.getElementById("seo-description").value.trim(),
    keywords: document
      .getElementById("edit-keywords")
      .value.split(/[,，]/)
      .map(x => x.trim())
      .filter(Boolean)
  };
  const s = document.getElementById("save-status");
  s.textContent = "正在保存…";
  const res = await fetch("./api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const out = await res.json();
  if (!res.ok) {
    s.textContent = out.error || "保存失败";
    return;
  }
  s.textContent = "SEO 与关键词已保存。";
  await loadIndex(true);
}
function downloadIndex() {
  const blob = new Blob(
      [JSON.stringify({ generatedAt: new Date().toISOString(), items: ITEMS }, null, 2)],
      { type: "application/json" }
    ),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `yunhe-search-index-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
