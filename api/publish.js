// =========================
// 1. 创建页面（必须等待成功）
// =========================
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
  const errorText = await pageResponse.text();
  return res.status(500).json({
    success: false,
    step: "create-page",
    error: errorText
  });
}

// =========================
// 2. 先立刻返回成功（关键修复点）
// =========================
res.status(200).json({
  success: true,
  message: "发布成功",
  filename,
  url: `/${filename}`
});

// =========================
// 3. 后台异步更新 list（不阻塞）
// =========================
;(async () => {
  try {
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/content-list.json`;

    const listGet = await fetch(listUrl, { headers });
    const listData = await listGet.json();

    let list = [];
    let sha = listData.sha;

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
      video: video || "",
      url: filename,
      date: new Date().toISOString()
    });

    const newListContent = Buffer.from(
      JSON.stringify(list, null, 2)
    ).toString("base64");

    await fetch(listUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "update content list",
        content: newListContent,
        sha,
        branch
      })
    });

  } catch (e) {
    console.log("list update failed:", e.message);
  }
})();
