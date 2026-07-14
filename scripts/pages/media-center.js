let ITEMS = [];
const esc = s =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  return `<a class="preview" href="${esc(x.url)}" target="_blank" rel="noopener" title="点击查看大图">${content}</a>`;
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
          `<article class="media-card">${previewLink(x)}<div class="meta"><h2>${esc(x.title || "未命名资源")}</h2><p>${esc(x.description || x.kind || "")}</p><div class="actions">${["photo", "asset"].includes(x.kind) && x.url ? `<a class="button" href="${esc(x.url)}" target="_blank" rel="noopener">查看大图</a>` : ""}<button onclick="copyUrl('${encodeURIComponent(x.url || "")}')">复制引用地址</button><a class="button" href="media-edit.html?id=${encodeURIComponent(x.id)}">编辑信息</a></div></div></article>`
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
