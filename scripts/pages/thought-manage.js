let ADMIN_NAME = "";
let ADMIN_PASSWORD = "";
let POSTS = [];
let PROFILE = null;
let EDITING_ID = "";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function makeTitle(text) {
  const clean = cleanPostBody(text).replace(/\s+/g, " ").trim();
  return clean.slice(0, 24) || "未命名随笔";
}

function cleanPostBody(text) {
  return window.YunheMetadata.content.strip(text);
}

function parseProfile(row) {
  try {
    return JSON.parse(row?.body || "{}");
  } catch (e) {
    return {};
  }
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error("图片压缩失败"));
      },
      type,
      quality
    );
  });
}

async function compressImage(file, options) {
  if (!file.type.startsWith("image/")) return { file, compressed: false };
  const image = await imageFromFile(file);
  const outputType = "image/jpeg";
  let bestBlob = null;

  for (const step of options.steps) {
    const scale = Math.min(1, step.maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    bestBlob = await canvasToBlob(canvas, outputType, step.quality);
    if (bestBlob.size <= options.targetBytes) break;
  }

  const name = `${options.prefix || "image"}-${Date.now()}.jpg`;
  const uploadFile =
    typeof File === "function"
      ? new File([bestBlob], name, { type: outputType })
      : Object.assign(bestBlob, { name });

  return { file: uploadFile, compressed: true, originalSize: file.size, newSize: bestBlob.size };
}

function insertTextToPost(text) {
  const textarea = document.getElementById("post-body");
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  textarea.value = `${textarea.value.slice(0, start)}${text}${textarea.value.slice(end)}`;
  const position = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(position, position);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("手机无法读取这张图片，请换一张 JPG / PNG / WebP。"));
    reader.readAsDataURL(file);
  });
}

async function uploadThroughServer(file, options) {
  const dataUrl = await fileToDataUrl(file);
  const uploadRes = await fetch("./api/media-sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName: ADMIN_NAME,
      password: ADMIN_PASSWORD,
      mode: "inline",
      kind: options.kind || "photo",
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      dataUrl,
      title: options.title || file.name,
      description: options.description || ""
    })
  });
  const result = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) throw new Error(result.error || "图片上传失败。");
  await fetch("./api/media-record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName: ADMIN_NAME,
      password: ADMIN_PASSWORD,
      kind: options.kind || "photo",
      title: options.title || file.name,
      description: options.description || "随笔引用媒体",
      fileName: file.name,
      path: result.path,
      url: result.publicUrl
    })
  }).then(async response => {
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || "图片已上传，但没有登记进 Media Center。");
    }
  });
  return result.publicUrl;
}

async function uploadPostImage() {
  const status = document.getElementById("post-media-status");
  const file = document.getElementById("post-image-file").files[0];
  const caption = document.getElementById("post-image-caption").value.trim() || "随笔图片";

  if (!ADMIN_NAME || !ADMIN_PASSWORD) {
    status.textContent = "请先登录随笔系统。";
    return;
  }

  if (!file) {
    status.textContent = "请先选择一张图片。";
    return;
  }

  try {
    status.textContent = "正在压缩随笔图片...";
    const image = await compressImage(file, {
      prefix: "thought",
      targetBytes: 900 * 1024,
      steps: [
        { maxSize: 1800, quality: 0.86 },
        { maxSize: 1400, quality: 0.82 },
        { maxSize: 1100, quality: 0.78 },
        { maxSize: 900, quality: 0.72 },
        { maxSize: 720, quality: 0.68 }
      ]
    });
    status.textContent = `图片已压缩：${formatBytes(image.originalSize)} → ${formatBytes(image.newSize)}，正在上传...`;
    const url = await uploadThroughServer(image.file, {
      kind: "photo",
      title: caption,
      description: "从随笔管理页插入的图片"
    });
    insertTextToPost(`\n\n[图片:${caption}](${url})\n\n`);
    status.textContent = "图片已上传并插入正文。记得点击“发布 / 保存”。";
  } catch (e) {
    status.textContent = e.message || "图片上传失败。";
  }
}

document.getElementById("post-image-file").addEventListener("change", event => {
  const file = event.target.files && event.target.files[0];
  document.getElementById("post-media-status").textContent = file
    ? `已选择：${file.name}。点击“上传图片并插入”继续。`
    : "";
});

function insertMediaUrl() {
  const status = document.getElementById("post-media-status");
  const url = document.getElementById("post-media-url").value.trim();
  const caption = document.getElementById("post-image-caption").value.trim() || "媒体";

  if (!url) {
    status.textContent = "请先填写图片或视频地址。";
    return;
  }

  const isVideo = /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url);
  insertTextToPost(`\n\n[${isVideo ? "视频" : "图片"}:${caption}](${url})\n\n`);
  status.textContent = "地址已插入正文。记得点击“发布 / 保存”。";
}

async function adminList(type) {
  const res = await fetch("/api/admin-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminName: ADMIN_NAME, password: ADMIN_PASSWORD, type })
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || "读取失败");
  return Array.isArray(result.data) ? result.data : [];
}

async function login() {
  ADMIN_NAME = document.getElementById("admin-name").value.trim();
  ADMIN_PASSWORD = document.getElementById("admin-password").value.trim();

  if (!ADMIN_NAME || !ADMIN_PASSWORD) {
    document.getElementById("login-status").textContent = "请填写管理员名称和密码。";
    return;
  }

  document.getElementById("login-status").textContent = "正在登录...";
  try {
    await reloadAll();
    document.getElementById("login-panel").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("profile-chip").classList.remove("hidden");
    document.getElementById("login-status").textContent = "";
  } catch (e) {
    document.getElementById("login-status").textContent = e.message || "登录失败。";
  }
}

async function reloadAll() {
  const [posts, profiles] = await Promise.all([adminList("thought"), adminList("thought_profile")]);

  POSTS = posts;
  PROFILE = profiles[0] || null;
  const profile = parseProfile(PROFILE);
  document.getElementById("profile-name-view").textContent = profile.name || "云鹤系统";
  document.getElementById("profile-signature-view").textContent =
    profile.signature || "短记录、即时观察与公开片段。";
  document.getElementById("profile-avatar-preview").src = profile.avatar || "app-icon.svg";
  renderPosts();
}

function renderPosts() {
  const feed = document.getElementById("feed");
  const status = document.getElementById("list-status");

  if (!POSTS.length) {
    status.textContent = "还没有随笔。";
    feed.innerHTML = "";
    return;
  }

  status.textContent = "";
  feed.innerHTML = POSTS.map(
    item => `
    <article class="post-card">
      <div class="post-head">
        <span>${item.topic === "private" ? "仅自己可见" : "公开"} / ${formatDate(item.created_at)}</span>
        <div class="menu">
          <button type="button" onclick="toggleMenu(this)">⌄</button>
          <div class="menu-panel">
            <button type="button" onclick="editPost('${item.id}')">编辑</button>
            <button type="button" onclick="toggleVisibility('${item.id}')">${item.topic === "private" ? "设为公开" : "设为仅自己可见"}</button>
            <button type="button" onclick="deletePost('${item.id}')">删除</button>
          </div>
        </div>
      </div>
      <div class="post-body">${escapeHtml(cleanPostBody(item.body))}</div>
    </article>
  `
  ).join("");
}

function toggleMenu(button) {
  document.querySelectorAll(".menu.open").forEach(menu => {
    if (menu !== button.parentElement) menu.classList.remove("open");
  });
  button.parentElement.classList.toggle("open");
}

function clearComposer() {
  EDITING_ID = "";
  document.getElementById("composer-title").textContent = "写随笔";
  document.getElementById("post-body").value = "";
  document.getElementById("post-visibility").value = "public";
  document.getElementById("save-status").textContent = "";
}

function editPost(id) {
  const item = POSTS.find(post => String(post.id) === String(id));
  if (!item) return;
  EDITING_ID = String(item.id);
  document.getElementById("composer-title").textContent = "编辑随笔";
  document.getElementById("post-body").value = cleanPostBody(item.body);
  document.getElementById("post-visibility").value =
    item.topic === "private" ? "private" : "public";
  document.getElementById("post-body").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function savePost() {
  const body = document.getElementById("post-body").value.trim();
  const visibility = document.getElementById("post-visibility").value;

  if (!body) {
    document.getElementById("save-status").textContent = "内容不能为空。";
    return;
  }

  const payload = {
    adminName: ADMIN_NAME,
    password: ADMIN_PASSWORD,
    title: makeTitle(body),
    intro: body.slice(0, 100),
    body,
    topic: visibility
  };

  const url = EDITING_ID ? "/api/update" : "/api/publish";
  const requestBody = EDITING_ID ? { ...payload, id: EDITING_ID } : { ...payload, type: "thought" };

  document.getElementById("save-status").textContent = "正在保存...";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    document.getElementById("save-status").textContent = result.error || "保存失败。";
    return;
  }
  clearComposer();
  await reloadAll();
  document.getElementById("save-status").textContent = "已保存。";
}

async function toggleVisibility(id) {
  const item = POSTS.find(post => String(post.id) === String(id));
  if (!item) return;
  const next = item.topic === "private" ? "public" : "private";

  const res = await fetch("/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: item.id,
      title: item.title || makeTitle(item.body),
      intro: item.intro || "",
      body: cleanPostBody(item.body),
      topic: next,
      adminName: ADMIN_NAME,
      password: ADMIN_PASSWORD
    })
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(result.error || "修改可见性失败。");
    return;
  }
  await reloadAll();
}

async function deletePost(id) {
  const item = POSTS.find(post => String(post.id) === String(id));
  if (!item) return;
  if (!confirm("确定删除这条随笔吗？")) return;

  const res = await fetch("/api/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: item.id,
      slug: item.slug || "",
      title: item.title || "",
      adminName: ADMIN_NAME,
      password: ADMIN_PASSWORD
    })
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(result.error || "删除失败。");
    return;
  }
  POSTS = POSTS.filter(post => String(post.id) !== String(id));
  renderPosts();
}
