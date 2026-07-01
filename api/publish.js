module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { password, title, intro, video, body, tag, type, topic } = data;

  if (password !== process.env.PUBLISH_PASSWORD) {
    return res.status(401).json({ success: false, error: "发布密码错误" });
  }

  const finalType = type || "article";
  const finalTopic = topic || tag || "未分类";

  const filename = `content-${Date.now()}.html`;

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
<p class="eyebrow">${finalTopic} / ${finalType}</p>
<h1>${title}</h1>
<p class="intro">${intro}</p>
<hr>
<h2>视频 / 链接</h2>
<p>${video || "无"}</p>
<hr>
<h2>正文</h2>
<p>${body.replace(/\n/g, "<br>")}</p>
</main>
</body>
</html>`;

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const branch = "main";

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json"
  };

  const pageContent = Buffer.from(html).toString("base64");

  const pageUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;

  const pageResponse = await fetch(pageUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `publish ${filename}`,
      content: pageContent,
      branch
    })
  });

  if (!pageResponse.ok) {
    const error = await pageResponse.json();
    return res.status(500).json({ success: false, step: "create-page", error });
  }

  const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/content-list.json`;

  const listGet = await fetch(listUrl, { headers });
  const listData = await listGet.json();

  let list = [];

  if (listData.content) {
    const decoded = Buffer.from(listData.content, "base64").toString("utf-8");
    list = JSON.parse(decoded);
  }

  list.unshift({
    title,
    intro,
    type: finalType,
    topic: finalTopic,
    tag: finalTopic,
    video,
    url: filename,
    date: new Date().toISOString()
  });

  const newListContent = Buffer.from(JSON.stringify(list, null, 2)).toString("base64");

  const listUpdate = await fetch(listUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `update content list`,
      content: newListContent,
      sha: listData.sha,
      branch
    })
  });

  if (!listUpdate.ok) {
    const error = await listUpdate.json();
    return res.status(500).json({ success: false, step: "update-list", error });
  }

  return res.status(200).json({
    success: true,
    filename,
    url: `/${filename}`
  });
};
