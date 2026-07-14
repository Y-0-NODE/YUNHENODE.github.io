const SUPABASE_URL = window.YUNHE_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.YUNHE_CONFIG.supabaseKey;

const CATEGORY_GROUPS = [
  {
    name: "人与关系",
    description: "情绪、亲密关系、家庭互动、沟通和个人变化。",
    items: [
      {
        name: "情感与关系",
        aliases: ["情感与关系", "情感", "关系"],
        description: "情绪经验、关系判断与相处方式。"
      },
      {
        name: "亲密关系与家庭",
        aliases: ["亲密关系与家庭", "亲密关系", "家庭"],
        description: "伴侣、家庭边界与长期关系。"
      },
      { name: "沟通与冲突", aliases: ["沟通与冲突"], description: "表达、误解、协商与冲突处理。" },
      { name: "个体成长", aliases: ["个体成长"], description: "自我认识、选择、边界与改变。" }
    ]
  },
  {
    name: "组织与系统",
    description: "组织结构、系统运行、管理协作、平台与技术。",
    items: [
      {
        name: "组织结构",
        aliases: ["组织结构", "组织"],
        description: "角色、权责、流程与组织关系。"
      },
      { name: "系统机制", aliases: ["系统机制"], description: "系统如何形成、运行、失效与修复。" },
      {
        name: "管理与协作",
        aliases: ["管理与协作"],
        description: "决策、执行、团队协同与管理实践。"
      },
      {
        name: "平台与技术",
        aliases: ["平台与技术", "平台", "技术"],
        description: "平台机制、数字工具与技术变化。"
      }
    ]
  },
  {
    name: "社会与现实",
    description: "社会现象、城市空间、消费生活与商业品牌。",
    items: [
      { name: "社会观察", aliases: ["社会观察"], description: "现实事件、群体行为与社会变化。" },
      {
        name: "城市与空间",
        aliases: ["城市与空间", "城市", "空间"],
        description: "城市经验、公共空间与地方关系。"
      },
      {
        name: "消费与生活",
        aliases: ["消费与生活", "消费"],
        description: "消费选择、日常生活与体验判断。"
      },
      {
        name: "商业与品牌",
        aliases: ["商业与品牌", "品牌"],
        description: "品牌表达、商业模式与市场关系。"
      }
    ]
  },
  {
    name: "创作与内在",
    description: "艺术创作、思考方法、梦境与内在经验。",
    items: [
      {
        name: "艺术与创作",
        aliases: ["艺术与创作", "艺术"],
        description: "视觉、影像、表达与创作过程。"
      },
      {
        name: "方法与思考",
        aliases: ["方法与思考"],
        description: "分析框架、研究方法与认知整理。"
      },
      {
        name: "梦境与潜意识",
        aliases: ["梦境与潜意识", "梦境"],
        description: "梦境记录、象征与潜意识体验。"
      },
      { name: "未分类", aliases: ["未分类", ""], description: "暂时还未确定主题的文章。" }
    ]
  }
];

const escapeHtml = window.YunheUtils.escapeHtml;

async function loadCategories() {
  const status = document.getElementById("status");
  const box = document.getElementById("category-list");
  try {
    const query = "select=topic&type=eq.article&order=created_at.desc";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contents?${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error("load failed");
    const articles = await res.json();
    const list = Array.isArray(articles) ? articles : [];

    box.innerHTML = CATEGORY_GROUPS.map(
      group => `
      <section class="category-section">
        <div class="category-head">
          <h2>${escapeHtml(group.name)}</h2>
          <p>${escapeHtml(group.description)}</p>
        </div>
        <div class="category-grid">
          ${group.items
            .map(item => {
              const count = list.filter(article =>
                item.aliases.includes(String(article.topic || "未分类"))
              ).length;
              return `
              <a class="category-card" href="article-topic.html?topic=${encodeURIComponent(item.name)}">
                <span>${count} 篇文章</span>
                <div>
                  <h3>${escapeHtml(item.name)}</h3>
                  <p>${escapeHtml(item.description)}</p>
                </div>
              </a>
            `;
            })
            .join("")}
        </div>
      </section>
    `
    ).join("");

    status.textContent = list.length
      ? `共读取 ${list.length} 篇公开文章。旧分类已自动归入新的主题。`
      : "目前还没有公开文章，可以先浏览分类结构。";
  } catch (e) {
    status.textContent = "文章分类加载失败，请检查 Supabase 配置。";
  }
}

loadCategories();
