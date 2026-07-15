(function attachUtils(global) {
  "use strict";

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value, separator = ".") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = number => String(number).padStart(2, "0");
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(separator);
  }

  function formatDateTime(value) {
    if (!value) return "未标注";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function toDateInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function lines(value) {
    return String(value || "")
      .split(/[\n，,]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }

  const taxonomyGroups = [
    {
      name: "人与关系",
      description: "情绪、亲密关系、家庭互动、沟通和个人变化。",
      items: [
        { name: "情感与关系", description: "情绪经验、关系判断与相处方式。" },
        { name: "亲密关系与家庭", description: "伴侣、家庭边界与长期关系。" },
        { name: "沟通与冲突", description: "表达、误解、协商与冲突处理。" },
        { name: "个体成长", description: "自我认识、选择、边界与改变。" }
      ]
    },
    {
      name: "组织与系统",
      description: "组织结构、系统运行、管理协作、平台与技术。",
      items: [
        { name: "组织结构", description: "角色、权责、流程与组织关系。" },
        { name: "系统机制", description: "系统如何形成、运行、失效与修复。" },
        { name: "管理与协作", description: "决策、执行、团队协同与管理实践。" },
        { name: "平台与技术", description: "平台机制、数字工具与技术变化。" }
      ]
    },
    {
      name: "社会与现实",
      description: "社会现象、城市空间、消费生活与商业品牌。",
      items: [
        { name: "社会观察", description: "现实事件、群体行为与社会变化。" },
        { name: "城市与空间", description: "城市经验、公共空间与地方关系。" },
        { name: "消费与生活", description: "消费选择、日常生活与体验判断。" },
        { name: "商业与品牌", description: "品牌表达、商业模式与市场关系。" }
      ]
    },
    {
      name: "创作与内在",
      description: "艺术创作、思考方法、梦境与内在经验。",
      items: [
        { name: "艺术与创作", description: "视觉、影像、表达与创作过程。" },
        { name: "方法与思考", description: "分析框架、研究方法与认知整理。" },
        { name: "梦境与潜意识", description: "梦境记录、象征与潜意识体验。" },
        { name: "未分类", description: "暂时还未确定主题的文章。" }
      ]
    }
  ];

  const legacyTopicMap = {
    情感关系与人际处理: "情感与关系",
    个人成长与自我观察: "个体成长",
    系统组织与规则设计: "系统机制",
    社会观察与公共议题: "社会观察",
    技术工具与数字实践: "平台与技术",
    平台: "平台与技术",
    技术: "平台与技术",
    组织: "组织结构",
    城市: "城市与空间",
    空间: "城市与空间",
    消费: "消费与生活",
    品牌: "商业与品牌",
    艺术: "艺术与创作",
    梦境: "梦境与潜意识",
    文化: "社会观察",
    社会: "社会观察"
  };

  const broadLegacyTopics = new Set([
    "情感关系与人际处理",
    "个人成长与自我观察",
    "系统组织与规则设计",
    "社会观察与公共议题",
    "技术工具与数字实践"
  ]);

  const topicRules = [
    ["亲密关系与家庭", ["亲密关系", "婚姻", "伴侣", "夫妻", "家庭", "父母", "亲子", "婆媳"]],
    ["沟通与冲突", ["沟通", "冲突", "争吵", "协商", "误解", "冷战", "和解"]],
    ["情感与关系", ["情感", "感情", "人际关系", "恋爱", "分手", "依恋", "信任", "关系边界"]],
    ["个体成长", ["成长", "自我", "焦虑", "情绪", "心理", "疗愈", "反思"]],
    [
      "艺术与创作",
      [
        "艺术领域",
        "艺术系统",
        "艺术空间",
        "艺术话语",
        "艺术圈",
        "艺术品",
        "艺术",
        "摄影",
        "影像",
        "画廊",
        "展览",
        "作品",
        "图像",
        "创作",
        "设计",
        "动漫",
        "短片",
        "审美"
      ]
    ],
    [
      "方法与思考",
      ["方法论", "框架", "模型", "判断模型", "研究方法", "分析方法", "认知", "结构内容", "识别方法"]
    ],
    ["梦境与潜意识", ["梦境", "潜意识", "象征", "梦中", "做梦"]],
    ["商业与品牌", ["品牌", "商业", "市场", "营销", "包装", "定位", "文化ip", "泡泡玛特"]],
    [
      "消费与生活",
      ["消费", "购买", "服务体验", "生活方式", "用户体验", "饮食", "食物", "调味", "胡椒"]
    ],
    ["城市与空间", ["城市", "街区", "社区", "公共空间", "建筑", "场地", "室内", "路灯"]],
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
        "人工智能",
        "账号",
        "小程序"
      ]
    ],
    [
      "组织结构",
      ["组织结构", "组织", "权责", "岗位", "层级", "部门", "职能", "招聘", "公司", "机构"]
    ],
    ["管理与协作", ["管理", "协作", "团队", "执行", "决策", "项目管理", "分工"]],
    [
      "系统机制",
      [
        "系统",
        "规则",
        "机制",
        "责任",
        "节点",
        "权限",
        "治理",
        "流程",
        "闭环",
        "反馈",
        "12345",
        "平台"
      ]
    ],
    [
      "社会观察",
      [
        "社会",
        "公共议题",
        "群体",
        "政策",
        "舆论",
        "时代",
        "现实",
        "传播",
        "评论区",
        "短视频",
        "自媒体"
      ]
    ]
  ];

  function canonicalTopic(value) {
    const topic = String(value || "未分类").trim() || "未分类";
    return legacyTopicMap[topic] || topic;
  }

  function detectTopic(text, fallback = "未分类") {
    const lower = String(text || "").toLowerCase();
    const ranked = topicRules
      .map(([topic, words], priority) => {
        const matches = words.filter(word => lower.includes(String(word).toLowerCase()));
        const score = matches.reduce(
          (total, word) => total + Math.max(2, String(word).replace(/\s/g, "").length),
          0
        );
        return { topic, score, matches: matches.length, priority };
      })
      .filter(item => item.matches > 0)
      .sort((a, b) => b.score - a.score || b.matches - a.matches || a.priority - b.priority);
    return ranked[0]?.topic || canonicalTopic(fallback);
  }

  function classifyContent(content = {}) {
    const rawTopic = String(content.topic || "未分类").trim() || "未分类";
    const fallback = canonicalTopic(rawTopic);
    const shouldRefine =
      broadLegacyTopics.has(rawTopic) || ["系统机制", "社会观察"].includes(fallback);
    if (!shouldRefine) return fallback;
    return detectTopic(
      [content.title, content.intro, content.body].filter(Boolean).join("\n"),
      fallback
    );
  }

  function populateTopicSelect(select, options = {}) {
    if (!select) return;
    const selected = canonicalTopic(options.selected ?? select.value);
    const includeAuto = options.includeAuto || select.value === "auto";
    const extras = Array.isArray(options.extras) ? options.extras.map(canonicalTopic) : [];
    const known = new Set(taxonomyGroups.flatMap(group => group.items.map(item => item.name)));
    select.innerHTML = "";

    if (includeAuto) select.appendChild(new Option("自动判断", "auto"));
    taxonomyGroups.forEach(group => {
      const node = document.createElement("optgroup");
      node.label = group.name;
      group.items.forEach(item => node.appendChild(new Option(item.name, item.name)));
      select.appendChild(node);
    });

    const additional = [...new Set(extras)].filter(item => item && !known.has(item));
    if (additional.length) {
      const node = document.createElement("optgroup");
      node.label = "知识系统补充主题";
      additional.forEach(item => node.appendChild(new Option(item, item)));
      select.appendChild(node);
    }

    if (includeAuto && options.selected === "auto") select.value = "auto";
    else if ([...select.options].some(item => item.value === selected)) select.value = selected;
  }

  global.YunheUtils = Object.freeze({
    escapeHtml,
    fetchJson,
    formatDate,
    formatDateTime,
    lines,
    toDateInput
  });
  global.YunheTaxonomy = Object.freeze({
    canonicalTopic,
    classifyContent,
    detectTopic,
    groups: taxonomyGroups,
    populateTopicSelect
  });
})(window);
