let VISITOR_LOG_ADMIN_NAME = "";
let VISITOR_LOG_ADMIN_PASSWORD = "";

function visitorLogEscape(value) {
  return window.YunheUtils?.escapeHtml
    ? window.YunheUtils.escapeHtml(value)
    : String(value || "").replace(/[&<>"']/g, char => {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
      });
}

function formatVisitorLogTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderVisitorLogs(rows) {
  const list = document.getElementById("visitor-log-list");
  const count = document.getElementById("visitor-log-count");
  const data = Array.isArray(rows) ? rows : [];
  count.textContent = data.length ? `共 ${data.length} 条访客记录。` : "暂时没有访客记录。";
  list.innerHTML = data
    .map(row => {
      return `
        <tr>
          <td>${visitorLogEscape(formatVisitorLogTime(row.created_at))}</td>
          <td>${visitorLogEscape(row.source || "未填写")}</td>
          <td>${visitorLogEscape(row.purpose || "未填写")}</td>
          <td>${visitorLogEscape(row.message || "")}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadVisitorLogs() {
  const status = document.getElementById("visitor-log-status");
  VISITOR_LOG_ADMIN_NAME =
    document.getElementById("admin-name").value.trim() || VISITOR_LOG_ADMIN_NAME;
  VISITOR_LOG_ADMIN_PASSWORD =
    document.getElementById("admin-password").value.trim() || VISITOR_LOG_ADMIN_PASSWORD;

  if (!VISITOR_LOG_ADMIN_NAME || !VISITOR_LOG_ADMIN_PASSWORD) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }

  status.textContent = "正在读取访客记录…";
  try {
    const response = await fetch("/api/admin-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminName: VISITOR_LOG_ADMIN_NAME,
        password: VISITOR_LOG_ADMIN_PASSWORD,
        action: "visitor-log-list"
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || "读取失败");
    document.getElementById("login-panel").classList.add("hidden");
    document.getElementById("visitor-log-panel").classList.remove("hidden");
    status.textContent = "";
    renderVisitorLogs(result.data || []);
  } catch (error) {
    status.textContent = error.message || "读取失败，请检查后台密码和 Supabase 表。";
  }
}
