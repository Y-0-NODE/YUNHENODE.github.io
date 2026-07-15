function cleanLines(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^阅读原文$|^微信扫一扫$|^长按识别/.test(line));
}

function detectType(text) {
  const lower = String(text || "").toLowerCase();
  const firstLine = cleanLines(text)[0] || "";
  const caseMarkers = ["problem", "analysis", "decision", "validation"].filter(marker =>
    new RegExp(`(^|\\n)${marker}\\s*[:：]`, "i").test(lower)
  ).length;

  if (/case\s*\d+|案例档案|案例分析/.test(firstLine.toLowerCase()) || caseMarkers >= 2) {
    return "case";
  }
  if (/视频号|影像记录|纪录片|vlog|movie|film/.test(lower)) return "video";
  return "article";
}

function firstSentence(text) {
  const line = cleanLines(text).find(item => item.length > 8) || "";
  return line.replace(/[。！？].*$/, "。").slice(0, 90);
}

function publicSourceUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.hostname === "mp.weixin.qq.com" && !/^\/s(?:\/|$)/.test(url.pathname)) return "";
    return url.href;
  } catch (error) {
    return "";
  }
}

function comparable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[《》“”"'：:，,。.!！?？/\s—_-]/g, "");
}

function normalizeBody(lines, sourceUrl, mediaUrl, type, intro) {
  const bodyLines = [...lines];
  const title = bodyLines.shift() || "";
  if (bodyLines[0] && comparable(bodyLines[0]) === comparable(intro)) bodyLines.shift();
  const body = bodyLines.filter(line => !/^(图片|插图|image|图片\d+|此处插入图片)$/i.test(line));

  if (mediaUrl) {
    const label = type === "video" ? "视频" : "图片";
    body.push("", `[${label}: ${title || "公众号素材"}](${mediaUrl})`);
  }
  if (sourceUrl) body.push("", `原文链接：${sourceUrl}`);
  return body.join("\n").trim();
}

function getResolved() {
  const raw = document.getElementById("raw").value;
  const enteredSourceUrl = document.getElementById("source-url").value.trim();
  const sourceUrl = publicSourceUrl(enteredSourceUrl);
  const mediaUrl = document.getElementById("media-url").value.trim();
  const lines = cleanLines(raw);
  const rawText = lines.join("\n");
  const selectedType = document.getElementById("type").value;
  const selectedTopic = document.getElementById("topic").value;
  const type = selectedType === "auto" ? detectType(rawText) : selectedType;
  const topic =
    selectedTopic === "auto"
      ? window.YunheTaxonomy.detectTopic(rawText)
      : window.YunheTaxonomy.canonicalTopic(selectedTopic);
  const title = document.getElementById("title").value.trim() || lines[0] || "未命名公众号内容";
  const intro =
    document.getElementById("intro").value.trim() ||
    firstSentence(lines.slice(1).join("\n")) ||
    "公众号内容导入。";
  const body =
    document.getElementById("body").value.trim() ||
    normalizeBody(lines, sourceUrl, mediaUrl, type, intro);

  return {
    type,
    topic,
    title,
    intro,
    body,
    sourceUrl,
    enteredSourceUrl,
    mediaUrl,
    template: document.getElementById("template").value,
    knowledgeLevel: document.getElementById("knowledge-level").value,
    originalDate: document.getElementById("original-date").value,
    source: document.getElementById("source").value
  };
}

function autoFill(force) {
  const raw = document.getElementById("raw").value;
  const lines = cleanLines(raw);
  if (!lines.length) {
    renderPreview();
    return;
  }

  const rawText = lines.join("\n");
  const type = detectType(rawText);
  if (force || !document.getElementById("title").value.trim()) {
    document.getElementById("title").value = lines[0] || "";
  }
  if (force || !document.getElementById("intro").value.trim()) {
    document.getElementById("intro").value = firstSentence(lines.slice(1).join("\n")) || "";
  }
  if (force) {
    document.getElementById("type").value = "auto";
    document.getElementById("topic").value = "auto";
  }
  if (force || !document.getElementById("body").value.trim()) {
    document.getElementById("body").value = normalizeBody(
      lines,
      publicSourceUrl(document.getElementById("source-url").value),
      document.getElementById("media-url").value.trim(),
      type,
      document.getElementById("intro").value.trim()
    );
  }
  renderPreview();
}

function renderPreview() {
  const data = getResolved();
  const ignoredLink = data.enteredSourceUrl && !data.sourceUrl;
  document.getElementById("preview").textContent = [
    `板块：${data.type}`,
    `主题：${data.topic}`,
    `模板：${data.template}`,
    `知识层级：${data.knowledgeLevel}`,
    `来源：${data.source}`,
    `标题：${data.title}`,
    `简介：${data.intro}`,
    ignoredLink ? "原文链接：已忽略公众号后台管理地址" : "",
    "",
    data.body
  ]
    .filter((line, index) => line || index === 8)
    .join("\n");
}

async function copyPreview() {
  await navigator.clipboard.writeText(getResolved().body);
  document.getElementById("status").textContent = "已复制整理后的正文。";
}

async function publishImport() {
  const status = document.getElementById("status");
  const adminName = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("admin-password").value.trim();
  const data = getResolved();

  if (!adminName || !password) {
    status.textContent = "请填写管理员名称和密码。";
    return;
  }
  if (!data.title || !data.body || !data.template || !data.knowledgeLevel) {
    status.textContent = "请补齐标题、正文、模板和知识层级。";
    return;
  }

  status.textContent = "正在保存到网站数据库...";
  const res = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName,
      password,
      title: data.title,
      intro: data.intro,
      body: data.body,
      type: data.type,
      topic: data.topic,
      template: data.template,
      knowledgeLevel: data.knowledgeLevel,
      originalDate: data.originalDate,
      source: data.source,
      video: data.type === "video" ? data.mediaUrl || data.sourceUrl : ""
    })
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    status.textContent = result.error || "保存失败，请检查管理员密码或 Vercel 环境变量。";
    return;
  }
  status.innerHTML = `保存成功。<a href="${result.url}">打开内容</a>`;
}

window.YunheTaxonomy.populateTopicSelect(document.getElementById("topic"), {
  includeAuto: true,
  selected: "auto"
});
renderPreview();
