(function defineContentModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.YunheContentModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createContentModel() {
  "use strict";

  const CONTENT_TYPES = Object.freeze([
    "article",
    "case",
    "video",
    "thought",
    "knowledge_card"
  ]);
  const LIFECYCLES = Object.freeze(["published", "private", "archived"]);

  function baseType(type) {
    return String(type || "article").replace(/_(private|archived)$/, "");
  }

  function lifecycleOf(content) {
    const type = String(content?.type || "article");
    if (type.endsWith("_private")) return "private";
    if (type.endsWith("_archived")) return "archived";
    if (baseType(type) === "thought" && content?.topic !== "public") {
      return LIFECYCLES.includes(content?.topic) ? content.topic : "private";
    }
    return "published";
  }

  function typeForLifecycle(type, lifecycle) {
    const base = baseType(type);
    const next = LIFECYCLES.includes(lifecycle) ? lifecycle : "published";
    return next === "published" ? base : `${base}_${next}`;
  }

  function normalizeContent(row, metadata = {}) {
    const content = row || {};
    return {
      id: content.id ?? null,
      slug: String(content.slug || metadata.slug || ""),
      type: baseType(content.type || metadata.type),
      lifecycle: lifecycleOf(content),
      title: String(content.title || metadata.title || "未命名内容"),
      summary: String(content.intro || metadata.summary || ""),
      body: String(content.body || ""),
      topic: String(content.topic || metadata.topic || "未分类"),
      createdAt: content.created_at || metadata.created_at || null,
      updatedAt: metadata.updated_at || content.updated_at || null,
      metadata
    };
  }

  return Object.freeze({
    CONTENT_TYPES,
    LIFECYCLES,
    baseType,
    lifecycleOf,
    normalizeContent,
    typeForLifecycle
  });
});
