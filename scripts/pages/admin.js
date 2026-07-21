(function initializeAdminKnowledgeCards() {
  "use strict";

  const form = document.getElementById("knowledge-card-form");
  if (!form) return;

  const status = document.getElementById("knowledge-card-status");
  const value = id => document.getElementById(id)?.value.trim() || "";
  const lines = id =>
    value(id)
      .split(/[\n，,]/)
      .map(item => item.trim())
      .filter(Boolean);

  const adminInput = document.getElementById("knowledge-card-admin");
  if (adminInput && window.YUNHE_CONFIG?.adminName) {
    adminInput.value = window.YUNHE_CONFIG.adminName;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const title = value("knowledge-card-title");
    const intro = value("knowledge-card-intro");
    const body = value("knowledge-card-body");
    const adminName = value("knowledge-card-admin");
    const password = value("knowledge-card-password");

    if (!adminName || !password || !title || !intro || !body) {
      status.textContent = "请填写管理员信息、标题、核心结论和展开说明。";
      return;
    }

    status.textContent = "正在保存并同步…";
    try {
      const result = await window.YunheApi.post("publish", {
        adminName,
        password,
        title,
        intro,
        body,
        type: "knowledge_card",
        topic: value("knowledge-card-topic") || "知识卡片",
        template: "C",
        knowledgeLevel: "Analysis",
        source: "随笔与知识系统整理",
        collections: ["知识卡片"],
        relatedDocuments: lines("knowledge-card-related"),
        keywords: [title, value("knowledge-card-topic"), "知识卡片"].filter(Boolean)
      });

      form.reset();
      if (adminInput) adminInput.value = adminName;
      status.textContent = `已保存《${title}》，首站会自动读取这张卡片。`;
      if (result.url) {
        const link = document.createElement("a");
        link.href = result.url;
        link.textContent = " 查看卡片";
        link.style.color = "#dfe6e1";
        status.append(link);
      }
    } catch (error) {
      status.textContent = `保存失败：${error.message}`;
    }
  });
})();
