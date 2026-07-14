const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;

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
      reject(new Error("图片读取失败，请换 JPG / PNG / WebP 图片。"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error("图片压缩失败。"));
      },
      type,
      quality
    );
  });
}

async function compressImageForUpload(file, targetBytes) {
  if (!file.type.startsWith("image/")) return { file, changed: false };

  const image = await imageFromFile(file);
  const steps = [
    { maxSize: 3200, quality: 0.9 },
    { maxSize: 2800, quality: 0.86 },
    { maxSize: 2400, quality: 0.82 },
    { maxSize: 2000, quality: 0.78 },
    { maxSize: 1600, quality: 0.72 },
    { maxSize: 1200, quality: 0.66 },
    { maxSize: 900, quality: 0.58 },
    { maxSize: 700, quality: 0.5 }
  ];
  let blob = null;

  for (const step of steps) {
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
    blob = await canvasToBlob(canvas, "image/jpeg", step.quality);
    if (blob.size <= targetBytes) break;
  }

  const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}-compressed.jpg`;
  const nextFile =
    typeof File === "function"
      ? new File([blob], name, { type: "image/jpeg" })
      : Object.assign(blob, { name });

  return {
    file: nextFile,
    changed: true,
    originalSize: file.size,
    newSize: blob.size
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片兜底保存失败。"));
    reader.readAsDataURL(file);
  });
}

function setupSelectedFilePreview() {
  const input = document.getElementById("file");
  if (!input || document.getElementById("selected-file-preview")) return;
  const preview = document.createElement("div");
  preview.id = "selected-file-preview";
  preview.className = "hint";
  preview.style.display = "none";
  input.insertAdjacentElement("afterend", preview);
  let objectUrl = "";

  input.addEventListener("change", () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
    const file = input.files?.[0];
    if (!file) {
      preview.style.display = "none";
      preview.innerHTML = "";
      return;
    }

    preview.style.display = "block";
    preview.textContent = `即将上传：${file.name}（${formatBytes(file.size)}）`;
    if (file.type.startsWith("image/")) {
      objectUrl = URL.createObjectURL(file);
      const image = document.createElement("img");
      image.src = objectUrl;
      image.alt = "准备上传的摄影作品预览";
      image.style.cssText =
        "display:block;width:100%;max-height:360px;object-fit:contain;margin-top:12px;background:#080808";
      preview.appendChild(image);
    }
  });
}

async function uploadMedia() {
  const selectedFile = document.getElementById("file").files[0];
  const status = document.getElementById("status");
  const adminName = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("admin-password").value.trim();
  const kind = document.getElementById("kind").value;
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const shotAt = document.getElementById("shot-at").value;
  const photoQuality = document.getElementById("photo-quality")?.value || "web-hd";
  const externalUrl = document.getElementById("external-url").value.trim();

  if (!selectedFile && !externalUrl) {
    alert("请选择文件，或者粘贴一个已有作品地址。");
    return;
  }

  if (!adminName || !password) {
    alert("请填写账户名称和密码。");
    return;
  }

  if (!selectedFile && externalUrl) {
    status.textContent = "正在把已有作品地址写入作品库...";
    const recordRes = await fetch("./api/media-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminName,
        password,
        kind,
        title,
        description,
        shot_at: shotAt || null,
        fileName: externalUrl.split("/").pop() || "external-media",
        path: `external/${Date.now()}`,
        url: externalUrl
      })
    });
    const record = await recordRes.json().catch(() => ({}));
    if (!recordRes.ok) {
      const detail = record.detail ? `｜${record.detail}` : "";
      status.textContent = `${record.error || "作品地址保存失败。"}${detail}`;
      return;
    }
    status.textContent = "作品地址已保存，已经进入艺术摄影页面。";
    return;
  }

  if (!window.supabase) {
    status.textContent = "上传组件加载失败，请刷新页面，或改用“已有作品地址”。";
    return;
  }

  let file = selectedFile;
  let compressed = null;

  try {
    if (kind === "photo" && selectedFile.type.startsWith("image/")) {
      status.textContent = "正在压缩图片...";
      const targetBytes = photoQuality === "web-standard" ? 700 * 1024 : 2 * 1024 * 1024;
      compressed = await compressImageForUpload(selectedFile, targetBytes);
      file = compressed.file;
      if (compressed.changed) {
        status.textContent = `图片已压缩：${formatBytes(compressed.originalSize)} → ${formatBytes(compressed.newSize)}，正在申请上传通道...`;
      }
    } else {
      status.textContent = "正在申请上传通道...";
    }
  } catch (e) {
    status.textContent = e.message || "图片压缩失败。";
    return;
  }

  async function requestSign(uploadFile) {
    const signRes = await fetch("./api/media-sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminName,
        password,
        kind,
        fileName: uploadFile.name,
        contentType: uploadFile.type || "application/octet-stream"
      })
    });

    const sign = await signRes.json().catch(() => ({}));
    if (!signRes.ok) throw new Error(sign.error || "申请上传通道失败。");
    return sign;
  }

  async function uploadWithSign(uploadFile) {
    const sign = await requestSign(uploadFile);
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const uploadResult = await client.storage
      .from(sign.bucket)
      .uploadToSignedUrl(sign.path, sign.token, uploadFile);

    if (uploadResult.error) {
      const message = uploadResult.error.message || "上传到 Supabase 失败。";
      const error = new Error(message);
      error.sign = sign;
      throw error;
    }

    return sign;
  }

  async function uploadThroughCompatibleChannel(uploadFile) {
    const dataUrl = await fileToDataUrl(uploadFile);
    const response = await fetch("./api/media-sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminName,
        password,
        kind,
        mode: "inline",
        fileName: uploadFile.name,
        contentType: uploadFile.type || "image/jpeg",
        dataUrl
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "兼容上传通道失败。");
    return result;
  }

  let sign = null;
  try {
    status.textContent = "正在直传到 Supabase，请不要关闭页面...";
    sign = await uploadWithSign(file);
  } catch (e) {
    if (kind !== "photo" || !selectedFile.type.startsWith("image/")) {
      status.textContent = e.message || "上传到 Supabase 失败。";
      return;
    }

    try {
      status.textContent = "直传没有完成，正在改用手机兼容上传通道...";
      compressed = await compressImageForUpload(selectedFile, 1500 * 1024);
      file = compressed.file;
      status.textContent = `兼容上传版本：${formatBytes(compressed.newSize)}，正在上传到 Supabase Storage...`;
      sign = await uploadThroughCompatibleChannel(file);
    } catch (compatibleError) {
      status.textContent = `${compatibleError.message || e.message || "上传失败。"} 没有保存低清替代图，请稍后重试。`;
      return;
    }
  }

  status.textContent = "文件已上传，正在写入作品库...";
  const recordRes = await fetch("./api/media-record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName,
      password,
      kind,
      title,
      description,
      shot_at: shotAt || null,
      fileName: file.name,
      path: sign.path,
      url: sign.publicUrl
    })
  });

  const record = await recordRes.json().catch(() => ({}));

  if (!recordRes.ok) {
    const detail = record.detail ? `｜${record.detail}` : "";
    status.textContent = `${record.error || "文件已上传，但作品库记录失败。"}${detail}`;
    return;
  }

  if (kind === "photo" || kind === "video") {
    status.innerHTML = `上传成功，作品已经自动进入“摄影与作品”。<a href="gallery.html?refresh=${Date.now()}">立即查看摄影与作品</a>`;
  } else {
    status.innerHTML = `上传成功，资源已进入 Media Center。<a href="media-center.html?refresh=${Date.now()}">立即查看媒体中心</a>`;
  }
}

setupSelectedFilePreview();

