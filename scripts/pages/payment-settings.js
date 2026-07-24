const PAYMENT_SETTINGS_TITLE = "YUNHE_PAYMENT_SETTINGS";
const PRICES = ["9.9", "19.9", "29.9", "59", "99", "199"];
const METHODS = [
  { key: "wechat", label: "微信支付" },
  { key: "alipay", label: "支付宝" }
];

let PAYMENT_RECORD = null;
let PAYMENT_CONFIG = {
  version: 1,
  note: "扫码付款后，请保留付款截图，并通过“关于”页面的联系方式与我联系。",
  tiers: {}
};

function esc(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function auth() {
  return {
    adminName: document.getElementById("payment-admin").value.trim(),
    password: document.getElementById("payment-password").value
  };
}

function slotId(price, method) {
  return `${method}-${String(price).replace(".", "-")}`;
}

function tierConfig(price) {
  if (!PAYMENT_CONFIG.tiers[price]) {
    PAYMENT_CONFIG.tiers[price] = { wechat: "", alipay: "" };
  }
  return PAYMENT_CONFIG.tiers[price];
}

function renderPaymentTiers() {
  document.getElementById("payment-tier-grid").innerHTML = PRICES.map(price => {
    const tier = tierConfig(price);
    return `
      <section class="payment-tier">
        <div class="payment-tier-head"><span>PRICE TIER</span><h2>¥${price}</h2></div>
        <div class="payment-methods">
          ${METHODS.map(method => {
            const id = slotId(price, method.key);
            const url = tier[method.key] || "";
            return `
              <article class="payment-slot">
                <h3>${method.label}</h3>
                <div id="preview-${id}" class="payment-preview">
                  ${url ? `<img src="${esc(url)}" alt="${method.label} ¥${price} 二维码">` : "<span>尚未上传</span>"}
                </div>
                <label>
                  选择二维码图片
                  <input id="file-${id}" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
                </label>
                <div class="payment-slot-actions">
                  <button type="button" onclick="uploadPaymentQr('${price}','${method.key}')">上传</button>
                  <button class="clear" type="button" onclick="clearPaymentQr('${price}','${method.key}')">清除</button>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("二维码图片读取失败，请换一张图片。"));
    reader.readAsDataURL(file);
  });
}

async function uploadPaymentQr(price, method) {
  const status = document.getElementById("payment-status");
  const credentials = auth();
  const id = slotId(price, method);
  const file = document.getElementById(`file-${id}`).files?.[0];
  if (!credentials.adminName || !credentials.password) {
    status.textContent = "请先填写管理员名称和密码。";
    return;
  }
  if (!file) {
    status.textContent = "请先选择二维码图片。";
    return;
  }
  if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type) || file.size > 2 * 1024 * 1024) {
    status.textContent = "二维码请使用 2MB 以内的 PNG、JPG、WebP 或 GIF。";
    return;
  }

  status.textContent = `正在上传 ¥${price} ${method === "wechat" ? "微信" : "支付宝"}二维码…`;
  try {
    const response = await fetch("./api/media-sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...credentials,
        mode: "inline",
        kind: "photo",
        fileName: file.name,
        contentType: file.type,
        dataUrl: await fileToDataUrl(file)
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.publicUrl) throw new Error(result.error || "二维码上传失败");
    tierConfig(price)[method] = result.publicUrl;
    renderPaymentTiers();
    status.textContent = "二维码已上传。请点击“保存全部二维码设置”完成同步。";
  } catch (error) {
    status.textContent = error.message || "二维码上传失败。";
  }
}

function clearPaymentQr(price, method) {
  tierConfig(price)[method] = "";
  renderPaymentTiers();
  document.getElementById("payment-status").textContent =
    "二维码已从设置中清除，请点击“保存全部二维码设置”。";
}

async function savePaymentSettings() {
  const status = document.getElementById("payment-status");
  const credentials = auth();
  if (!credentials.adminName || !credentials.password) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }

  PAYMENT_CONFIG.note =
    document.getElementById("payment-note").value.trim() ||
    "扫码付款后，请保留付款截图，并通过“关于”页面的联系方式与我联系。";
  const endpoint = PAYMENT_RECORD?.id ? "./api/media-update" : "./api/media-record";
  const payload = PAYMENT_RECORD?.id
    ? {
        ...credentials,
        id: PAYMENT_RECORD.id,
        title: PAYMENT_SETTINGS_TITLE,
        description: JSON.stringify(PAYMENT_CONFIG)
      }
    : {
        ...credentials,
        kind: "asset",
        title: PAYMENT_SETTINGS_TITLE,
        description: JSON.stringify(PAYMENT_CONFIG),
        path: "external/settings/payment-qrcodes",
        url: new URL("payment-settings.html", location.href).href
      };

  status.textContent = "正在保存全部价位设置…";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || "保存失败");
    PAYMENT_RECORD = result.data || PAYMENT_RECORD;
    status.textContent = "全部二维码设置已保存，并同步到文章、案例、摄影和视频付费窗口。";
  } catch (error) {
    status.textContent = error.message || "保存失败。";
  }
}

async function loadPaymentSettings() {
  renderPaymentTiers();
  try {
    const response = await fetch(`./api/media-list?includeSettings=1&payment=${Date.now()}`, {
      cache: "no-store"
    });
    const result = await response.json();
    PAYMENT_RECORD = (Array.isArray(result.data) ? result.data : []).find(
      item => item.title === PAYMENT_SETTINGS_TITLE
    );
    if (PAYMENT_RECORD?.description) {
      const parsed = JSON.parse(PAYMENT_RECORD.description);
      PAYMENT_CONFIG = {
        version: 1,
        note: String(parsed.note || PAYMENT_CONFIG.note),
        tiers: parsed.tiers && typeof parsed.tiers === "object" ? parsed.tiers : {}
      };
      document.getElementById("payment-note").value = PAYMENT_CONFIG.note;
    }
    renderPaymentTiers();
    document.getElementById("payment-status").textContent = PAYMENT_RECORD
      ? "已读取当前二维码设置。"
      : "还没有保存二维码，可以从任意价位开始上传。";
  } catch (error) {
    document.getElementById("payment-status").textContent = "二维码设置读取失败，请刷新重试。";
  }
}

loadPaymentSettings();
