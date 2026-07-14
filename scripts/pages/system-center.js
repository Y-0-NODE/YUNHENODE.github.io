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
      const r = await fetch(url, { cache: "no-store" });
      rows.push(
        `<div class="${r.ok ? "ok" : "bad"}">${name}：${r.ok ? "正常" : "HTTP " + r.status}</div>`
      );
    } catch (e) {
      rows.push(`<div class="bad">${name}：无法连接</div>`);
    }
  }
  box.innerHTML = rows.join("");
}
