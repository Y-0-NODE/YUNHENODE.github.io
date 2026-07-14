const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;

const escapeHtml = window.YunheUtils.escapeHtml;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function localViews(id) {
  const key = `yunhe.thought.views.${id}`;
  const current = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(current));
  return current;
}

function parseProfile(row) {
  try {
    return JSON.parse(row?.body || "{}");
  } catch (e) {
    return {};
  }
}

function renderMedia(text) {
  const media = [];
  const body = window.YunheMetadata.content
    .strip(text)
    .replace(/\[(图片|视频)(?::\s*([^\]]+))?\]\((https?:\/\/[^)]+)\)/g, (_, kind, caption, url) => {
      media.push({ kind, caption: caption || "", url });
      return "";
    })
    .trim();

  const html = [`<div class="post-body">${escapeHtml(body)}</div>`];
  media.forEach(item => {
    if (item.kind === "视频") {
      html.push(`<video controls src="${escapeHtml(item.url)}"></video>`);
    } else {
      html.push(
        `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption || "随笔图片")}">`
      );
    }
  });
  return html.join("");
}

async function fetchContents(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/contents?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!res.ok) throw new Error("读取失败");
  return res.json();
}

async function loadProfile() {
  const rows = await fetchContents(
    "select=id,title,intro,body,type,topic,created_at&type=eq.thought_profile&order=created_at.desc&limit=1"
  );
  const profile = parseProfile(rows?.[0]);
  document.getElementById("profile-name").textContent = profile.name || "云鹤系统";
  document.getElementById("profile-signature").textContent =
    profile.signature || "短记录、即时观察与公开片段。";
  document.getElementById("avatar").src = profile.avatar || "app-icon.svg";
}

async function loadThoughts() {
  const status = document.getElementById("status");
  const feed = document.getElementById("feed");
  const rows = await fetchContents(
    "select=id,title,slug,intro,body,type,topic,created_at&type=eq.thought&topic=eq.public&order=created_at.desc"
  );

  if (!rows.length) {
    status.textContent = "暂时没有公开随笔。";
    return;
  }

  status.textContent = "";
  feed.innerHTML = rows
    .map(
      item => `
    <article class="post">
      <div class="post-meta">
        <span>${formatDate(item.created_at)}</span>
        <span>浏览 ${localViews(item.id)}</span>
      </div>
      ${renderMedia(item.body || item.intro || item.title)}
    </article>
  `
    )
    .join("");
}

async function boot() {
  try {
    await loadProfile();
    await loadThoughts();
  } catch (e) {
    document.getElementById("status").textContent = "随笔读取失败，请检查 Supabase 配置。";
  }
}

boot();
