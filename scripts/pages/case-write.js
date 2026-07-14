const TEMPLATES = {
  A: {
    protocolTemplate: "A",
    title: "",
    intro: "用于现实案例、平台案例、品牌案例、组织案例、消费者案例与政府案例。",
    topic: "未分类",
    knowledgeLevel: "Validation",
    sections: [
      "Case Number（案例编号）",
      "Problem（问题）",
      "Observation（观察）",
      "Analysis（分析）",
      "Decision（判断）",
      "Validation（验证）",
      "Reference（参考资料）",
      "Related Documents（相关文章）"
    ]
  },
  B: {
    protocolTemplate: "B",
    title: "",
    intro: "用于原创概念、原创理论、系统框架与判断模型。",
    topic: "未分类",
    knowledgeLevel: "Method",
    sections: [
      "Concept（概念）",
      "Definition（定义）",
      "Background（提出背景）",
      "Mechanism（运行机制）",
      "Application（适用范围）",
      "Boundary（边界）",
      "Common Misunderstandings（常见误区）",
      "Related Cases（相关案例）",
      "Conclusion（结论）"
    ]
  },
  C: {
    protocolTemplate: "C",
    title: "",
    intro: "用于每日研究、阶段记录、观察日志与思考过程。",
    topic: "未分类",
    knowledgeLevel: "Observation",
    sections: [
      "Date（日期）",
      "Observation（观察）",
      "Discovery（发现）",
      "Current Thinking（当前思考）",
      "Questions（问题）",
      "Need Verification（待验证）",
      "Future Direction（未来方向）",
      "Update History（更新记录）"
    ]
  },
  D: {
    protocolTemplate: "D",
    title: "",
    intro: "用于网站开发、产品开发、维权记录与长期项目。",
    topic: "未分类",
    knowledgeLevel: "Analysis",
    sections: [
      "Project Name（项目名称）",
      "Background（背景）",
      "Goal（目标）",
      "Problem（问题）",
      "Process（过程）",
      "Solution（方案）",
      "Result（结果）",
      "Iteration（迭代）",
      "Current Status（当前状态）",
      "Future Plan（未来计划）"
    ]
  },
  E: {
    protocolTemplate: "E",
    title: "",
    intro: "用于视频、摄影、图片、采访、演讲与录音档案。",
    topic: "艺术",
    knowledgeLevel: "Observation",
    sections: [
      "Media Type（媒体类型）",
      "Introduction（简介）",
      "Related Topics（相关主题）",
      "Related Articles（相关文章）",
      "Media Information（媒体信息）",
      "Additional Notes（补充说明）"
    ]
  },
  X: {
    protocolTemplate: "X",
    title: "",
    intro: "用于暂时无法分类、以后需要重新整理的材料。",
    topic: "未分类",
    knowledgeLevel: "Observation",
    sections: [
      "Summary（摘要）",
      "Current Observation（当前观察）",
      "Current Thinking（当前思考）",
      "Possible Categories（可能分类）",
      "Need Future Classification（是否以后分类）",
      "Next Step（下一步）",
      "Related Materials（相关资料）",
      "Current Status（当前状态）"
    ]
  },
  bo: {
    protocolTemplate: "A",
    title: "Case 001 / BO H5 Modular Upgrade",
    intro: "围绕 H5 模块升级的结构化判断与验证记录。",
    topic: "技术",
    knowledgeLevel: "Validation",
    sections: ["Problem（问题）", "Analysis（分析）", "Decision（决策）", "Validation（验证）"]
  },
  apple: {
    protocolTemplate: "A",
    title: "Case 002 / Apple 幽灵账号问题",
    intro: "围绕异常账号、系统排查和沟通处理的案例记录。",
    topic: "平台",
    knowledgeLevel: "Validation",
    sections: ["系统分析", "排查流程", "沟通策略"]
  },
  architecture: {
    protocolTemplate: "D",
    title: "Case 003 / 网站架构",
    intro: "记录网站从代码、数据、部署到协作工具的基础架构。",
    topic: "技术",
    knowledgeLevel: "Analysis",
    sections: ["GitHub", "Supabase", "Vercel", "Codex"]
  }
};

const escapeHtml = window.YunheUtils.escapeHtml;

function applyTemplate() {
  const template = TEMPLATES[document.getElementById("template").value] || TEMPLATES.X;
  document.getElementById("title").value = template.title;
  document.getElementById("intro").value = template.intro;
  document.getElementById("topic").value = template.topic;
  document.getElementById("knowledge-level").value = template.knowledgeLevel;
  document.getElementById("section-fields").innerHTML = template.sections
    .map(
      (name, index) => `
    <label for="section-${index}">${escapeHtml(name)}</label>
    <textarea id="section-${index}" data-section="${escapeHtml(name)}" oninput="renderPreview()" placeholder="填写 ${escapeHtml(name)}"></textarea>
  `
    )
    .join("");
  document.getElementById("media-target").innerHTML = `
    <option value="random">随机插入到一个段落</option>
    ${template.sections.map((name, index) => `<option value="section-${index}">插入到 ${escapeHtml(name)}</option>`).join("")}
  `;
  renderPreview();
}

function getMediaLine(kind, caption, url) {
  const label = kind === "video" ? "视频" : "图片";
  const text = caption ? `${label}: ${caption}` : label;
  return `[${text}](${url})`;
}

function pickTargetTextarea(forceRandom) {
  const sections = Array.from(document.querySelectorAll("[data-section]"));
  if (!sections.length) return null;

  const selected = document.getElementById("media-target").value;
  if (forceRandom || selected === "random") {
    return sections[Math.floor(Math.random() * sections.length)];
  }

  return document.getElementById(selected) || sections[0];
}

function appendToSection(textarea, line) {
  const current = textarea.value.trim();
  textarea.value = current ? `${current}\n\n${line}` : line;
  textarea.focus();
  renderPreview();
}

function insertMediaUrl(forceRandom) {
  const status = document.getElementById("status");
  const url = document.getElementById("media-url").value.trim();
  const kind = document.getElementById("media-kind").value;
  const caption = document.getElementById("media-caption").value.trim();
  const target = pickTargetTextarea(forceRandom);

  if (!url) {
    status.textContent = "请先填写图片或视频地址。";
    return;
  }

  if (!target) {
    status.textContent = "没有找到可以插入的位置。";
    return;
  }

  appendToSection(target, getMediaLine(kind, caption, url));
  status.textContent = "已经插入到正文。";
}

function buildCaseText() {
  const title = document.getElementById("title").value.trim();
  const intro = document.getElementById("intro").value.trim();
  const topic = document.getElementById("topic").value;
  const sections = Array.from(document.querySelectorAll("[data-section]"));
  const body = [
    title,
    "",
    intro,
    "",
    `主题：${topic}`,
    "",
    ...sections.flatMap(item => {
      const label = item.dataset.section;
      const value = item.value.trim() || "待填写";
      return [label, value, ""];
    })
  ];

  return body.join("\n").trim();
}

function renderPreview() {
  document.getElementById("preview").textContent = buildCaseText();
}

async function copyPreview() {
  await navigator.clipboard.writeText(buildCaseText());
  document.getElementById("status").textContent = "已复制生成文本。";
}

async function saveCase() {
  const status = document.getElementById("status");
  const title = document.getElementById("title").value.trim();
  const intro = document.getElementById("intro").value.trim();
  const body = buildCaseText();
  const presetKey = document.getElementById("template").value;
  const template = TEMPLATES[presetKey]?.protocolTemplate || presetKey;
  const knowledgeLevel = document.getElementById("knowledge-level").value;

  if (!title || !body || !template || !knowledgeLevel) {
    status.textContent = "必填项缺失：标题、正文、模板或知识层级。";
    return;
  }

  status.textContent = "正在保存案例...";

  const res = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName: document.getElementById("admin-name").value.trim(),
      password: document.getElementById("admin-password").value.trim(),
      title,
      intro,
      body,
      type: "case",
      topic: document.getElementById("topic").value,
      template,
      knowledgeLevel
    })
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    status.textContent = result.error || "保存失败。";
    return;
  }

  status.innerHTML = `保存成功。<a href="${result.url}">打开案例</a>`;
}

applyTemplate();
