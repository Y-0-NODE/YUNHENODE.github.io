const KEY = "yunhe.site.design.v1";

function currentDesign() {
  return {
    theme: document.getElementById("theme").value,
    accent: document.getElementById("accent").value,
    backgroundUrl: document.getElementById("background-url").value.trim(),
    backgroundOpacity: document.getElementById("background-opacity").value
  };
}

function applyForm(design) {
  document.getElementById("theme").value = design.theme || "dark";
  document.getElementById("accent").value = design.accent || "#ffffff";
  document.getElementById("background-url").value = design.backgroundUrl || "";
  document.getElementById("background-opacity").value = design.backgroundOpacity || "0.18";
}

function previewDesign() {
  const design = currentDesign();
  const sample = document.getElementById("sample");
  const isLight = design.theme === "light";

  sample.style.backgroundColor = isLight ? "#f6f4ef" : "#111";
  sample.style.color = isLight ? "#111" : "#f2f2f2";
  sample.style.borderColor = isLight ? "#d9d4c8" : "#2a2a2a";
  sample.style.backgroundImage = design.backgroundUrl
    ? `linear-gradient(rgba(${isLight ? "246,244,239" : "17,17,17"},${1 - Number(design.backgroundOpacity)}), rgba(${isLight ? "246,244,239" : "17,17,17"},${1 - Number(design.backgroundOpacity)})), url("${design.backgroundUrl}")`
    : "none";
  sample.querySelector("h3").style.color = design.accent;
}

function saveDesign() {
  localStorage.setItem(KEY, JSON.stringify(currentDesign()));
  document.getElementById("status").textContent = "已保存。打开内容页后会应用到这台设备。";
}

function resetDesign() {
  localStorage.removeItem(KEY);
  applyForm({});
  previewDesign();
  document.getElementById("status").textContent = "已恢复默认。";
}

applyForm(JSON.parse(localStorage.getItem(KEY) || "{}"));
previewDesign();

const VISITOR_BACKGROUND_TITLE = "YUNHE_VISITOR_BACKGROUND";
let CURRENT_VISITOR_BACKGROUND = null;
let VISITOR_PREVIEW_URL = "";

function injectVisitorSettingsStyles() {
  if (document.getElementById("visitor-settings-styles")) return;
  const style = document.createElement("style");
  style.id = "visitor-settings-styles";
  style.textContent = `
    .visitor-background-settings{margin-top:56px}
    .visitor-background-settings h2{font-size:clamp(28px,4vw,46px);margin:10px 0 22px}
    .visitor-preview{position:sticky;top:100px;min-height:620px;overflow:hidden;border:1px solid #2a2a2a;background:#f8f8f6;color:#111}
    .visitor-preview-background,.visitor-preview-veil{position:absolute;inset:0;pointer-events:none}
    .visitor-preview-background{background-repeat:no-repeat}
    .visitor-preview-veil{background:rgba(248,248,246,.08)}
    .visitor-preview-content{position:relative;z-index:1;width:min(68%,520px);margin:0 5% 0 auto;padding-top:18%;text-align:left}
    .visitor-preview-content p{font-size:12px;letter-spacing:2px;color:inherit;opacity:.65}
    .visitor-preview-content h2{font-size:clamp(36px,5vw,68px);line-height:1;margin:16px 0}
    .visitor-preview-content span{line-height:1.8;opacity:.72}
    @media(max-width:900px){.visitor-preview{position:relative;top:auto;min-height:480px}}
  `;
  document.head.appendChild(style);
}

function visitorBackgroundConfig() {
  return {
    version: 1,
    positionX: Number(document.getElementById("visitor-position-x").value),
    positionY: Number(document.getElementById("visitor-position-y").value),
    scale: Number(document.getElementById("visitor-scale").value),
    imageOpacity: Number(document.getElementById("visitor-image-opacity").value),
    veil: Number(document.getElementById("visitor-veil").value),
    contentSide: document.getElementById("visitor-content-side").value,
    theme: document.getElementById("visitor-theme").value
  };
}

function applyVisitorBackgroundForm(config = {}) {
  document.getElementById("visitor-position-x").value = config.positionX ?? 0;
  document.getElementById("visitor-position-y").value = config.positionY ?? 50;
  document.getElementById("visitor-scale").value = config.scale ?? 90;
  document.getElementById("visitor-image-opacity").value = config.imageOpacity ?? 1;
  document.getElementById("visitor-veil").value = config.veil ?? 0.08;
  document.getElementById("visitor-content-side").value = config.contentSide || "right";
  document.getElementById("visitor-theme").value = config.theme || "light";
}

function previewVisitorBackground() {
  const config = visitorBackgroundConfig();
  const preview = document.getElementById("visitor-preview");
  const background = document.getElementById("visitor-preview-background");
  const veil = document.getElementById("visitor-preview-veil");
  const content = document.getElementById("visitor-preview-content");
  const imageUrl = VISITOR_PREVIEW_URL || CURRENT_VISITOR_BACKGROUND?.url || "";
  const light = config.theme === "light";

  preview.style.background = light ? "#f8f8f6" : "#090909";
  preview.style.color = light ? "#111" : "#f2f2f2";
  background.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : "none";
  background.style.backgroundSize = `${config.scale}% auto`;
  background.style.backgroundPosition = `${config.positionX}% ${config.positionY}%`;
  background.style.opacity = config.imageOpacity;
  veil.style.background = light ? `rgba(248,248,246,${config.veil})` : `rgba(9,9,9,${config.veil})`;
  content.style.marginLeft = config.contentSide === "left" ? "5%" : "auto";
  content.style.marginRight = config.contentSide === "right" ? "5%" : "auto";
  content.style.textAlign = config.contentSide === "center" ? "center" : "left";
}

function visitorAuth() {
  return {
    adminName: document.getElementById("visitor-admin-name").value.trim(),
    password: document.getElementById("visitor-admin-password").value
  };
}

async function visitorApi(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || "保存失败");
  return result;
}

async function uploadVisitorBackgroundFile(file, auth) {
  if (!window.supabase) throw new Error("上传组件没有加载，请刷新页面后重试。");
  const sign = await visitorApi("./api/media-sign-upload", {
    ...auth,
    kind: "asset",
    fileName: file.name,
    contentType: file.type || "image/jpeg"
  });
  const client = window.supabase.createClient(
    window.YUNHE_CONFIG.supabaseUrl,
    window.YUNHE_CONFIG.supabaseKey
  );
  const uploaded = await client.storage
    .from(sign.bucket)
    .uploadToSignedUrl(sign.path, sign.token, file);
  if (uploaded.error) throw new Error(uploaded.error.message || "背景图片上传失败");
  return sign;
}

async function loadVisitorBackgroundSettings() {
  const status = document.getElementById("visitor-bg-status");
  try {
    const response = await fetch(`./api/media-list?visitor-background=${Date.now()}`, {
      cache: "no-store"
    });
    const result = await response.json();
    CURRENT_VISITOR_BACKGROUND = (Array.isArray(result.data) ? result.data : []).find(
      item => item.kind === "asset" && item.title === VISITOR_BACKGROUND_TITLE
    );
    let config = {};
    if (CURRENT_VISITOR_BACKGROUND?.description) {
      try {
        config = JSON.parse(CURRENT_VISITOR_BACKGROUND.description);
      } catch (error) {
        config = {};
      }
    }
    applyVisitorBackgroundForm(config);
    previewVisitorBackground();
    status.textContent = CURRENT_VISITOR_BACKGROUND
      ? "已读取当前访客背景，可以直接调整后保存。"
      : "还没有自定义访客背景，请选择图片。";
  } catch (error) {
    status.textContent = "访客背景读取失败。";
  }
}

async function saveVisitorBackground() {
  const status = document.getElementById("visitor-bg-status");
  const auth = visitorAuth();
  const file = document.getElementById("visitor-background-file").files?.[0];
  if (!auth.adminName || !auth.password) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }
  if (!file && !CURRENT_VISITOR_BACKGROUND) {
    status.textContent = "请先选择一张背景图片。";
    return;
  }
  if (file && !file.type.startsWith("image/")) {
    status.textContent = "请选择 JPG、PNG 或 WebP 图片。";
    return;
  }

  const configText = JSON.stringify(visitorBackgroundConfig());
  try {
    if (file) {
      status.textContent = "正在上传背景图片…";
      const previous = CURRENT_VISITOR_BACKGROUND;
      const sign = await uploadVisitorBackgroundFile(file, auth);
      const created = await visitorApi("./api/media-record", {
        ...auth,
        kind: "asset",
        title: VISITOR_BACKGROUND_TITLE,
        description: configText,
        fileName: file.name,
        path: sign.path,
        url: sign.publicUrl
      });
      CURRENT_VISITOR_BACKGROUND = created.data;
      if (previous?.id && previous.id !== created.data?.id) {
        await visitorApi("./api/media-update", {
          ...auth,
          action: "delete",
          id: previous.id
        }).catch(() => null);
      }
      if (VISITOR_PREVIEW_URL) URL.revokeObjectURL(VISITOR_PREVIEW_URL);
      VISITOR_PREVIEW_URL = "";
      document.getElementById("visitor-background-file").value = "";
    } else {
      status.textContent = "正在保存背景布局…";
      const updated = await visitorApi("./api/media-update", {
        ...auth,
        id: CURRENT_VISITOR_BACKGROUND.id,
        title: VISITOR_BACKGROUND_TITLE,
        description: configText,
        status: "published"
      });
      CURRENT_VISITOR_BACKGROUND = {
        ...CURRENT_VISITOR_BACKGROUND,
        ...updated.data,
        description: configText
      };
    }
    previewVisitorBackground();
    status.innerHTML = `保存成功。<a href="visitor.html?refresh=${Date.now()}" target="_blank" rel="noopener">立即查看访客页面</a>`;
  } catch (error) {
    status.textContent = error.message || "访客背景保存失败。";
  }
}

async function removeVisitorBackground() {
  const status = document.getElementById("visitor-bg-status");
  const auth = visitorAuth();
  if (!CURRENT_VISITOR_BACKGROUND) {
    status.textContent = "当前没有已保存的访客背景。";
    return;
  }
  if (!auth.adminName || !auth.password) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }
  if (!confirm("确定清除访客入口背景吗？")) return;
  try {
    await visitorApi("./api/media-update", {
      ...auth,
      action: "delete",
      id: CURRENT_VISITOR_BACKGROUND.id
    });
    CURRENT_VISITOR_BACKGROUND = null;
    VISITOR_PREVIEW_URL = "";
    applyVisitorBackgroundForm({});
    previewVisitorBackground();
    status.textContent = "访客背景已清除。";
  } catch (error) {
    status.textContent = error.message || "清除失败。";
  }
}

injectVisitorSettingsStyles();
document
  .querySelectorAll(
    "#visitor-position-x,#visitor-position-y,#visitor-scale,#visitor-image-opacity,#visitor-veil,#visitor-content-side,#visitor-theme"
  )
  .forEach(control => control.addEventListener("input", previewVisitorBackground));
document.getElementById("visitor-background-file").addEventListener("change", event => {
  if (VISITOR_PREVIEW_URL) URL.revokeObjectURL(VISITOR_PREVIEW_URL);
  const file = event.target.files?.[0];
  VISITOR_PREVIEW_URL = file ? URL.createObjectURL(file) : "";
  previewVisitorBackground();
});
loadVisitorBackgroundSettings();
