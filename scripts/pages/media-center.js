let ITEMS = [];
let CONTACT_RECORD = null;
let CONTACT_ROWS = [];
const CONTACT_SETTINGS_TITLE = "YUNHE_PUBLIC_CONTACTS";
const DEFAULT_CONTACT_SETTINGS = {
  title: "联系方式",
  intro: "如需合作，可通过以下方式联系。",
  contacts: [
    {
      label: "Email",
      value: "YUNHE-ZK@outlook.com",
      url: "mailto:YUNHE-ZK@outlook.com",
      visible: true
    },
    { label: "Behance", value: "云鹤系统", url: "", visible: true },
    { label: "GitHub", value: "YUNHENODE", url: "", visible: true },
    { label: "公众号", value: "云鹤系统", url: "", visible: true },
    { label: "小红书", value: "云鹤系统", url: "", visible: true }
  ]
};
const esc = s =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const encoded = s => encodeURIComponent(String(s || "")).replaceAll("'", "%27");
const contactId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function contactDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_CONTACT_SETTINGS));
}

function parseContactSettings(record) {
  if (!record?.description) return contactDefaults();
  try {
    const parsed = JSON.parse(record.description);
    return {
      title: String(parsed.title || DEFAULT_CONTACT_SETTINGS.title),
      intro: String(parsed.intro || DEFAULT_CONTACT_SETTINGS.intro),
      contacts: Array.isArray(parsed.contacts)
        ? parsed.contacts.map(item => ({
            id: item.id || contactId(),
            label: String(item.label || ""),
            value: String(item.value || ""),
            url: String(item.url || ""),
            visible: item.visible !== false
          }))
        : contactDefaults().contacts
    };
  } catch (error) {
    return contactDefaults();
  }
}

function collectContactRows() {
  return Array.from(document.querySelectorAll(".contact-row")).map(row => ({
    id: row.dataset.id || contactId(),
    label: row.querySelector('[data-field="label"]').value.trim(),
    value: row.querySelector('[data-field="value"]').value.trim(),
    url: row.querySelector('[data-field="url"]').value.trim(),
    visible: row.querySelector('[data-field="visible"]').checked
  }));
}

function renderContactRows() {
  const box = document.getElementById("contact-rows");
  if (!box) return;
  box.innerHTML = CONTACT_ROWS.map(
    (item, index) => `
      <div class="contact-row" data-id="${esc(item.id || contactId())}">
        <input data-field="label" value="${esc(item.label)}" placeholder="名称，例如 Email" aria-label="联系方式名称">
        <input data-field="value" value="${esc(item.value)}" placeholder="公开显示的内容" aria-label="联系方式显示内容">
        <input data-field="url" value="${esc(item.url)}" placeholder="链接，可留空" aria-label="联系方式链接">
        <label class="contact-visible" title="是否公开">
          <input data-field="visible" type="checkbox" ${item.visible !== false ? "checked" : ""} aria-label="公开这个联系方式">
        </label>
        <button class="contact-remove" type="button" onclick="removeContactRow(${index})">删除</button>
      </div>
    `
  ).join("");
}

function loadContactSettings(record) {
  CONTACT_RECORD = record || null;
  const settings = parseContactSettings(record);
  CONTACT_ROWS = settings.contacts.map(item => ({ id: item.id || contactId(), ...item }));
  document.getElementById("contact-section-title").value = settings.title;
  document.getElementById("contact-section-intro").value = settings.intro;
  renderContactRows();
  document.getElementById("contact-status").textContent = record
    ? "已读取当前公开联系方式设置。"
    : "还没有保存自定义设置，目前显示默认联系方式。";
}

function addContactRow() {
  CONTACT_ROWS = collectContactRows();
  CONTACT_ROWS.push({ id: contactId(), label: "", value: "", url: "", visible: true });
  renderContactRows();
}

function removeContactRow(index) {
  CONTACT_ROWS = collectContactRows();
  CONTACT_ROWS.splice(index, 1);
  renderContactRows();
}

function resetContactDefaults() {
  if (!confirm("恢复默认联系方式项目？点击保存后才会同步到公开页面。")) return;
  const defaults = contactDefaults();
  CONTACT_ROWS = defaults.contacts.map(item => ({ id: contactId(), ...item }));
  document.getElementById("contact-section-title").value = defaults.title;
  document.getElementById("contact-section-intro").value = defaults.intro;
  renderContactRows();
  document.getElementById("contact-status").textContent = "已恢复默认内容，请点击保存。";
}

async function saveContactSettings() {
  const status = document.getElementById("contact-status");
  const adminName = document.getElementById("contact-admin-name").value.trim();
  const password = document.getElementById("contact-admin-password").value.trim();
  const title = document.getElementById("contact-section-title").value.trim() || "联系方式";
  const intro = document.getElementById("contact-section-intro").value.trim();
  const contacts = collectContactRows().filter(item => item.label || item.value || item.url);

  if (!adminName || !password) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }

  const description = JSON.stringify({ version: 1, title, intro, contacts });
  const isUpdate = Boolean(CONTACT_RECORD?.id);
  const endpoint = isUpdate ? "./api/media-update" : "./api/media-record";
  const payload = isUpdate
    ? {
        id: CONTACT_RECORD.id,
        adminName,
        password,
        title: CONTACT_SETTINGS_TITLE,
        description
      }
    : {
        adminName,
        password,
        kind: "asset",
        title: CONTACT_SETTINGS_TITLE,
        description,
        path: "external/settings/public-contacts",
        url: new URL("about.html#contact", location.href).href
      };

  status.textContent = "正在保存并同步到公开页面…";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      status.textContent = result.error || "联系方式保存失败。";
      return;
    }
    CONTACT_RECORD = result.data || CONTACT_RECORD;
    CONTACT_ROWS = contacts;
    renderContactRows();
    status.innerHTML = `已保存。<a href="about.html?visitor=1&refresh=${Date.now()}#contact" target="_blank">查看公开联系方式</a>`;
  } catch (error) {
    status.textContent = error.message || "联系方式保存失败。";
  }
}

function preview(x) {
  if (x.kind === "video") return `<video src="${esc(x.url)}" controls playsinline></video>`;
  if (x.kind === "audio") return `<audio src="${esc(x.url)}" controls></audio>`;
  if (x.kind === "document") return '<div class="file-icon">PDF</div>';
  return `<img src="${esc(x.url)}" alt="${esc(x.title || "媒体")}">`;
}
function previewLink(x) {
  const content = preview(x);
  if (!["photo", "asset"].includes(x.kind) || !x.url) {
    return `<div class="preview">${content}</div>`;
  }
  return `<button class="preview" type="button" onclick="openMediaViewer('${encoded(x.url)}','${encoded(x.title || "未命名作品")}')" title="点击查看大图">${content}</button>`;
}
function ensureMediaViewer() {
  if (document.getElementById("media-viewer")) return;
  if (!document.getElementById("media-viewer-styles")) {
    const styles = document.createElement("style");
    styles.id = "media-viewer-styles";
    styles.textContent = `
      .media-viewer{position:fixed;inset:0;z-index:1000;display:none;padding:clamp(14px,4vw,48px);background:rgba(0,0,0,.94);overflow:auto}
      .media-viewer.is-open{display:grid;place-items:center}
      .media-viewer-inner{width:min(1600px,100%)}
      .media-viewer-bar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:14px;color:#eee}
      .media-viewer-bar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .media-viewer-bar button{border:1px solid #444;background:#111;color:#eee;padding:10px 15px;cursor:pointer}
      .media-viewer-image{display:block;width:100%;max-height:calc(100vh - 120px);object-fit:contain;background:#050505}
    `;
    document.head.appendChild(styles);
  }
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div id="media-viewer" class="media-viewer" aria-hidden="true" role="dialog" aria-modal="true" aria-label="作品大图">
      <div class="media-viewer-inner">
        <div class="media-viewer-bar">
          <strong id="media-viewer-title"></strong>
          <button type="button" onclick="closeMediaViewer()">关闭</button>
        </div>
        <img id="media-viewer-image" alt="">
      </div>
    </div>`
  );
  document.getElementById("media-viewer").addEventListener("click", event => {
    if (event.target.id === "media-viewer") closeMediaViewer();
  });
}
function openMediaViewer(encodedUrl, encodedTitle) {
  ensureMediaViewer();
  const viewer = document.getElementById("media-viewer");
  const title = decodeURIComponent(encodedTitle);
  const image = document.getElementById("media-viewer-image");
  image.src = decodeURIComponent(encodedUrl);
  image.alt = title;
  document.getElementById("media-viewer-title").textContent = title;
  viewer.classList.add("is-open");
  viewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeMediaViewer() {
  const viewer = document.getElementById("media-viewer");
  if (!viewer) return;
  viewer.classList.remove("is-open");
  viewer.setAttribute("aria-hidden", "true");
  document.getElementById("media-viewer-image").removeAttribute("src");
  document.body.style.overflow = "";
}
function render() {
  const q = document.getElementById("query").value.toLowerCase(),
    kind = document.getElementById("kind").value;
  const rows = ITEMS.filter(
    x =>
      (!kind || x.kind === kind) &&
      (!q || [x.title, x.description, x.kind].join(" ").toLowerCase().includes(q))
  );
  document.getElementById("status").textContent = `${rows.length} / ${ITEMS.length} 项资源`;
  document.getElementById("grid").innerHTML =
    rows
      .map(
        x =>
          `<article class="media-card">${previewLink(x)}<div class="meta"><h2>${esc(x.title || "未命名资源")}</h2><p>${esc(x.description || x.kind || "")}</p><div class="actions">${["photo", "asset"].includes(x.kind) && x.url ? `<button type="button" onclick="openMediaViewer('${encoded(x.url)}','${encoded(x.title || "未命名作品")}')">查看大图</button>` : ""}<button onclick="copyUrl('${encoded(x.url)}')">复制引用地址</button><a class="button" href="media-edit.html?id=${encodeURIComponent(x.id)}">编辑信息</a></div></div></article>`
      )
      .join("") || '<p class="status">该类型暂无资源。</p>';
}
function setKind(kind) {
  document.getElementById("kind").value = kind;
  location.hash = "library";
  render();
}
async function copyUrl(value) {
  const url = decodeURIComponent(value);
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById("status").textContent = "已复制媒体引用地址。";
  } catch (e) {
    prompt("复制这个媒体地址：", url);
  }
}
fetch("./api/media-list", { cache: "no-store" })
  .then(r => r.json())
  .then(o => {
    const allItems = Array.isArray(o.data) ? o.data : [];
    const contactRecord = allItems.find(item => item.title === CONTACT_SETTINGS_TITLE);
    ITEMS = allItems.filter(item => item.title !== CONTACT_SETTINGS_TITLE);
    loadContactSettings(contactRecord);
    const map = { photography: "photo", video: "video", audio: "audio", assets: "asset" };
    if (map[location.hash.slice(1)])
      document.getElementById("kind").value = map[location.hash.slice(1)];
    render();
  })
  .catch(() => {
    document.getElementById("status").textContent = "媒体库读取失败。";
    loadContactSettings(null);
    document.getElementById("contact-status").textContent =
      "联系方式设置读取失败，目前显示默认项目。";
  });

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMediaViewer();
});
