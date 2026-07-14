const STORAGE_KEY = "yunhe.diary.entries.v1";
const ACCOUNT_KEY = "yunhe.diary.account.v1";
const SESSION_KEY = "yunhe.diary.session.v1";

let entries = [];
let activeId = "";
let dirty = false;
let accountName = "";
let accountPassword = "";
let cloudMode = false;
let autoSaveTimer = null;

const escapeHtml = window.YunheUtils.escapeHtml;

function escapeJsString(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function loadEntries() {
  entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function setSyncMode(text) {
  document.getElementById("sync-mode").textContent = text;
}

function normalizeEntry(entry) {
  return {
    id: entry.id || uid(),
    title: entry.title || "未命名日记",
    date: entry.date || entry.entry_date || today(),
    mood: entry.mood || "平静",
    tags: entry.tags || "",
    body: entry.body || "",
    createdAt: entry.createdAt || entry.created_at || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.updated_at || new Date().toISOString()
  };
}

async function loadFromCloud() {
  setSyncMode("正在连接 Supabase...");
  try {
    const res = await fetch("./api/diary-list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adminName: accountName,
        password: accountPassword
      })
    });

    const result = await res.json().catch(() => ({}));

    if (res.ok) {
      cloudMode = true;
      const cloudEntries = (result.data || []).map(normalizeEntry);
      const localEntries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(
        normalizeEntry
      );
      const merged = new Map();

      localEntries.forEach(entry => merged.set(entry.id, entry));
      cloudEntries.forEach(entry => merged.set(entry.id, entry));

      entries = Array.from(merged.values());
      persist();
      setSyncMode("云端模式：已连接 Supabase");
    } else {
      cloudMode = false;
      loadEntries();
      setSyncMode(result.error || "云端登录失败，已进入本机模式。");
    }
  } catch (err) {
    cloudMode = false;
    loadEntries();
    setSyncMode("没有连到云端接口，当前先使用本机草稿。");
  }

  renderList();
  document.getElementById("current-date").textContent = today();
}

function lockApp() {
  activeId = "";
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "diary-login.html";
}

function renderList() {
  const q = document.getElementById("search").value.trim().toLowerCase();
  const list = document.getElementById("entry-list");
  const filtered = entries
    .filter(entry => {
      const haystack = [entry.title, entry.body, entry.mood, entry.tags, entry.date]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  document.getElementById("count").textContent = entries.length + " 篇";

  list.innerHTML = filtered
    .map(
      entry => `
    <article class="entry-item ${entry.id === activeId ? "active" : ""}" onclick="openEntry('${escapeJsString(entry.id)}')">
      <h2>${escapeHtml(entry.title || "未命名日记")}</h2>
      <p>${escapeHtml(entry.date || "")} / ${escapeHtml(entry.mood || "")}</p>
    </article>
  `
    )
    .join("");
}

function newEntry() {
  const entry = {
    id: uid(),
    title: "未命名日记",
    date: today(),
    mood: "平静",
    tags: "",
    body: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  entries.unshift(entry);
  activeId = entry.id;
  persist();
  renderList();
  showEditor(entry);
}

function collectEditorEntry(existing) {
  return {
    id: existing?.id || activeId || uid(),
    title: document.getElementById("title").value.trim() || "未命名日记",
    date: document.getElementById("entry-date").value || today(),
    mood: document.getElementById("mood").value,
    tags: document.getElementById("tags").value.trim(),
    body: document.getElementById("body").value,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function openEntry(id) {
  if (dirty && !confirm("当前内容还没保存，继续切换吗？")) return;

  const entry = entries.find(item => item.id === id);
  if (!entry) return;

  activeId = id;
  dirty = false;
  renderList();
  showEditor(entry);
}

function showEditor(entry) {
  document.getElementById("empty").hidden = true;
  document.getElementById("editor").hidden = false;
  document.getElementById("title").value = entry.title || "";
  document.getElementById("entry-date").value = entry.date || today();
  document.getElementById("mood").value = entry.mood || "平静";
  document.getElementById("tags").value = entry.tags || "";
  document.getElementById("body").value = entry.body || "";
}

function markDirty() {
  dirty = true;
  const existing = entries.find(item => item.id === activeId);

  if (existing) {
    Object.assign(existing, collectEditorEntry(existing));
    persist();
    renderList();
  }

  scheduleCloudSave();
}

function scheduleCloudSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (activeId) saveEntry(true);
  }, 1200);
}

async function saveEntry(silent = false) {
  const existing = entries.find(item => item.id === activeId);
  const entry = collectEditorEntry(existing);

  if (!entry.body.trim() && !entry.title.trim()) {
    alert("正文不能为空。");
    return;
  }

  if (existing) {
    Object.assign(existing, entry);
  } else {
    entries.unshift(entry);
    activeId = entry.id;
  }

  persist();
  dirty = false;
  renderList();

  if (cloudMode) {
    setSyncMode("云端模式：正在保存...");
    const res = await fetch("./api/diary-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adminName: accountName,
        password: accountPassword,
        entry
      })
    });

    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      if (!silent) alert(result.error || "云端保存失败，已保存在本机。");
      setSyncMode("本机已保存，云端保存失败");
    } else {
      setSyncMode("云端模式：已保存");
    }
  } else {
    setSyncMode("本机模式：已保存到当前设备");
  }
}

function duplicateEntry() {
  const entry = entries.find(item => item.id === activeId);
  if (!entry) return;

  const copy = {
    ...entry,
    id: uid(),
    title: entry.title + " 副本",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  entries.unshift(copy);
  activeId = copy.id;
  persist();
  renderList();
  showEditor(copy);
}

async function deleteEntry() {
  const entry = entries.find(item => item.id === activeId);
  if (!entry) return;
  if (!confirm(`确定删除「${entry.title || "未命名日记"}」吗？`)) return;

  entries = entries.filter(item => item.id !== activeId);
  activeId = "";
  persist();
  dirty = false;
  document.getElementById("editor").hidden = true;
  document.getElementById("empty").hidden = false;
  renderList();

  if (cloudMode) {
    const res = await fetch("./api/diary-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adminName: accountName,
        password: accountPassword,
        id: entry.id
      })
    });

    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      alert(result.error || "云端删除失败，本机已删除。");
    }
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `yunhe-diary-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("invalid");
      entries = data;
      activeId = "";
      persist();
      renderList();
      document.getElementById("editor").hidden = true;
      document.getElementById("empty").hidden = false;
    } catch (err) {
      alert("导入失败，请选择正确的日记 JSON 文件。");
    }
  };
  reader.readAsText(file);
}

function boot() {
  const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");

  if (!session?.adminName || !session?.password) {
    window.location.href = "diary-login.html";
    return;
  }

  accountName = session.adminName;
  accountPassword = session.password;
  localStorage.setItem(ACCOUNT_KEY, accountName);
  loadEntries();
  renderList();
  loadFromCloud();
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}
