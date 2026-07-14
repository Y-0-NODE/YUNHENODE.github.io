let ITEMS = [],
  CURRENT = null;
const v = id => document.getElementById(id).value,
  auth = () => ({ adminName: v("admin"), password: v("password") }),
  lines = id =>
    v(id)
      .split(/[\n，,]/)
      .map(x => x.trim())
      .filter(Boolean),
  esc = s =>
    String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
async function call(data) {
  const r = await fetch("./api/media-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...auth(), ...data })
    }),
    j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) throw Error(j.error || "操作失败");
  return j;
}
async function loadItems() {
  try {
    const [j, local] = await Promise.all([
      call({ action: "admin-list", kind: "photo" }),
      fetch("./data/local-gallery.json", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : []))
        .catch(() => [])
    ]);
    const remote = (j.data || []).map(x => ({ ...x, _local: false })),
      remoteUrls = new Set(remote.map(x => x.url)),
      localPhotos = (Array.isArray(local) ? local : [])
        .filter(x => x.kind === "photo" && !remoteUrls.has(x.url))
        .map((x, i) => ({ ...x, id: `local-${i}`, _local: true, status: "本地同步" }));
    ITEMS = [...remote, ...localPhotos].sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );
    document.getElementById("status").textContent =
      `已读取 ${ITEMS.length} 件（Supabase ${remote.length} 件，本地同步 ${localPhotos.length} 件）`;
    document.getElementById("items").innerHTML = ITEMS.length
      ? ITEMS.map(
          (x, i) =>
            `<button class="item" onclick="selectItem(${i})"><img src="${esc(x.url)}" alt=""><span><b>${esc(x.title)}</b><br><small>${esc(x.status || "published")}</small></span></button>`
        ).join("")
      : "<p>暂无摄影作品。</p>";
  } catch (e) {
    document.getElementById("status").textContent = e.message;
  }
}
function selectItem(index) {
  CURRENT = ITEMS[index];
  if (!CURRENT) return;
  const m = CURRENT.metadata || {};
  document.getElementById("heading").textContent = CURRENT.title;
  document.getElementById("source-note").textContent = CURRENT._local
    ? "来源：本地文件夹同步。点击编辑后可直接登记到 Supabase 并保存。"
    : "来源：Supabase 媒体库。可直接保存全部管理信息。";
  document.getElementById("preview").innerHTML =
    `<img src="${esc(CURRENT.large_url || CURRENT.url)}" alt="" style="max-width:100%;max-height:360px">`;
  document.getElementById("edit").href = CURRENT._local
    ? `local-gallery-edit.html?url=${encodeURIComponent(CURRENT.url)}`
    : `media-edit.html?id=${CURRENT.id}`;
  document.getElementById("title").value = CURRENT.title || "";
  document.getElementById("description").value = CURRENT.description || "";
  document.getElementById("shot").value = String(CURRENT.shot_at || "").slice(0, 10);
  document.getElementById("publish").value = CURRENT._local
    ? "published"
    : CURRENT.status || "published";
  document.getElementById("collections").value = (m.collections || []).join("\n");
  document.getElementById("related").value = (m.related_content || []).join("\n");
  document.getElementById("files").value = (
    m.media_files || [CURRENT.large_url || CURRENT.url]
  ).join("\n");
}
function localNotice(action) {
  alert(
    `这件作品来自本地文件夹，首次${action}前请点击“Edit｜编辑”，直接保存到 Supabase 摄影作品库。`
  );
}
async function save() {
  if (!CURRENT) return;
  if (CURRENT._local) return localNotice("保存");
  try {
    await call({
      id: CURRENT.id,
      title: v("title"),
      description: v("description"),
      shot_at: v("shot"),
      status: v("publish"),
      collections: lines("collections"),
      relatedContent: lines("related"),
      mediaFiles: lines("files")
    });
    await loadItems();
    alert("已保存");
  } catch (e) {
    alert(e.message);
  }
}
async function lifecycle(x) {
  if (!CURRENT) return;
  if (CURRENT._local) return localNotice("修改发布状态");
  try {
    await call({ action: "lifecycle", id: CURRENT.id, lifecycle: x });
    await loadItems();
  } catch (e) {
    alert(e.message);
  }
}
async function duplicateItem() {
  if (!CURRENT) return;
  if (CURRENT._local) return localNotice("复制");
  try {
    await call({ action: "duplicate", id: CURRENT.id });
    await loadItems();
    alert("已复制为草稿");
  } catch (e) {
    alert(e.message);
  }
}
async function removeItem() {
  if (!CURRENT) return;
  if (CURRENT._local) {
    location.href = `local-gallery-edit.html?url=${encodeURIComponent(CURRENT.url)}`;
    return;
  }
  if (!confirm("确定删除摄影作品？")) return;
  try {
    await call({ action: "delete", id: CURRENT.id });
    CURRENT = null;
    await loadItems();
  } catch (e) {
    alert(e.message);
  }
}
async function history() {
  if (!CURRENT) return;
  if (CURRENT._local) return localNotice("查看历史版本");
  try {
    const j = await call({ action: "history", id: CURRENT.id });
    window.H = j.data || [];
    document.getElementById("history").innerHTML = H.length
      ? H.map(
          (x, i) =>
            `<article>${esc(x.operation)} · ${new Date(x.created_at).toLocaleString()} <button onclick="restore(${i})">恢复</button></article>`
        ).join("")
      : "没有历史版本";
  } catch (e) {
    alert(e.message);
  }
}
async function restore(i) {
  if (!confirm("恢复这个版本？")) return;
  try {
    await call({ action: "restore", id: CURRENT.id, snapshot: H[i].snapshot });
    await loadItems();
  } catch (e) {
    alert(e.message);
  }
}
