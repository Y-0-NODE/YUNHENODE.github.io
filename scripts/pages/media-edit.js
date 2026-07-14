let CURRENT = null;

const { escapeHtml, formatDateTime, toDateInput } = window.YunheUtils;

async function loadWork() {
  const id = new URLSearchParams(location.search).get("id");
  const status = document.getElementById("status");
  if (!id) {
    status.textContent = "缺少作品 ID。";
    return;
  }

  const res = await fetch("./api/media-list", { cache: "no-store" });
  const result = await res.json().catch(() => ({}));
  const list = Array.isArray(result.data) ? result.data : [];
  CURRENT = list.find(item => String(item.id) === String(id));

  if (!CURRENT) {
    status.textContent = "没有找到这个作品。";
    return;
  }

  const preview = document.getElementById("preview");
  if (CURRENT.kind === "video") {
    preview.innerHTML = `<video src="${escapeHtml(CURRENT.url)}" controls playsinline></video>`;
  } else if (CURRENT.kind === "audio") {
    preview.innerHTML = `<audio src="${escapeHtml(CURRENT.url)}" controls></audio>`;
  } else if (CURRENT.kind === "document") {
    preview.innerHTML = `<a class="document-link" href="${escapeHtml(CURRENT.url)}" target="_blank" rel="noopener">打开 PDF / 文档</a>`;
  } else {
    preview.innerHTML = `<img src="${escapeHtml(CURRENT.url)}" alt="${escapeHtml(CURRENT.title || "媒体")}">`;
  }

  document.getElementById("title").value = CURRENT.title || "";
  document.getElementById("description").value = CURRENT.description || "";
  document.getElementById("shot-at").value = toDateInput(CURRENT.shot_at);
  document.getElementById("created-at").textContent = formatDateTime(CURRENT.created_at);
  status.textContent = "可以修改作品信息。";
}

async function saveWork() {
  const status = document.getElementById("status");
  if (!CURRENT) {
    status.textContent = "没有正在编辑的作品。";
    return;
  }

  const adminName = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("admin-password").value.trim();
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const shotAt = document.getElementById("shot-at").value;

  if (!adminName || !password) {
    status.textContent = "请填写账户名称和密码。";
    return;
  }

  status.textContent = "正在保存...";
  const res = await fetch("./api/media-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: CURRENT.id,
      adminName,
      password,
      title,
      description,
      shot_at: shotAt || null
    })
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = result.detail ? `｜${result.detail}` : "";
    status.textContent = `${result.error || "保存失败。"}${detail}`;
    return;
  }
  status.textContent = "已保存。回到艺术摄影页面刷新后可以看到新信息。";
}

async function deleteWork() {
  const status = document.getElementById("status");
  if (!CURRENT) {
    status.textContent = "没有正在编辑的作品。";
    return;
  }

  const adminName = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("admin-password").value.trim();
  if (!adminName || !password) {
    status.textContent = "请先填写账户名称和密码。";
    return;
  }

  const ok = confirm("确定删除这个作品吗？删除后作品页不会再显示。");
  if (!ok) return;

  status.textContent = "正在删除...";
  const res = await fetch("./api/media-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: CURRENT.id,
      adminName,
      password,
      action: "delete"
    })
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = result.detail ? `｜${result.detail}` : "";
    status.textContent = `${result.error || "删除失败。"}${detail}`;
    return;
  }

  status.textContent = result.storageWarning
    ? `作品记录已删除。提醒：${result.storageWarning}`
    : "作品已删除，正在返回作品页。";
  setTimeout(() => {
    location.href = `media-center.html?v=${Date.now()}`;
  }, 600);
}

loadWork();
