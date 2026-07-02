module.exports = async function handler(req, res) {
  console.time("publish-total");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { password, title, intro, video, body, tag, type, topic } = data;

    if (password !== process.env.PUBLISH_PASSWORD) {
      return res.status(401).json({ success: false, error: "发布密码错误" });
    }

    if (!title || !intro || !body) {
      return res.status(400).json({
        success: false,
        error: "标题、简介、正文不能为空"
      });
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const branch = "main";

    if (!owner || !repo || !token) {
      return res.status(500).json({
        success: false,
        error: "Vercel 环境变量缺失",
        need: ["GITHUB_OWNER", "GITHUB_REPO", "GITHUB_TOKEN"]
      });
    }

    const finalType = type || "article";
    const finalTopic = topic || tag || "未分类";

    const typeNameMap = {
      video: "视频系统",
      article: "文章系统",
      case: "案例系统"
    };

    const typeUrlMap = {
      video: "video.html",
      article: "article.html",
      case: "case.html"
    };

    const returnName = typeNameMap[finalType] || "内容系统";
    const returnUrl = typeUrlMap[finalType] || "index.html";

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

<hr>

<div class="grid">
  <a class="card" href="${returnUrl}">
    <h2>返回${returnName}</h2>
    <p>查看同类内容。</p>
  </a>

  <a class="card" href="index.html">
    <h2>返回首页</h2>
    <p>回到云鹤系统首页。</p>
  </a>
</div>

</main>
</body>
</html>`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    };

    const pageContent = Buffer.from(html).toString("base64");
    const pageUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;

    console.time("create-page");

    const pageResponse = await fetch(pageUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `publish ${filename}`,
        content: pageContent,
        branch
      })
    });

    console.timeEnd("create-page");

    if (!pageResponse.ok) {
      const error = await pageResponse.json();
      return res.status(500).json({
        success: false,
        step: "create-page",
        message: "内容页面创建失败",
        error
      });
    }

    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/content-list.json`;

    console.time("get-list");

    const listGet = await fetch(listUrl, { headers });

    console.timeEnd("get-list");

    if (!listGet.ok) {
      const error = await listGet.json();
      return res.status(500).json({
        success: false,
        step: "get-list",
        message: "读取 content-list.json 失败",
        error
      });
    }

    const listData = await listGet.json();

    let list = [];

    if (listData.content) {
      try {
        const decoded = Buffer.from(listData.content, "base64").toString("utf-8");
        list = JSON.parse(decoded);
      } catch (err) {
        return res.status(500).json({
          success: false,
          step: "parse-list",
          message: "content-list.json 解析失败",
          error: err.message
        });
      }
    }

    list.unshift({
      title,
      intro,
      type: finalType,
      topic: finalTopic,
      tag: finalTopic,
      video: video || "",
      url: filename,
      date: new Date().toISOString()
    });

    const newListContent = Buffer.from(JSON.stringify(list, null, 2)).toString("base64");

    console.time("update-list");

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

    console.timeEnd("update-list");
    console.timeEnd("publish-total");

    if (!listUpdate.ok) {
      const error = await listUpdate.json();
      return res.status(500).json({
        success: false,
        step: "update-list",
        message: "内容页面已创建，但 content-list.json 更新失败",
        filename,
        url: `/${filename}`,
        error
      });
    }

    return res.status(200).json({
      success: true,
      message: "发布成功",
      filename,
      url: `/${filename}`,
      type: finalType,
      topic: finalTopic
    });

  } catch (err) {
    console.timeEnd("publish-total");

    return res.status(500).json({
      success: false,
      step: "server-error",
      message: "服务器执行出错",
      error: err.message
    });
  }
};
