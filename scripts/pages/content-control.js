const TYPE = new URLSearchParams(location.search).get("type") || "article",
  NAMES = { article: "文章", case: "案例", video: "视频", thought: "随笔" };
let ITEMS = [],
  CURRENT = null;
document.getElementById("page-title").textContent = `${NAMES[TYPE] || "内容"}管理`;
const v = id => document.getElementById(id).value,
  auth = () => ({ adminName: v("admin"), password: v("password") }),
  lines = id =>
    v(id)
      .split(/[\n，,]/)
      .map(x => x.trim())
      .filter(Boolean);
function meta(body) {
  return window.YunheMetadata.content.parse(body);
}
function clean(body) {
  return window.YunheMetadata.content.strip(body);
}
function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
async function call(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...auth(), ...data })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw Error(j.error || "操作失败");
  return j;
}
async function loadItems() {
  try {
    const j = await call("./api/admin-list", { type: TYPE });
    ITEMS = j.data || [];
    document.getElementById("status").textContent = `已读取 ${ITEMS.length} 条`;
    renderList();
  } catch (e) {
    document.getElementById("status").textContent = e.message;
  }
}
function renderList() {
  document.getElementById("list").innerHTML = ITEMS.length
    ? ITEMS.map(
        x =>
          `<button onclick="selectItem('${x.id}')"><b>${esc(x.title)}</b><br><small>${esc(x.lifecycle || "published")} · ${esc(window.YunheTaxonomy.classifyContent(x))}</small></button>`
      ).join("")
    : "暂无内容。";
}
function selectItem(id) {
  CURRENT = ITEMS.find(x => String(x.id) === String(id));
  if (!CURRENT) return;
  const m = meta(CURRENT.body);
  document.getElementById("selected-title").textContent = CURRENT.title;
  document.getElementById("title").value = CURRENT.title || "";
  document.getElementById("subtitle").value = m.subtitle || "";
  window.YunheTaxonomy.populateTopicSelect(document.getElementById("topic"), {
    selected: window.YunheTaxonomy.classifyContent(CURRENT)
  });
  document.getElementById("intro").value = CURRENT.intro || "";
  document.getElementById("original-date").value = m.originalDate || "";
  document.getElementById("source").value = m.source || "本站撰写";
  document.getElementById("body").value = clean(CURRENT.body);
  document.getElementById("template").value = m.template || "";
  document.getElementById("level").value = m.knowledge_level || "Observation";
  document.getElementById("collections").value = (m.collections || []).join("\n");
  document.getElementById("related").value = (m.related_documents || []).join("\n");
  document.getElementById("media").value = (m.media_files || []).join("\n");
  document.getElementById("lifecycle").value = CURRENT.lifecycle || "published";
  document.getElementById("edit").href =
    TYPE === "thought"
      ? "thought-manage.html"
      : `article-manage.html?type=${TYPE}&id=${CURRENT.id}`;
}
function resetTopic() {
  if (!CURRENT) return alert("请先选择内容");
  const topic = window.YunheTaxonomy.detectTopic(
    [v("title"), v("intro"), v("body")].join("\n"),
    v("topic")
  );
  document.getElementById("topic").value = topic;
  document.getElementById("status").textContent =
    `分类已重新判断为“${topic}”，点击“保存全部修改”后生效。`;
}
async function saveItem() {
  if (!CURRENT) return alert("请先选择内容");
  try {
    await call("./api/update", {
      id: CURRENT.id,
      title: v("title"),
      subtitle: v("subtitle"),
      topic: window.YunheTaxonomy.canonicalTopic(v("topic")),
      intro: v("intro"),
      originalDate: v("original-date"),
      source: v("source"),
      body: v("body"),
      template: v("template"),
      knowledgeLevel: v("level"),
      collections: lines("collections"),
      relatedDocuments: lines("related"),
      mediaFiles: lines("media")
    });
    await loadItems();
    alert("已保存");
  } catch (e) {
    alert(e.message);
  }
}
async function setLifecycle(lifecycle) {
  if (!CURRENT) return;
  try {
    await call("./api/update", { action: "lifecycle", id: CURRENT.id, lifecycle });
    await loadItems();
    alert("发布状态已更新");
  } catch (e) {
    alert(e.message);
  }
}
async function duplicateItem() {
  if (!CURRENT) return;
  const m = meta(CURRENT.body);
  try {
    await call("./api/publish", {
      title: `${CURRENT.title}（副本）`,
      subtitle: m.subtitle,
      intro: CURRENT.intro,
      topic: CURRENT.topic,
      body: clean(CURRENT.body),
      type: TYPE,
      template: m.template,
      knowledgeLevel: m.knowledge_level,
      originalDate: m.originalDate,
      source: m.source,
      collections: m.collections,
      relatedDocuments: m.related_documents,
      mediaFiles: m.media_files
    });
    await loadItems();
    alert("已生成一份新副本");
  } catch (e) {
    alert(e.message);
  }
}
async function removeItem() {
  if (!CURRENT || !confirm("确定删除这条内容？")) return;
  try {
    await call("./api/delete", { id: CURRENT.id, slug: CURRENT.slug, title: CURRENT.title });
    CURRENT = null;
    await loadItems();
  } catch (e) {
    alert(e.message);
  }
}
async function showHistory() {
  if (!CURRENT) return;
  try {
    const j = await call("./api/backup", { action: "history" }),
      rows = (j.data || []).filter(x => String(x.content_id) === String(CURRENT.id));
    document.getElementById("history").innerHTML = rows.length
      ? rows
          .map(
            (x, i) =>
              `<article>${esc(x.operation)} · ${new Date(x.created_at).toLocaleString()} <button onclick="restore(${i})">恢复</button></article>`
          )
          .join("")
      : "没有历史版本";
    window.HISTORY = rows;
  } catch (e) {
    alert(e.message);
  }
}
async function restore(i) {
  if (!confirm("恢复这个版本？")) return;
  try {
    await call("./api/backup", { action: "restore-version", snapshot: HISTORY[i].snapshot });
    await loadItems();
    alert("已恢复");
  } catch (e) {
    alert(e.message);
  }
}
