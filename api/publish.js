const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { title, intro, body, video, type, topic } = data;

    if (!title || !intro || !body) {
      return res.status(400).json({
        success: false,
        error: "title / intro / body 必填"
      });
    }

    const slug = `post-${Date.now()}`;

    // =========================
    // 1️⃣ 写入 Supabase（核心）
    // =========================
    const { error } = await supabase.from("contents").insert([
      {
        title,
        intro,
        body,
        video,
        type: type || "article",
        topic: topic || "未分类",
        slug
      }
    ]);

    if (error) {
      return res.status(500).json({
        success: false,
        step: "supabase_insert",
        error
      });
    }

    // =========================
    // 2️⃣ 生成 HTML（GitHub Pages用）
    // =========================
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<header>
  <h1>${title}</h1>
</header>

<main>
  <p>${intro}</p>
  <hr>
  <div>${body.replace(/\n/g, "<br>")}</div>
</main>

</body>
</html>`;

    // =========================
    // 3️⃣ 写 GitHub Pages
    // =========================
    const pageContent = Buffer.from(html).toString("base64");

    const githubRes = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${slug}.html`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `publish ${slug}`,
          content: pageContent,
          branch: "main"
        })
      }
    );

    if (!githubRes.ok) {
      const text = await githubRes.text();
      return res.status(500).json({
        success: false,
        step: "github_publish",
        error: text
      });
    }

    // =========================
    // 4️⃣ 返回成功（关键）
    // =========================
    return res.status(200).json({
      success: true,
      slug,
      url: `/${slug}.html`
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
