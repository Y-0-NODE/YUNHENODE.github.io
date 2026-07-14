const TOPIC_RULES = [
  ["亲密关系与家庭", ["亲密关系", "婚姻", "伴侣", "夫妻", "家庭", "父母", "亲子", "婆媳"]],
  ["沟通与冲突", ["沟通", "冲突", "争吵", "表达", "协商", "误解", "冷战", "和解"]],
  ["情感与关系", ["情感", "感情", "关系", "恋爱", "分手", "依恋", "信任", "边界"]],
  ["个体成长", ["成长", "自我", "选择", "焦虑", "情绪", "心理", "疗愈", "反思"]],
  ["组织结构", ["组织结构", "权责", "岗位", "层级", "部门", "架构调整", "职能"]],
  ["系统机制", ["系统机制", "运行机制", "失效", "闭环", "规则", "权限", "治理", "退出机制"]],
  ["管理与协作", ["管理", "协作", "团队", "流程", "执行", "决策", "项目管理", "分工"]],
  [
    "平台与技术",
    [
      "github",
      "supabase",
      "vercel",
      "codex",
      "api",
      "h5",
      "数据库",
      "部署",
      "算法",
      "软件",
      "人工智能"
    ]
  ],
  ["社会观察", ["社会观察", "社会现象", "群体", "公共议题", "政策", "舆论", "时代", "现实"]],
  ["城市与空间", ["城市", "街区", "社区", "空间", "建筑", "场地", "室内", "公共空间"]],
  ["消费与生活", ["消费", "购买", "服务", "体验", "生活方式", "日常", "用户体验"]],
  ["商业与品牌", ["品牌", "商业", "市场", "营销", "logo", "包装", "定位", "传播"]],
  ["艺术与创作", ["艺术", "摄影", "影像", "展览", "作品", "图像", "创作", "设计"]],
  [
    "方法与思考",
    ["方法", "方法论", "框架", "模型", "判断模型", "判断方法", "分析方法", "研究方法"]
  ],
  ["梦境与潜意识", ["梦境", "潜意识", "象征", "梦中", "做梦"]],
  ["文化", ["文化", "传统", "习俗", "审美", "历史", "叙事"]],
  ["平台", ["apple", "账号", "微信", "公众号", "小程序", "平台", "后台"]],
  ["技术", ["网站", "架构", "模块", "技术", "系统开发"]],
  ["组织", ["组织", "公司", "机构"]],
  ["品牌", ["品牌"]],
  ["城市", ["城市", "地方"]],
  ["消费", ["消费", "产品"]],
  ["艺术", ["艺术", "作品"]],
  ["空间", ["空间", "建筑"]],
  ["梦境", ["梦"]]
];

function cleanLines(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^阅读原文$|^微信扫一扫$|^长按识别/.test(line));
}

function detectTopic(text) {
  const lower = String(text || "").toLowerCase();
  const ranked = TOPIC_RULES.map(([topic, words], priority) => {
    const matches = words.filter(word => lower.includes(String(word).toLowerCase()));
    const score = matches.reduce((total, word) => total + Math.max(1, String(word).length), 0);
    return { topic, score, matchCount: matches.length, priority };
  })
    .filter(item => item.matchCount > 0)
    .sort((a, b) => b.score - a.score || b.matchCount - a.matchCount || a.priority - b.priority);
  return ranked[0]?.topic || "未分类";
}

function detectType(text) {
  const lower = String(text || "").toLowerCase();

  if (
    /case\s*\d+|problem|analysis|decision|validation|案例|问题|分析|决策|验证|排查流程|沟通策略/.test(
      lower
    )
  ) {
    return "case";
  }

  if (/视频|视频号|影像|片段|短片|纪录|vlog|movie|film/.test(lower)) {
    return "video";
  }

  return "article";
}

function firstSentence(text) {
  const line = cleanLines(text).find(item => item.length > 8) || "";
  return line.replace(/[。！？].*$/, "。").slice(0, 90);
}

function normalizeBody(lines, sourceUrl, mediaUrl, type) {
  const bodyLines = [...lines];
  const title = bodyLines.shift() || "";
  const intro = bodyLines[0] || "";
  const body = [];

  body.push(title);
  body.push("");
  if (intro && intro !== title) body.push(intro, "");

  bodyLines.forEach(line => {
    if (
      /^(\d+[.、]|Problem|Analysis|Decision|Validation|系统分析|排查流程|沟通策略|GitHub|Supabase|Vercel|Codex)/i.test(
        line
      )
    ) {
      body.push(line);
    } else {
      body.push(line);
    }
  });

  if (mediaUrl) {
    const label = type === "video" ? "视频" : "图片";
    body.push("", `[${label}: ${title || "公众号素材"}](${mediaUrl})`);
  }

  if (sourceUrl) {
    body.push("", `原文链接：${sourceUrl}`);
  }

  return body.join("\n").trim();
}

function getResolved() {
  const raw = document.getElementById("raw").value;
  const sourceUrl = document.getElementById("source-url").value.trim();
  const mediaUrl = document.getElementById("media-url").value.trim();
  const lines = cleanLines(raw);
  const rawText = lines.join("\n");
  const selectedType = document.getElementById("type").value;
  const selectedTopic = document.getElementById("topic").value;
  const type = selectedType === "auto" ? detectType(rawText) : selectedType;
  const topic = selectedTopic === "auto" ? detectTopic(rawText) : selectedTopic;
  const title = document.getElementById("title").value.trim() || lines[0] || "未命名公众号内容";
  const intro =
    document.getElementById("intro").value.trim() ||
    firstSentence(lines.slice(1).join("\n")) ||
    "公众号内容导入。";
  const body =
    document.getElementById("body").value.trim() || normalizeBody(lines, sourceUrl, mediaUrl, type);

  return { type, topic, title, intro, body, sourceUrl, mediaUrl };
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
  const topic = detectTopic(rawText);

  if (force || !document.getElementById("title").value.trim()) {
    document.getElementById("title").value = lines[0] || "";
  }

  if (force || !document.getElementById("intro").value.trim()) {
    document.getElementById("intro").value = firstSentence(lines.slice(1).join("\n")) || "";
  }

  if (force || document.getElementById("type").value === "auto") {
    document.getElementById("type").value = type;
  }

  if (force || document.getElementById("topic").value === "auto") {
    document.getElementById("topic").value = topic;
  }

  if (force || !document.getElementById("body").value.trim()) {
    document.getElementById("body").value = normalizeBody(
      lines,
      document.getElementById("source-url").value.trim(),
      document.getElementById("media-url").value.trim(),
      type
    );
  }

  renderPreview();
}

function renderPreview() {
  const data = getResolved();
  document.getElementById("preview").textContent = [
    `板块：${data.type}`,
    `主题：${data.topic}`,
    `标题：${data.title}`,
    `简介：${data.intro}`,
    "",
    data.body
  ].join("\n");
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

  if (!data.title || !data.body) {
    status.textContent = "请先粘贴公众号内容，或填写标题和正文。";
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

renderPreview();
