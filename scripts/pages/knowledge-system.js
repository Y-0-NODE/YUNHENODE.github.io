let AUTH = {},
  CONFIG = null,
  DOCS = [],
  CURRENT = null;
const esc = s =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const lines = id =>
  document
    .getElementById(id)
    .value.split("\n")
    .map(x => x.trim())
    .filter(Boolean);
async function post(url, data) {
  const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...AUTH, ...data })
    }),
    o = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(o.error || "请求失败");
  return o;
}
async function login() {
  AUTH = {
    adminName: document.getElementById("name").value.trim(),
    password: document.getElementById("password").value
  };
  const s = document.getElementById("login-status");
  s.textContent = "正在读取配置与文章…";
  try {
    const [c, d] = await Promise.all([
      post("./api/admin-list", { action: "config-get" }),
      post("./api/admin-list", { action: "search-index" })
    ]);
    CONFIG = c.data;
    DOCS = (d.data || []).filter(x => ["article", "case"].includes(x.type));
    document.getElementById("login").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    fillConfig();
    renderDocs();
  } catch (e) {
    s.textContent = e.message;
  }
}
function fillConfig() {
  renderTemplates();
  document.getElementById("topic-values").value = (CONFIG.topics || []).join("\n");
  document.getElementById("level-values").value = (CONFIG.levels || []).join("\n");
  document.getElementById("category-values").value = (CONFIG.categories || []).join("\n");
  document.getElementById("tag-values").value = (CONFIG.tags || []).join("\n");
  document.getElementById("archives").value = (CONFIG.archives || []).join("\n");
  document.getElementById("rules").value = (CONFIG.relationRules || []).join("\n");
  refreshSelects();
}
function renderTemplates() {
  document.getElementById("template-list").innerHTML = (CONFIG.templates || [])
    .map(
      (t, i) =>
        `<div class="template-row"><input value="${esc(t.code)}" maxlength="3" onchange="CONFIG.templates[${i}].code=this.value.toUpperCase()"><input value="${esc(t.name)}" onchange="CONFIG.templates[${i}].name=this.value"><input class="description" value="${esc(t.description)}" onchange="CONFIG.templates[${i}].description=this.value"><button onclick="removeTemplate(${i})">删除</button></div>`
    )
    .join("");
}
function addTemplate() {
  CONFIG.templates.push({ code: "X", name: "新模板", description: "请填写用途" });
  renderTemplates();
  refreshSelects();
}
function removeTemplate(i) {
  if (CONFIG.templates.length <= 1) return;
  CONFIG.templates.splice(i, 1);
  renderTemplates();
  refreshSelects();
}
function currentConfig() {
  CONFIG.topics = lines("topic-values");
  CONFIG.levels = lines("level-values");
  CONFIG.categories = lines("category-values");
  CONFIG.tags = lines("tag-values");
  CONFIG.archives = lines("archives");
  CONFIG.relationRules = lines("rules");
  return CONFIG;
}
async function saveConfig() {
  const s = document.getElementById("config-status");
  s.textContent = "正在保存…";
  try {
    const o = await post("./api/admin-list", { action: "config-save", config: currentConfig() });
    CONFIG = o.data;
    s.textContent = "知识系统配置已保存到 Supabase。";
    refreshSelects();
  } catch (e) {
    s.textContent = e.message;
  }
}
function renderDocs() {
  const q = document.getElementById("doc-query").value.toLowerCase();
  const rows = DOCS.filter(
    x => !q || [x.title, x.topic, ...(x.keywords || [])].join(" ").toLowerCase().includes(q)
  );
  document.getElementById("doc-count").textContent = `${rows.length} 条`;
  document.getElementById("documents").innerHTML =
    rows
      .map(
        x =>
          `<button class="document" onclick="selectDoc('${x.id}')"><b>${esc(x.title)}</b><small>${esc(x.type)} · ${esc(x.topic)} · ${esc(x.knowledge_level || "未分层")}</small></button>`
      )
      .join("") || '<p class="status">没有匹配内容。</p>';
}
function options(values, current) {
  return (values || [])
    .map(x => `<option value="${esc(x)}" ${x === current ? "selected" : ""}>${esc(x)}</option>`)
    .join("");
}
function refreshSelects() {
  if (!CONFIG) return;
  const t = (CONFIG.templates || []).map(x => ({ value: x.code, label: `${x.code} | ${x.name}` }));
  const template = document.getElementById("doc-template");
  template.innerHTML = t
    .map(x => `<option value="${esc(x.value)}">${esc(x.label)}</option>`)
    .join("");
  document.getElementById("doc-topic").innerHTML = options(CONFIG.topics);
  document.getElementById("doc-level").innerHTML = options(CONFIG.levels);
  document.getElementById("doc-archive").innerHTML = options(CONFIG.archives);
  if (CURRENT) populateStructure();
}
function selectDoc(id) {
  CURRENT = DOCS.find(x => String(x.id) === String(id));
  if (!CURRENT) return;
  document.getElementById("structure-empty").classList.add("hidden");
  document.getElementById("structure").classList.remove("hidden");
  populateStructure();
}
function populateStructure() {
  document.getElementById("doc-title").value = CURRENT.title || "";
  document.getElementById("doc-template").value = CURRENT.template || "X";
  document.getElementById("doc-topic").value = CURRENT.topic || "";
  document.getElementById("doc-level").value = CURRENT.knowledge_level || "Observation";
  document.getElementById("doc-archive").value = CURRENT.archive || "未分类档案";
  document.getElementById("doc-keywords").value = (CURRENT.keywords || []).join("，");
  document.getElementById("doc-related").value = (CURRENT.related_documents || []).join("\n");
  document.getElementById("open-doc").href =
    `content.html?slug=${encodeURIComponent(CURRENT.slug || "")}`;
}
async function saveStructure() {
  if (!CURRENT) return;
  const s = document.getElementById("structure-status");
  s.textContent = "正在保存…";
  try {
    await post("./api/update", {
      id: CURRENT.id,
      title: CURRENT.title,
      intro: CURRENT.intro || "",
      body: CURRENT.body || "",
      topic: document.getElementById("doc-topic").value,
      template: document.getElementById("doc-template").value,
      knowledgeLevel: document.getElementById("doc-level").value,
      archive: document.getElementById("doc-archive").value,
      keywords: document
        .getElementById("doc-keywords")
        .value.split(/[,，]/)
        .map(x => x.trim())
        .filter(Boolean),
      relatedDocuments: lines("doc-related"),
      seoTitle: CURRENT.seo_title,
      seoDescription: CURRENT.seo_description
    });
    s.textContent = "知识结构已保存。";
    Object.assign(CURRENT, {
      topic: document.getElementById("doc-topic").value,
      template: document.getElementById("doc-template").value,
      knowledge_level: document.getElementById("doc-level").value,
      archive: document.getElementById("doc-archive").value,
      keywords: document
        .getElementById("doc-keywords")
        .value.split(/[,，]/)
        .map(x => x.trim())
        .filter(Boolean),
      related_documents: lines("doc-related")
    });
    renderDocs();
  } catch (e) {
    s.textContent = e.message;
  }
}
