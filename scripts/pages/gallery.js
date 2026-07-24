let WORKS = [];
let PAYMENT_CONFIG = { note: "", tiers: {} };
let CURRENT_WORK_INDEX = -1;
const PAYMENT_SETTINGS_TITLE = "YUNHE_PAYMENT_SETTINGS";

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

const PUBLIC_MEDIA_API = "https://yunhenode-github-io-qwu7.vercel.app/api/media-list";

async function loadPublishedMedia(cacheKey) {
  const localResult = await loadJson(
    `./api/media-list?includeSettings=1&refresh=${cacheKey}`,
    null
  );
  if (localResult?.success && Array.isArray(localResult.data)) return localResult;

  return loadJson(`${PUBLIC_MEDIA_API}?includeSettings=1&refresh=${cacheKey}`, { data: [] });
}

function workPaywall(item) {
  const allowed = new Set(["9.9", "19.9", "29.9", "59", "99", "199"]);
  const source = item?.metadata?.paywall || {};
  return {
    enabled: Boolean(source.enabled),
    price: allowed.has(String(source.price)) ? String(source.price) : "9.9"
  };
}

function closeWorkPayment() {
  const modal = document.getElementById("work-payment-window");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function openWorkPayment() {
  const item = WORKS[CURRENT_WORK_INDEX];
  if (!item) return;
  const paywall = workPaywall(item);
  const tier = PAYMENT_CONFIG.tiers?.[paywall.price] || {};
  const methods = [
    { label: "微信支付", url: tier.wechat },
    { label: "支付宝", url: tier.alipay }
  ].filter(method => method.url);
  document.getElementById("work-payment-content").innerHTML = `
    <p class="payment-kicker">YUNHENODE PAID WORK</p>
    <h2>扫码付款 ¥${escapeHtml(paywall.price)}</h2>
    <div class="work-payment-methods">
      ${
        methods.length
          ? methods
              .map(
                method => `
                  <article>
                    <h3>${method.label}</h3>
                    <img src="${escapeHtml(method.url)}" alt="${method.label} ¥${escapeHtml(paywall.price)} 二维码">
                  </article>
                `
              )
              .join("")
          : "<p>这个价位的付款二维码还没有设置。</p>"
      }
    </div>
    <p>${escapeHtml(
      PAYMENT_CONFIG.note ||
        "扫码付款后，请保留付款截图，并通过“关于”页面的联系方式与我联系。"
    )}</p>
    <a href="about.html?visitor=1#contact">前往联系方式</a>
  `;
  const modal = document.getElementById("work-payment-window");
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function openDetail(index) {
  const item = WORKS[index];
  if (!item) return;
  CURRENT_WORK_INDEX = index;
  const detail = document.getElementById("detail");
  const media = document.getElementById("detail-media");
  const url = item.large_url || item.url || "";
  const paywall = workPaywall(item);
  media.innerHTML = paywall.enabled
    ? `
      <section class="work-paywall-gate">
        <p>PAID WORK / 付费作品</p>
        <h2>这件作品需要付费查看</h2>
        <strong>¥${escapeHtml(paywall.price)}</strong>
        <button type="button" onclick="openWorkPayment()">查看付款二维码</button>
      </section>
    `
    : item.kind === "video"
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
  closeWorkPayment();
  document.body.style.overflow = "";
}

document.getElementById("detail").addEventListener("click", event => {
  if (event.target.id === "detail") closeDetail();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!document.getElementById("work-payment-window").hidden) closeWorkPayment();
    else closeDetail();
  }
});

async function loadGallery() {
  const status = document.getElementById("status");
  const gallery = document.getElementById("gallery");
  status.textContent = "正在加载作品...";
  try {
    const cacheKey = Date.now();
    const remoteResult = await loadPublishedMedia(cacheKey);
    const settings = (remoteResult.data || []).find(
      item => item.title === PAYMENT_SETTINGS_TITLE
    );
    if (settings?.description) {
      try {
        const parsed = JSON.parse(settings.description);
        PAYMENT_CONFIG = {
          note: String(parsed.note || ""),
          tiers: parsed.tiers && typeof parsed.tiers === "object" ? parsed.tiers : {}
        };
      } catch (error) {
        PAYMENT_CONFIG = { note: "", tiers: {} };
      }
    }
    const list = Array.isArray(remoteResult.data)
      ? remoteResult.data.filter(
          item => item.title !== PAYMENT_SETTINGS_TITLE && ["photo", "video"].includes(item.kind)
        )
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
document.getElementById("work-payment-window").addEventListener("click", event => {
  if (event.target.id === "work-payment-window") closeWorkPayment();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadGallery();
});
