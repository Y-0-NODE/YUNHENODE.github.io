(function initializeHome() {
  "use strict";

  const config = window.YUNHE_CONFIG;
  const { escapeHtml, formatDate } = window.YunheUtils;
  const typeNames = { article: "ARTICLE", case: "CASE", video: "VIDEO" };

  function contentUrl(content) {
    const query = content.slug
      ? `slug=${encodeURIComponent(content.slug)}`
      : `id=${encodeURIComponent(content.id)}`;
    return `content.html?${query}`;
  }

  async function loadLatest() {
    const status = document.getElementById("latest-status");
    const query =
      "select=id,title,slug,intro,topic,type,created_at&type=in.(article,case,video)&order=created_at.desc&limit=6";
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/contents?${query}`, {
        headers: {
          apikey: config.supabaseKey,
          Authorization: `Bearer ${config.supabaseKey}`
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      if (!rows.length) {
        status.textContent = "暂无公开内容。";
        return;
      }
      status.textContent = "";
      document.getElementById("latest").innerHTML = rows
        .map(
          content => `
        <a class="latest-card" href="${contentUrl(content)}">
          <div class="latest-meta">
            <span class="content-type">${typeNames[content.type] || "CONTENT"}</span>
            <span class="category">${escapeHtml(content.topic || "未分类")}</span>
          </div>
          <h3>${escapeHtml(content.title)}</h3>
          <p>${escapeHtml(content.intro || "暂无摘要")}</p>
          <time datetime="${escapeHtml(content.created_at)}">${formatDate(content.created_at)}</time>
        </a>
      `
        )
        .join("");
    } catch (error) {
      status.textContent = "最新内容读取失败。";
    }
  }

  window.enterAdmin = async function enterAdmin() {
    const status = document.getElementById("login-status");
    const password = document.getElementById("admin-password").value;
    if (!password) {
      status.textContent = "请输入密码。";
      return;
    }
    status.textContent = "正在验证…";
    try {
      await window.YunheApi.post("admin-list", {
        adminName: config.adminName,
        password,
        type: "article"
      });
      sessionStorage.setItem("yunhe.cms.verified", "1");
      location.href = "admin.html";
    } catch (error) {
      status.textContent = error.message;
    }
  };

  loadLatest();
})();
