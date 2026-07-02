const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ✅ 修正：统一官方命名
);

module.exports = async function handler(req, res) {
  console.log("API START");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    console.log("REQ DATA:", data);

    const { title, intro, body, video, type, topic } = data;

    if (!title || !intro || !body) {
      return res.status(400).json({
        success: false,
        error: "title / intro / body 必填"
      });
    }

    const slug = `post-${Date.now()}`;

    // =========================
    // 1️⃣ Supabase 写入（唯一数据源）
    // =========================
    const { error: supabaseError } = await supabase
      .from("contents")
      .insert([
        {
          title,
          intro,
          body,
          video: video || "",
          type: type || "article",
          topic: topic || "未分类",
          slug
        }
      ]);

    if (supabaseError) {
      console.log("SUPABASE ERROR:", supabaseError);
      return res.status(500).json({
        success: false,
        step: "supabase_insert",
        error: supabaseError
      });
    }

    console.log("SUPABASE OK");

    // =========================
    // 2️⃣ GitHub Pages HTML
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

    const pageContent = Buffer.from(html).toString("base64");

    // =========================
    // 3️⃣ GitHub 写入（加容错）
    // =========================
    let githubOk = true;

    try {
      const githubRes = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${slug}.html`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
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
        console.log("GITHUB ERROR:", text);
        githubOk = false;
      }

    } catch (e) {
      console.log("GITHUB EXCEPTION:", e.message);
      githubOk = false;
    }

    // =========================
    // 4️⃣ 返回结果（前端不会再炸）
    // =========================
    return res.status(200).json({
      success: true,
      slug,
      url: `/${slug}.html`,
      github: githubOk ? "ok" : "failed"
    });

  } catch (e) {
    console.log("FATAL ERROR:", e);

    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
