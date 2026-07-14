const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;

function videoUrl(item) {
  if (item.slug) return `content.html?slug=${encodeURIComponent(item.slug)}`;
  return `content.html?id=${encodeURIComponent(item.id)}`;
}

async function loadVideos() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contents?select=id,title,slug,intro,topic,type,created_at&type=eq.video&order=created_at.desc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }
  );
  if (!res.ok) throw new Error("视频读取失败");
  const data = await res.json();
  const selectedTopic = new URLSearchParams(location.search).get("topic");
  const videos = (Array.isArray(data) ? data : []).filter(
    item => !selectedTopic || (item.topic || "未分类") === selectedTopic
  );
  const box = document.getElementById("list");

  if (!videos.length) {
    box.innerHTML = "<p>暂无视频。</p>";
    return;
  }

  box.innerHTML = videos
    .map(
      item => `
    <a class="card" href="${videoUrl(item)}">
      <span>${item.topic || item.tag || "VIDEO"}</span>
      <h2>${item.title}</h2>
      <p>${item.intro}</p>
    </a>
  `
    )
    .join("");
}
loadVideos().catch(() => {
  document.getElementById("list").innerHTML = "<p>视频读取失败，请稍后重试。</p>";
});
