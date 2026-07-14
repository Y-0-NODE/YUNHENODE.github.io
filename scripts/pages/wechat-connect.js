function authPayload() {
  return {
    adminName: document.getElementById("admin-name").value.trim(),
    password: document.getElementById("admin-password").value.trim()
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function syncWechat() {
  const status = document.getElementById("status");
  status.textContent = "正在同步公众号素材...";

  const res = await fetch("./api/wechat-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authPayload())
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    status.textContent = result.error || "同步失败。";
    return;
  }

  status.textContent = `同步完成：新增或更新 ${result.count || 0} 篇。`;
  loadWechat();
}

async function loadWechat() {
  const status = document.getElementById("status");
  const list = document.getElementById("list");
  status.textContent = "正在读取公众号文章...";

  const res = await fetch("./api/wechat-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authPayload())
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    status.textContent = result.error || "读取失败。";
    return;
  }

  const rows = Array.isArray(result.data) ? result.data : [];
  status.textContent = rows.length
    ? `共 ${rows.length} 篇公众号文章。`
    : "还没有同步到公众号文章。";
  list.innerHTML = rows
    .map(
      item => `
    <article class="item">
      <div class="meta">${escapeHtml(item.category)} / ${escapeHtml(item.topic)} / ${escapeHtml(item.status)}</div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.digest || item.ai_summary || "")}</p>
      <div class="actions">
        ${item.content_url ? `<a href="${escapeHtml(item.content_url)}" target="_blank" rel="noopener">打开公众号原文</a>` : ""}
      </div>
    </article>
  `
    )
    .join("");
}
