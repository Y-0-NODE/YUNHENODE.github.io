let ADMIN_NAME = "";
let ADMIN_PASSWORD = "";
let PROFILE = null;

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

function canvasToDataUrl(canvas, type, quality) {
  return canvas.toDataURL(type, quality);
}

async function cropAvatarDataUrl(file) {
  const image = await imageFromFile(file);
  const outputType = "image/jpeg";
  const sourceSize = Math.min(image.width, image.height);
  const sourceX = Math.max(0, Math.round((image.width - sourceSize) / 2));
  const sourceY = Math.max(0, Math.round((image.height - sourceSize) / 2));
  const attempts = [
    { size: 220, quality: 0.72 },
    { size: 180, quality: 0.68 },
    { size: 144, quality: 0.62 },
    { size: 128, quality: 0.58 }
  ];
  let best = "";

  for (const attempt of attempts) {
    const canvas = document.createElement("canvas");
    canvas.width = attempt.size;
    canvas.height = attempt.size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, attempt.size, attempt.size);
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      attempt.size,
      attempt.size
    );
    best = canvasToDataUrl(canvas, outputType, attempt.quality);
    if (best.length < 50000) break;
  }

  return {
    dataUrl: best,
    originalSize: file.size,
    newSize: Math.round((best.length * 3) / 4)
  };
}

function updateAvatarPreview() {
  const url = document.getElementById("profile-avatar").value.trim() || "app-icon.svg";
  document.getElementById("profile-avatar-preview").src = url;
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
    const profiles = await adminList("thought_profile");
    PROFILE = profiles[0] || null;
    const profile = parseProfile(PROFILE);
    document.getElementById("profile-name").value = profile.name || "云鹤系统";
    document.getElementById("profile-avatar").value = profile.avatar || "";
    document.getElementById("profile-signature").value = profile.signature || "";
    updateAvatarPreview();
    document.getElementById("login-panel").classList.add("hidden");
    document.getElementById("profile-panel").classList.remove("hidden");
  } catch (e) {
    document.getElementById("login-status").textContent = e.message || "登录失败。";
  }
}

async function cropSelectedAvatar() {
  const status = document.getElementById("profile-status");
  const file = document.getElementById("profile-avatar-file").files[0];
  if (!file) {
    status.textContent = "请先选择头像图片。";
    return;
  }

  try {
    status.textContent = "正在裁切头像...";
    const avatar = await cropAvatarDataUrl(file);
    document.getElementById("profile-avatar").value = avatar.dataUrl;
    updateAvatarPreview();
    status.textContent = `头像已裁切并预览：${formatBytes(avatar.originalSize)} → ${formatBytes(avatar.newSize)}。满意后点击“保存资料”。`;
  } catch (e) {
    status.textContent = e.message || "头像裁切失败。";
  }
}

function profileBody() {
  return JSON.stringify({
    name: document.getElementById("profile-name").value.trim() || "云鹤系统",
    avatar: document.getElementById("profile-avatar").value.trim(),
    signature: document.getElementById("profile-signature").value.trim()
  });
}

async function saveProfile() {
  const payload = {
    adminName: ADMIN_NAME,
    password: ADMIN_PASSWORD,
    title: "随笔个人资料",
    intro: document.getElementById("profile-signature").value.trim(),
    body: profileBody(),
    topic: "public"
  };

  const url = PROFILE?.id ? "/api/update" : "/api/publish";
  const requestBody = PROFILE?.id
    ? { ...payload, id: PROFILE.id }
    : { ...payload, type: "thought_profile" };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    document.getElementById("profile-status").textContent = result.error || "资料保存失败。";
    return;
  }
  PROFILE = result.data || PROFILE;
  document.getElementById("profile-status").textContent = "资料已保存。";
}

document.getElementById("profile-avatar-file").addEventListener("change", cropSelectedAvatar);
