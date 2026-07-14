let WORKS = [];

const escapeHtml = window.YunheUtils.escapeHtml;

async function loadJson(url, fallback) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch (e) {
    return fallback;
  }
}

const formatDateTime = window.YunheUtils.formatDateTime;

function openDetail(index) {
  const item = WORKS[index];
  if (!item) return;
  const detail = document.getElementById("detail");
  const media = document.getElementById("detail-media");
  const url = item.large_url || item.url || "";
  media.innerHTML =
    item.kind === "video"
      ? `<video src="${escapeHtml(url)}" controls playsinline></video>`
      : `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title || "作品")}">`;
  document.getElementById("detail-title").textContent = item.title || "未命名作品";
  document.getElementById("detail-description").textContent = item.description || "暂无说明。";
  document.getElementById("detail-time").textContent = formatDateTime(item.created_at);
  document.getElementById("detail-shot-time").textContent = item.shot_at || "未标注";
  document.getElementById("detail-source").textContent =
    item.source === "local-folder" ? "本地摄影文件夹" : "作品库";

  detail.classList.add("is-open");
  detail.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  const detail = document.getElementById("detail");
  detail.classList.remove("is-open");
  detail.setAttribute("aria-hidden", "true");
  document.getElementById("detail-media").innerHTML = "";
  document.body.style.overflow = "";
}

document.getElementById("detail").addEventListener("click", event => {
  if (event.target.id === "detail") closeDetail();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeDetail();
});

async function loadGallery() {
  const status = document.getElementById("status");
  const gallery = document.getElementById("gallery");
  status.textContent = "正在加载作品...";
  try {
    const cacheKey = Date.now();
    const remoteResult = await loadJson(`./api/media-list?refresh=${cacheKey}`, { data: [] });
    const list = Array.isArray(remoteResult.data)
      ? remoteResult.data.filter(item => ["photo", "video"].includes(item.kind))
      : [];
    list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    if (!list.length) {
      status.textContent = "暂时没有作品。";
      gallery.innerHTML = "";
      return;
    }

    WORKS = list;
    status.textContent = "";
    gallery.innerHTML = list
      .map(
        (item, index) => `
      <button class="work" type="button" onclick="openDetail(${index})">
        ${
          item.kind === "video"
            ? `<video src="${escapeHtml(item.url)}" controls playsinline></video>`
            : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title || "作品")}">`
        }
        <div class="work-info">
          <h2>${escapeHtml(item.title || "未命名作品")}</h2>
          <p>${escapeHtml(item.description || "")}</p>
        </div>
      </button>
    `
      )
      .join("");
  } catch (error) {
    status.textContent = "作品加载失败。";
  }
}

window.addEventListener("pageshow", loadGallery);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadGallery();
});
