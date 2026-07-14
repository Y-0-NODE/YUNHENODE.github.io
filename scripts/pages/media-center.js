let ITEMS = [];
const esc = s =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const encoded = s => encodeURIComponent(String(s || "")).replaceAll("'", "%27");
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
    ITEMS = Array.isArray(o.data) ? o.data : [];
    const map = { photography: "photo", video: "video", audio: "audio", assets: "asset" };
    if (map[location.hash.slice(1)])
      document.getElementById("kind").value = map[location.hash.slice(1)];
    render();
  })
  .catch(() => (document.getElementById("status").textContent = "媒体库读取失败。"));

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMediaViewer();
});
