const metadata = require("../shared/metadata").content;

const ALLOWED_LEVELS = new Set(["Observation", "Analysis", "Decision", "Validation", "Method"]);
const PAYWALL_PRICES = new Set(["9.9", "19.9", "29.9", "59", "99", "199"]);

function makeSlug(title) {
  return `${String(title || "content")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .slice(0, 80)}-${Date.now()}`;
}

function defaultTemplate(type) {
  if (type === "case") return "A";
  if (["video", "image"].includes(type)) return "E";
  if (type === "thought") return "C";
  return "X";
}

function normalizeKeywords(value, system, template) {
  const supplied = Array.isArray(value) ? value : String(value || "").split(/[，,]/);
  return [
    ...new Set(
      [...supplied, system.topic, system.type, `Template ${template}`, system.title]
        .map(item => String(item || "").trim())
        .filter(Boolean)
    )
  ].slice(0, 12);
}

function inferCoverImage(body) {
  const text = metadata.strip(body);
  const media = text.match(/\[图片(?::\s*[^\]]+)?\]\((https?:\/\/[^)]+)\)/);
  if (media) return media[1];
  return text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/)?.[1] || "";
}

function inferSource(body, source) {
  if (/原文链接[：:]\s*https?:\/\/mp\.weixin\.qq\.com\//.test(metadata.strip(body)))
    return "云鹤系统公众号转载";
  return String(source || "").trim() || "本站撰写";
}

function buildMetadata(body, data, system, previous = {}) {
  const now = new Date().toISOString();
  const templateInput = String(data?.template || previous.template || "").toUpperCase();
  const template = /^[A-Z][A-Z0-9]{0,2}$/.test(templateInput)
    ? templateInput
    : defaultTemplate(system.type);
  const levelInput = String(
    data?.knowledgeLevel || data?.knowledge_level || previous.knowledge_level || ""
  );
  const knowledgeLevel = ALLOWED_LEVELS.has(levelInput) ? levelInput : "Observation";
  const summary = String(
    data?.intro || data?.subtitle || previous.summary || metadata.strip(body).slice(0, 160)
  ).trim();
  const paywallEnabled =
    data?.paywallEnabled === undefined
      ? Boolean(previous.paywall?.enabled)
      : Boolean(data.paywallEnabled);
  const paywallPriceInput = String(data?.paywallPrice || previous.paywall?.price || "9.9");
  const paywallPrice = PAYWALL_PRICES.has(paywallPriceInput) ? paywallPriceInput : "9.9";

  return {
    ...previous,
    id: previous.id || `YH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    template,
    title: system.title,
    slug: system.slug,
    summary,
    topic: system.topic,
    type: system.type,
    knowledge_level: knowledgeLevel,
    archive: String(data?.archive || previous.archive || "未分类档案"),
    status: String(data?.status || previous.status || "Published"),
    visibility: String(data?.visibility || previous.visibility || "Public"),
    keywords: normalizeKeywords(data?.keywords || previous.keywords, system, template),
    author: String(data?.author || previous.author || "Yunhe"),
    language: String(data?.language || previous.language || "zh-CN"),
    created_at: previous.created_at || system.createdAt || now,
    updated_at: now,
    version: String(data?.version || previous.version || "v1.0"),
    related_documents: Array.isArray(data?.relatedDocuments)
      ? data.relatedDocuments
      : previous.related_documents || [],
    collections: Array.isArray(data?.collections) ? data.collections : previous.collections || [],
    media_files: Array.isArray(data?.mediaFiles) ? data.mediaFiles : previous.media_files || [],
    cover_image: String(data?.coverImage || previous.cover_image || inferCoverImage(body)),
    seo_title: String(data?.seoTitle || previous.seo_title || system.title),
    seo_description: String(data?.seoDescription || previous.seo_description || summary).slice(
      0,
      200
    ),
    subtitle: String(data?.subtitle || previous.subtitle || "").trim(),
    originalDate: String(data?.originalDate || previous.originalDate || "").trim(),
    source: inferSource(body, data?.source || previous.source),
    paywall: {
      enabled: paywallEnabled,
      price: paywallPrice
    }
  };
}

module.exports = { buildMetadata, makeSlug, metadata };
