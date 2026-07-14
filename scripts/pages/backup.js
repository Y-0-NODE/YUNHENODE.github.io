let IMPORTED = null,
  HISTORY = [];
const auth = () => ({
  adminName: document.getElementById("name").value.trim(),
  password: document.getElementById("password").value
});
async function call(data) {
  const r = await fetch("./api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...auth(), ...data })
    }),
    o = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(o.error || "请求失败");
  return o;
}
async function downloadBackup() {
  const s = document.getElementById("export-status");
  s.textContent = "正在生成备份…";
  try {
    const o = await call({ action: "export" }),
      blob = new Blob([JSON.stringify(o.backup, null, 2)], { type: "application/json" }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `yunhe-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    s.textContent = "全站备份已导出。";
  } catch (e) {
    s.textContent = e.message;
  }
}
async function previewImport() {
  const f = document.getElementById("backup-file").files[0],
    s = document.getElementById("import-status");
  if (!f) {
    s.textContent = "请先选择 JSON 备份。";
    return;
  }
  try {
    IMPORTED = JSON.parse(await f.text());
    if (!IMPORTED.tables) throw new Error("备份缺少 tables 数据");
    const summary = Object.entries(IMPORTED.tables)
      .map(([k, v]) => `${k}: ${Array.isArray(v.data) ? v.data.length : 0}`)
      .join(" ｜ ");
    s.textContent = `备份时间：${IMPORTED.exportedAt || "未知"}。${summary}`;
    document.getElementById("restore-all").classList.remove("hidden");
  } catch (e) {
    IMPORTED = null;
    s.textContent = e.message;
  }
}
async function loadHistory() {
  const box = document.getElementById("history");
  box.innerHTML = '<p class="status">正在读取…</p>';
  try {
    const o = await call({ action: "history" });
    HISTORY = o.data || [];
    box.innerHTML =
      HISTORY.map(
        (x, i) =>
          `<article class="version"><b>${x.snapshot?.title || x.operation || "内容快照"}</b><small>${x.created_at || ""} · ID ${x.content_id || ""}</small><div class="actions"><button onclick="restoreVersion(${i})">恢复这个版本</button></div></article>`
      ).join("") || '<p class="status">暂无历史快照。</p>';
  } catch (e) {
    box.innerHTML = `<p class="status">${e.message}</p>`;
  }
}
async function restoreVersion(i) {
  const x = HISTORY[i];
  if (!x?.snapshot || !confirm(`确定恢复「${x.snapshot.title || "这篇内容"}」？`)) return;
  const s = document.getElementById("restore-status");
  s.textContent = "正在恢复…";
  try {
    await call({ action: "restore-version", snapshot: x.snapshot });
    s.textContent = "该内容版本已恢复。";
  } catch (e) {
    s.textContent = e.message;
  }
}
async function restoreBackup() {
  if (!IMPORTED || !confirm("确定将这份备份写回 Supabase？同 ID 数据将被更新。")) return;
  const s = document.getElementById("restore-status");
  s.textContent = "正在恢复全站数据…";
  try {
    const o = await call({ action: "restore-backup", backup: IMPORTED });
    s.textContent = `恢复完成：${JSON.stringify(o.restored)}`;
  } catch (e) {
    s.textContent = e.message;
  }
}
