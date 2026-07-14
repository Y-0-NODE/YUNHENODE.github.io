const SUPABASE_URL = "https://你的项目.supabase.co";
const SUPABASE_KEY = "你的anon key";

async function loadDraft() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contents?status=eq.draft&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await res.json();

  const box = document.getElementById("list");

  if (!data.length) {
    box.innerHTML = "<p style='color:#777'>暂无草稿</p>";
    return;
  }

  box.innerHTML = data
    .map(
      item => `
    <div class="card">
      <div class="badge">DRAFT</div>
      <h2>${item.title}</h2>
      <p>${item.intro || ""}</p>

      <button onclick="publish('${item.id}')">发布</button>
      <button onclick="del('${item.id}')">删除</button>
    </div>
  `
    )
    .join("");
}

/* 发布草稿（改状态） */
async function publish(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/contents?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "published"
    })
  });

  alert("已发布");
  loadDraft();
}

/* 删除 */
async function del(id) {
  const adminName = prompt("请输入数据管理员名称");

  if (!adminName) return;

  const password = prompt("请输入管理员密码");

  if (!password) return;

  const res = await fetch("/api/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      adminName,
      password
    })
  });

  if (!res.ok) {
    const result = await res.json().catch(() => ({}));
    alert(result.error || "删除失败，请检查管理员密码或 Vercel 环境变量。");
    return;
  }

  alert("已删除");
  loadDraft();
}

loadDraft();
