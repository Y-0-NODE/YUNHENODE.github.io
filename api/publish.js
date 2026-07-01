module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  const { password, title, intro, video, body, tag } = data;

  if (password !== process.env.PUBLISH_PASSWORD) {
    return res.status(401).json({ success: false, error: "发布密码错误" });
  }

  const safeTitle = title
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9-]/g, "-")
    .slice(0, 40);

  const filename = `content-${Date.now()}-${safeTitle}.html`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<link rel="stylesheet" href="style.css">
</head>

<body>

<header class="topbar">
  <div class="logo">YUNHENODE</div>
  <nav>
    <a href="index.html">首页</a>
    <a href="video.html">视频</a>
    <a href="article.html">文章</a>
    <a href="case.html">案例</a>
    <a href="about.html">关于我</a>
  </nav>
</header>

<main class="home">

<p class="eyebrow">${tag}</p>

<h1>${title}</h1>

<p class="intro">${intro}</p>

<hr>

<h2>视频 / 链接</h2>
<p>${video}</p>

<hr>

<h2>正文</h2>
<p>${body.replace(/\n/g, "<br>")}</p>

<hr>

<h2>返回</h2>
<div class="grid">
  <a class="card" href="index.html">
    <h2>回首页</h2>
    <p>返回云鹤系统入口</p>
  </a>
</div>

</main>

</body>
</html>`;

  const content = Buffer.from(html).toString("base64");

  const apiUrl = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filename}`;

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `publish ${filename}`,
      content,
      branch: "main"
    })
  });

  const result = await response.json();

  if (!response.ok) {
    return res.status(500).json({
      success: false,
      error: result
    });
  }

  return res.status(200).json({
    success: true,
    filename,
    url: `/${filename}`
  });
};
