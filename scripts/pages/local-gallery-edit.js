let CURRENT = null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  if (!value) return "未标注";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function loadWork() {
  const url = new URLSearchParams(location.search).get("url");
  const status = document.getElementById("status");
  const list = await fetch("./data/local-gallery.json", { cache: "no-store" })
    .then(res => (res.ok ? res.json() : []))
    .catch(() => []);
  CURRENT = Array.isArray(list)
    ? list.find(item => item.url === url || item.large_url === url)
    : null;

  if (!CURRENT) {
    status.textContent = "没有找到这个本地作品。";
    return;
  }

  document.getElementById("preview").innerHTML =
    CURRENT.kind === "video"
      ? `<video src="${escapeHtml(CURRENT.url)}" controls playsinline></video>`
      : `<img src="${escapeHtml(CURRENT.url)}" alt="${escapeHtml(CURRENT.title || "作品")}">`;
  document.getElementById("title").value = CURRENT.title || "";
  document.getElementById("description").value = CURRENT.description || "";
  document.getElementById("shot-at").value = toDateInput(CURRENT.shot_at);
  document.getElementById("created-at").textContent = formatDateTime(CURRENT.created_at);
  status.textContent = "填写管理员密码后，可以直接保存。";
}

async function saveDirectly() {
  const status = document.getElementById("status");
  if (!CURRENT) {
    status.textContent = "没有正在编辑的作品。";
    return;
  }

  const adminName = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("admin-password").value;
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const shotAt = document.getElementById("shot-at").value;
  if (!adminName || !password) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }

  status.textContent = "正在保存到摄影作品库…";
  try {
    const listResult = await fetch("./api/media-list", { cache: "no-store" })
      .then(response => response.json())
      .catch(() => ({ data: [] }));
    const existing = (Array.isArray(listResult.data) ? listResult.data : []).find(
      item => item.url === CURRENT.url
    );
    const endpoint = existing ? "./api/media-update" : "./api/media-record";
    const payload = existing
      ? {
          adminName,
          password,
          id: existing.id,
          title: title || CURRENT.title || "未命名作品",
          description,
          shot_at: shotAt || null
        }
      : {
          adminName,
          password,
          title: title || CURRENT.title || "未命名作品",
          description,
          shot_at: shotAt || null,
          kind: CURRENT.kind === "video" ? "video" : "photo",
          url: CURRENT.url,
          path: `external/local-gallery-${Date.now()}`,
          fileName: CURRENT.sidecar_name || "local-work"
        };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || "保存失败");
    status.textContent = "保存成功。现在它已经进入 Supabase 摄影作品库。";
    setTimeout(() => {
      location.href = "photography-manage.html";
    }, 900);
  } catch (error) {
    status.textContent = error.message || "保存失败。";
  }
}

loadWork();
