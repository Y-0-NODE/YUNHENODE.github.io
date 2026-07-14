const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;
const API = `${SUPABASE_URL}/rest/v1/contents?select=id,title,slug,intro,topic,type,created_at&type=eq.case&order=created_at.desc`;

function caseUrl(item) {
  if (item.slug) return `content.html?slug=${encodeURIComponent(item.slug)}`;
  return `content.html?id=${encodeURIComponent(item.id)}`;
}

fetch(API, {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  }
})
  .then(res => {
    if (!res.ok) throw new Error("load failed");
    return res.json();
  })
  .then(data => {
    const cases = Array.isArray(data) ? data : [];
    const box = document.getElementById("list");
    const status = document.getElementById("status");

    if (!cases.length) {
      status.textContent = "暂无案例。";
      return;
    }

    status.textContent = "";
    box.innerHTML = cases
      .map(
        item => `
      <a class="card" href="${caseUrl(item)}">
        <span>${item.topic || "CASE"}</span>
        <h2>${item.title || "未命名案例"}</h2>
        <p>${item.intro || ""}</p>
      </a>
    `
      )
      .join("");
  })
  .catch(() => {
    document.getElementById("status").textContent = "案例加载失败，请检查 Supabase 配置。";
  });
