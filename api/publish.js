const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

const ALLOWED_TEMPLATES = new Set(["A", "B", "C", "D", "E", "X"]);
const ALLOWED_LEVELS = new Set(["Observation", "Analysis", "Decision", "Validation", "Method"]);

function makeSlug(title) {
  return String(title || "content")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "")
    .slice(0, 80) + "-" + Date.now();
}

function cleanBody(body) {
  return String(body || "").replace(/\n*<!--yunhe-meta:[\s\S]*?-->\s*$/m, "").trim();
}

function inferSource(body, source) {
  const text = cleanBody(body);
  if (/原文链接[：:]\s*https?:\/\/mp\.weixin\.qq\.com\//.test(text)) {
    return "云鹤系统公众号转载";
  }
  return String(source || "").trim() || "本站撰写";
}

function defaultTemplate(type) {
  if (type === "case") return "A";
  if (type === "video" || type === "image") return "E";
  if (type === "thought") return "C";
  return "X";
}

function normalizeKeywords(value, title, topic, type, template) {
  const supplied = Array.isArray(value)
    ? value
    : String(value || "").split(/[，,]/);
  return [...new Set([
    ...supplied,
    topic,
    type,
    `Template ${template}`,
    title
  ].map(item => String(item || "").trim()).filter(Boolean))].slice(0, 12);
}

function inferCoverImage(body) {
  const text = cleanBody(body);
  const yunheMedia = text.match(/\[图片(?::\s*[^\]]+)?\]\((https?:\/\/[^)]+)\)/);
  if (yunheMedia) return yunheMedia[1];
  const markdownImage = text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  return markdownImage ? markdownImage[1] : "";
}

function buildMeta(body, data, system) {
  const templateValue = String(data?.template || "").toUpperCase();
  const levelValue = String(data?.knowledgeLevel || data?.knowledge_level || "");
  const template = /^[A-Z][A-Z0-9]{0,2}$/.test(templateValue) ? templateValue : defaultTemplate(system.type);
  const knowledgeLevel = ALLOWED_LEVELS.has(levelValue) ? levelValue : "Observation";
  const summary = String(data?.intro || data?.subtitle || cleanBody(body).slice(0, 160)).trim();

  return {
    id: `YH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    template,
    title: system.title,
    slug: system.slug,
    summary,
    topic: system.topic,
    type: system.type,
    knowledge_level: knowledgeLevel,
    archive: String(data?.archive || "未分类档案"),
    status: String(data?.status || "Published"),
    visibility: String(data?.visibility || "Public"),
    keywords: normalizeKeywords(data?.keywords, system.title, system.topic, system.type, template),
    author: String(data?.author || "Yunhe"),
    language: String(data?.language || "zh-CN"),
    created_at: system.createdAt,
    updated_at: system.createdAt,
    version: String(data?.version || "v1.0"),
    related_documents: Array.isArray(data?.relatedDocuments) ? data.relatedDocuments : [],
    collections: Array.isArray(data?.collections) ? data.collections : [],
    media_files: Array.isArray(data?.mediaFiles) ? data.mediaFiles : [],
    cover_image: String(data?.coverImage || inferCoverImage(body)),
    seo_title: String(data?.seoTitle || system.title),
    seo_description: String(data?.seoDescription || summary).slice(0, 200),
    subtitle: String(data?.subtitle || "").trim(),
    originalDate: String(data?.originalDate || "").trim(),
    source: inferSource(body, data?.source)
  };
}

function withMeta(body, meta) {
  return `${cleanBody(body)}\n\n<!--yunhe-meta:${JSON.stringify(meta)}-->`;
}

function shouldEmbedMeta(type) {
  return type !== "thought_profile";
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(data?.adminName, data?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    const title = String(data?.title || "").trim();
    const plainBody = cleanBody(data?.body);
    const contentType = String(data?.type || "article").trim();
    const topic = String(data?.topic || "未分类").trim();
    const intro = String(data?.intro || data?.subtitle || "").trim();

    if (!title || !plainBody) {
      return res.status(400).json({ success: false, error: "标题和正文不能为空" });
    }

    const slug = makeSlug(title);
    const createdAt = new Date().toISOString();
    const meta = buildMeta(plainBody, data, {
      title,
      slug,
      topic,
      type: contentType,
      createdAt
    });
    const body = shouldEmbedMeta(contentType) ? withMeta(plainBody, meta) : plainBody;

    const inserted = await supabaseRequest("/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title,
        intro,
        body,
        video: data?.video || "",
        type: contentType,
        topic,
        slug,
        created_at: createdAt
      })
    });

    return res.status(200).json({
      success: true,
      message: "发布成功",
      slug,
      url: `/content.html?slug=${slug}`,
      data: inserted?.[0] || null
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
