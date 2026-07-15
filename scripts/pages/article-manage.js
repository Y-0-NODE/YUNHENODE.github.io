let DATA = [];
let ADMIN_NAME = "";
let ADMIN_PASSWORD = "";
let EDITING_ID = "";
const PAGE_PARAMS = new URLSearchParams(location.search);
const REQUESTED_TYPE = PAGE_PARAMS.get("type");
const CONTENT_TYPE = ["case", "video"].includes(REQUESTED_TYPE) ? REQUESTED_TYPE : "article";
const TYPE_LABEL = CONTENT_TYPE === "case" ? "案例" : CONTENT_TYPE === "video" ? "视频" : "文章";
const TARGET_ID = PAGE_PARAMS.get("id") || "";
const TARGET_SLUG = PAGE_PARAMS.get("slug") || "";
const TARGET_TITLE = PAGE_PARAMS.get("title") || "";
const LEGACY_TOPIC_MAP = {
  情感关系与人际处理: "情感与关系",
  个人成长与自我观察: "个体成长",
  系统组织与规则设计: "系统机制",
  社会观察与公共议题: "社会观察",
  技术工具与数字实践: "平台与技术",
  平台: "平台与技术",
  技术: "平台与技术",
  组织: "组织结构",
  城市: "城市与空间",
  空间: "城市与空间",
  消费: "消费与生活",
  品牌: "商业与品牌",
  艺术: "艺术与创作",
  梦境: "梦境与潜意识",
  文化: "社会观察",
  社会: "社会观察"
};

function canonicalTopic(value) {
  const topic = String(value || "未分类").trim() || "未分类";
  return LEGACY_TOPIC_MAP[topic] || topic;
}

function applyPageMode() {
  document.title = `${TYPE_LABEL}管理｜云鹤系统`;
  document.getElementById("page-eyebrow").textContent =
    CONTENT_TYPE === "case"
      ? "CASE MANAGEMENT"
      : CONTENT_TYPE === "video"
        ? "VIDEO MANAGEMENT"
        : "ARTICLE MANAGEMENT";
  document.getElementById("page-title").textContent = `${TYPE_LABEL}管理`;
  document.getElementById("page-intro").textContent =
    `先登录数据管理员账户，再管理和删除${TYPE_LABEL}。`;
  document.getElementById("editor-eyebrow").textContent =
    CONTENT_TYPE === "case"
      ? "EDIT CASE"
      : CONTENT_TYPE === "video"
        ? "EDIT VIDEO"
        : "EDIT ARTICLE";
}

function articleUrl(item) {
  if (item.slug) return `content.html?slug=${encodeURIComponent(item.slug)}`;
  return `content.html?id=${encodeURIComponent(item.id)}`;
}

function splitTitle(title) {
  const text = String(title || "").trim();
  const match = text.match(/^(.*?)\s*(——|—|-)\s*(.+)$/);
  if (!match) return { title: text, subtitle: "" };
  return {
    title: match[1].trim() || text,
    subtitle: match[3].trim()
  };
}

function readMeta(body) {
  return window.YunheMetadata.content.parse(body);
}

function cleanBody(body) {
  return window.YunheMetadata.content.strip(body);
}

function render(list) {
  const box = document.getElementById("list");
  const status = document.getElementById("status");
  box.innerHTML = "";

  if (!list.length) {
    status.textContent = `暂时没有${TYPE_LABEL}。`;
    return;
  }

  status.textContent = "";
  box.innerHTML = list
    .map(item => {
      const protocol = readMeta(item.body || "");
      const template = protocol.template || (item.type === "case" ? "A" : "X");
      const level = protocol.knowledge_level || "Observation";
      return `
      <div class="manage-item">
        <div class="meta">${canonicalTopic(item.topic)} / Template ${template} / ${level} / ID ${item.id}</div>
        <h2>${splitTitle(item.title).title || `未命名${TYPE_LABEL}`}</h2>
        <p>${splitTitle(item.title).subtitle || item.intro || ""}</p>
        <div class="actions">
          <a href="${articleUrl(item)}">打开${TYPE_LABEL}</a>
          <button type="button" onclick="openEditor('${item.id}')">编辑${TYPE_LABEL}</button>
          <button class="danger" type="button" onclick="deleteArticle('${item.id}', '${encodeURIComponent(item.slug || "")}', '${encodeURIComponent(item.title || "")}')">删除${TYPE_LABEL}</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function applySearch() {
  const q = document.getElementById("search").value.trim().toLowerCase();

  if (!q) {
    render(DATA);
    return;
  }

  render(
    DATA.filter(item => {
      return [item.title, item.intro, item.topic, item.type, item.slug].some(value =>
        String(value || "")
          .toLowerCase()
          .includes(q)
      );
    })
  );
}

async function login() {
  ADMIN_NAME = document.getElementById("admin-name").value.trim();
  ADMIN_PASSWORD = document.getElementById("admin-password").value.trim();

  if (!ADMIN_NAME) {
    alert("请填写数据管理员名称。例如：YUNHE");
    document.getElementById("admin-name").focus();
    return;
  }

  if (!ADMIN_PASSWORD) {
    alert("请填写数据管理员密码。");
    document.getElementById("admin-password").focus();
    return;
  }

  document.getElementById("status").textContent = "正在登录...";
  document.getElementById("login-status").textContent = "正在登录...";
  document.getElementById("manager-panel").classList.remove("hidden");

  const res = await fetch("/api/admin-list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      adminName: ADMIN_NAME,
      password: ADMIN_PASSWORD,
      type: CONTENT_TYPE
    })
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    document.getElementById("manager-panel").classList.add("hidden");
    const message = result.error || "登录失败，请检查 Vercel 环境变量名称和密码。";
    document.getElementById("login-status").textContent = message;
    alert(message);
    return;
  }

  document.getElementById("login-panel").classList.add("hidden");
  document.getElementById("login-status").textContent = "";
  DATA = Array.isArray(result.data) ? result.data : [];
  render(DATA);
  openTargetFromUrl();
}

async function reloadArticles() {
  const res = await fetch("/api/admin-list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      adminName: ADMIN_NAME,
      password: ADMIN_PASSWORD,
      type: CONTENT_TYPE
    })
  });

  const result = await res.json().catch(() => ({}));

  if (res.ok) {
    DATA = Array.isArray(result.data) ? result.data : [];
    applySearch();
  }
}

function openEditor(id) {
  const item = DATA.find(row => String(row.id) === String(id));

  if (!item) {
    alert(`没有找到这篇${TYPE_LABEL}，请刷新管理页。`);
    return;
  }

  EDITING_ID = String(item.id);
  const titleParts = splitTitle(item.title);
  const meta = readMeta(item.body);
  document.getElementById("editor-heading").textContent =
    `编辑${TYPE_LABEL}：${titleParts.title || `未命名${TYPE_LABEL}`}`;
  document.getElementById("edit-title").value = titleParts.title || "";
  document.getElementById("edit-subtitle").value = meta.subtitle || titleParts.subtitle || "";
  document.getElementById("edit-intro").value = item.intro || "";
  document.getElementById("edit-original-date").value = meta.originalDate || "";
  document.getElementById("edit-source").value = meta.source || "本站撰写";
  document.getElementById("edit-template").value =
    meta.template || (CONTENT_TYPE === "case" ? "A" : "X");
  document.getElementById("edit-knowledge-level").value = meta.knowledge_level || "Observation";
  document.getElementById("edit-topic").value = canonicalTopic(item.topic);
  document.getElementById("edit-body").value = cleanBody(item.body || "");
  document.getElementById("media-caption").value = "";
  document.getElementById("media-url").value = "";
  document.getElementById("media-status").textContent = "";
  document.getElementById("editor-panel").classList.remove("hidden");
  document.getElementById("editor-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openTargetFromUrl() {
  if (!TARGET_ID && !TARGET_SLUG && !TARGET_TITLE) return;

  const target = DATA.find(item => {
    return (
      String(item.id) === String(TARGET_ID) ||
      (TARGET_SLUG && String(item.slug || "") === String(TARGET_SLUG)) ||
      (TARGET_TITLE && String(item.title || "") === String(TARGET_TITLE))
    );
  });

  if (!target) {
    document.getElementById("status").textContent =
      `已登录，但没有在列表里找到从详情页带来的那篇${TYPE_LABEL}。`;
    return;
  }

  openEditor(target.id);
}

function closeEditor() {
  EDITING_ID = "";
  document.getElementById("editor-panel").classList.add("hidden");
}

function getMediaLine(kind, caption, url) {
  const label = kind === "video" ? "视频" : "图片";
  const text = caption ? `${label}: ${caption}` : label;
  return `[${text}](${url})`;
}

function insertIntoEditBody(line) {
  const body = document.getElementById("edit-body");
  const position = document.getElementById("media-position").value;

  if (position === "cursor") {
    const start = body.selectionStart || 0;
    const end = body.selectionEnd || 0;
    const before = body.value.slice(0, start).replace(/\s*$/, "");
    const after = body.value.slice(end).replace(/^\s*/, "");
    body.value = `${before}${before ? "\n\n" : ""}${line}${after ? "\n\n" + after : ""}`;
    const cursor = (before ? before.length + 2 : 0) + line.length;
    body.setSelectionRange(cursor, cursor);
  } else {
    const current = body.value.trim();
    body.value = current ? `${current}\n\n${line}` : line;
  }

  body.focus();
}

function insertMediaUrl() {
  const status = document.getElementById("media-status");
  const url = document.getElementById("media-url").value.trim();
  const kind = document.getElementById("media-kind").value;
  const caption = document.getElementById("media-caption").value.trim();

  if (!EDITING_ID) {
    status.textContent = `请先打开要编辑的${TYPE_LABEL}。`;
    return;
  }

  if (!url) {
    status.textContent = "请先填写图片或视频地址。";
    return;
  }

  insertIntoEditBody(getMediaLine(kind, caption, url));
  status.textContent = "已经插入正文，记得点击“保存修改”。";
}

async function saveEdit() {
  if (!EDITING_ID) {
    alert(`没有正在编辑的${TYPE_LABEL}。`);
    return;
  }

  const payload = {
    id: EDITING_ID,
    title: document.getElementById("edit-title").value.trim(),
    subtitle: document.getElementById("edit-subtitle").value.trim(),
    intro: document.getElementById("edit-intro").value.trim(),
    originalDate: document.getElementById("edit-original-date").value,
    source: document.getElementById("edit-source").value,
    template: document.getElementById("edit-template").value,
    knowledgeLevel: document.getElementById("edit-knowledge-level").value,
    topic: document.getElementById("edit-topic").value,
    body: document.getElementById("edit-body").value.trim(),
    adminName: ADMIN_NAME,
    password: ADMIN_PASSWORD
  };

  if (!payload.title || !payload.body) {
    alert("标题和正文不能为空。");
    return;
  }

  const res = await fetch("/api/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    alert(result.error || "保存失败，请检查接口或环境变量。");
    return;
  }

  alert("已保存");
  closeEditor();
  await reloadArticles();
}

async function deleteArticle(id, encodedSlug, encodedTitle) {
  const slug = decodeURIComponent(encodedSlug || "");
  const title = decodeURIComponent(encodedTitle || "");
  const name = title || slug || `ID ${id}`;
  const ok = confirm(`确定删除${TYPE_LABEL}「${name}」吗？删除后不能在网站里恢复。`);

  if (!ok) return;

  const res = await fetch("/api/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      slug,
      title,
      adminName: ADMIN_NAME,
      password: ADMIN_PASSWORD
    })
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    alert(result.error || "删除失败，请检查 Vercel 环境变量和 Supabase 权限。");
    return;
  }

  alert(`已删除：${result.deleted?.title || name}`);
  DATA = DATA.filter(item => String(item.id) !== String(id));
  render(DATA);
  reloadArticles();
}

applyPageMode();
