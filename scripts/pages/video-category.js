const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;

async function loadCategories() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contents?select=id,title,slug,intro,topic,type,created_at&type=eq.video&order=created_at.desc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    }
  );
  if (!res.ok) throw new Error("视频分类读取失败");
  const videos = await res.json();
  const box = document.getElementById("category-list");
  const topics = [...new Set(videos.map(item => item.topic || "未分类"))];

  box.innerHTML = topics
    .map(topic => {
      const count = videos.filter(item => item.topic === topic || item.tag === topic).length;
      return `
      <a class="card" href="video-list.html?topic=${encodeURIComponent(topic)}">
        <span>${count} 条</span>
        <h2>${topic}</h2>
        <p>查看${topic}相关视频。</p>
      </a>
    `;
    })
    .join("");
}
loadCategories().catch(() => {
  document.getElementById("category-list").innerHTML = "<p>视频分类读取失败。</p>";
});
