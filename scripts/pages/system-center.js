let VISITOR_DATA_ROWS = [];
let VISITOR_DATA_ADMIN_NAME = "";
let VISITOR_DATA_ADMIN_PASSWORD = "";

function systemEscape(value) {
  return window.YunheUtils?.escapeHtml
    ? window.YunheUtils.escapeHtml(value)
    : String(value || "").replace(/[&<>"']/g, char => {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
      });
}

function formatVisitorTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function visitorOption(value, current, label = value) {
  return `<option value="${systemEscape(value)}" ${
    value === current ? "selected" : ""
  }>${systemEscape(label)}</option>`;
}

function renderVisitorData(rows) {
  const list = document.getElementById("visitor-data-list");
  const count = document.getElementById("visitor-data-count");
  if (!list || !count) return;
  count.textContent = `${rows.length} / ${VISITOR_DATA_ROWS.length} 条记录`;
  if (!rows.length) {
    list.innerHTML =
      '<tr><td class="visitor-data-empty" colspan="6">没有符合当前条件的访客记录。</td></tr>';
    return;
  }

  list.innerHTML = rows
    .map(row => {
      const highlight = row.highlight_color || "none";
      return `
        <tr class="visitor-data-row highlight-${systemEscape(highlight)}" data-visitor-id="${row.id}">
          <td class="visitor-highlight-cell">
            <label class="visitor-star" title="标记为重点">
              <input type="checkbox" data-field="is-important" ${row.is_important ? "checked" : ""}>
              <span aria-hidden="true">★</span>
            </label>
            <select data-field="highlight-color" aria-label="重点颜色">
              ${visitorOption("none", highlight, "无颜色")}
              ${visitorOption("red", highlight, "红色")}
              ${visitorOption("amber", highlight, "琥珀")}
              ${visitorOption("green", highlight, "绿色")}
              ${visitorOption("blue", highlight, "蓝色")}
            </select>
          </td>
          <td>
            <input
              class="visitor-name-input"
              data-field="display-name"
              value="${systemEscape(row.display_name || "")}"
              placeholder="未留称呼"
            >
            <time datetime="${systemEscape(row.created_at)}">${systemEscape(
              formatVisitorTime(row.created_at)
            )}</time>
          </td>
          <td>
            <select data-field="source" aria-label="访客来源">
              ${["公众号", "视频", "朋友推荐", "搜索", "其他"]
                .map(value => visitorOption(value, row.source))
                .join("")}
            </select>
            <select data-field="purpose" aria-label="进入目的">
              ${["看文章", "看案例", "看作品", "了解云鹤系统", "其他"]
                .map(value => visitorOption(value, row.purpose))
                .join("")}
            </select>
          </td>
          <td>
            <textarea data-field="message" rows="4" placeholder="访客没有留言">${systemEscape(
              row.message || ""
            )}</textarea>
          </td>
          <td>
            <textarea data-field="admin-note" rows="4" placeholder="添加判断、后续动作或解释…">${systemEscape(
              row.admin_note || ""
            )}</textarea>
          </td>
          <td class="visitor-save-cell">
            <button type="button" onclick="saveVisitorData(${row.id})">保存</button>
            <span class="row-save-status" aria-live="polite"></span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function filterVisitorData() {
  const query = String(document.getElementById("visitor-data-search")?.value || "")
    .trim()
    .toLowerCase();
  const filter = document.getElementById("visitor-data-filter")?.value || "all";
  const filtered = VISITOR_DATA_ROWS.filter(row => {
    const searchable = [
      row.display_name,
      row.source,
      row.purpose,
      row.message,
      row.admin_note
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesFilter =
      filter === "all" ||
      (filter === "important" && row.is_important) ||
      row.highlight_color === filter;
    return matchesQuery && matchesFilter;
  });
  renderVisitorData(filtered);
}

async function adminVisitorRequest(payload) {
  const response = await fetch("/api/admin-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName: VISITOR_DATA_ADMIN_NAME,
      password: VISITOR_DATA_ADMIN_PASSWORD,
      ...payload
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || "请求失败");
  return result;
}

async function loadVisitorData() {
  const status = document.getElementById("visitor-data-status");
  const nameInput = document.getElementById("visitor-admin-name");
  const passwordInput = document.getElementById("visitor-admin-password");
  VISITOR_DATA_ADMIN_NAME = nameInput?.value.trim() || VISITOR_DATA_ADMIN_NAME;
  VISITOR_DATA_ADMIN_PASSWORD = passwordInput?.value || VISITOR_DATA_ADMIN_PASSWORD;
  if (!VISITOR_DATA_ADMIN_NAME || !VISITOR_DATA_ADMIN_PASSWORD) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }

  status.textContent = "正在读取 Supabase 访客数据…";
  try {
    const result = await adminVisitorRequest({ action: "visitor-log-list" });
    VISITOR_DATA_ROWS = Array.isArray(result.data) ? result.data : [];
    document.getElementById("visitor-data-login").classList.add("hidden");
    document.getElementById("visitor-data-toolbar").classList.remove("hidden");
    document.getElementById("visitor-data-table-wrap").classList.remove("hidden");
    status.textContent = VISITOR_DATA_ROWS.length
      ? "数据已同步。修改后点击每一行的“保存”。"
      : "数据表已连接，暂时没有访客记录。";
    filterVisitorData();
  } catch (error) {
    status.textContent = error.message || "读取失败，请检查管理员密码与数据表。";
  }
}

function rowField(row, name) {
  return row.querySelector(`[data-field="${name}"]`);
}

async function saveVisitorData(id) {
  const row = document.querySelector(`[data-visitor-id="${id}"]`);
  const saveStatus = row?.querySelector(".row-save-status");
  if (!row || !saveStatus) return;
  saveStatus.textContent = "保存中…";
  row.classList.add("is-saving");
  try {
    const result = await adminVisitorRequest({
      action: "visitor-log-update",
      id,
      displayName: rowField(row, "display-name").value,
      source: rowField(row, "source").value,
      purpose: rowField(row, "purpose").value,
      message: rowField(row, "message").value,
      adminNote: rowField(row, "admin-note").value,
      isImportant: rowField(row, "is-important").checked,
      highlightColor: rowField(row, "highlight-color").value
    });
    const updated = Array.isArray(result.data) ? result.data[0] : null;
    if (updated) {
      VISITOR_DATA_ROWS = VISITOR_DATA_ROWS.map(item => (item.id === id ? updated : item));
      row.className = `visitor-data-row highlight-${updated.highlight_color || "none"}`;
    }
    saveStatus.textContent = "已保存";
    window.setTimeout(() => {
      if (saveStatus.textContent === "已保存") saveStatus.textContent = "";
    }, 1800);
  } catch (error) {
    saveStatus.textContent = error.message || "保存失败";
  } finally {
    row.classList.remove("is-saving");
  }
}

async function healthCheck() {
  const box = document.getElementById("health");
  box.innerHTML = "<div>正在检查…</div>";
  const tests = [
    ["Article / Admin API", "./api/admin-list"],
    ["Delete API", "./api/delete"],
    ["Media API", "./api/media-list"]
  ];
  const rows = [];
  for (const [name, url] of tests) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      rows.push(
        `<div class="${response.ok ? "ok" : "bad"}">${name}：${
          response.ok ? "正常" : "HTTP " + response.status
        }</div>`
      );
    } catch (error) {
      rows.push(`<div class="bad">${name}：无法连接</div>`);
    }
  }
  box.innerHTML = rows.join("");
}

document.addEventListener("change", event => {
  if (!event.target.matches('[data-field="highlight-color"]')) return;
  const row = event.target.closest(".visitor-data-row");
  if (!row) return;
  row.className = `visitor-data-row highlight-${event.target.value}`;
});

window.healthCheck = healthCheck;
window.loadVisitorData = loadVisitorData;
window.filterVisitorData = filterVisitorData;
window.saveVisitorData = saveVisitorData;
