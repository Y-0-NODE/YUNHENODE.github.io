const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

const ALLOWED_TEMPLATES = new Set(["A", "B", "C", "D", "E", "X"]);
const ALLOWED_LEVELS = new Set(["Observation", "Analysis", "Decision", "Validation", "Method"]);

function cleanBody(body) {
  return String(body || "").replace(/\n*<!--yunhe-meta:[\s\S]*?-->\s*$/m, "").trim();
}

function readMeta(body) {
  const match = String(body || "").match(/<!--yunhe-meta:([\s\S]*?)-->\s*$/m);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    return {};
  }
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
  return [...new Set([...supplied, topic, type, `Template ${template}`, title]
    .map(item => String(item || "").trim()).filter(Boolean))].slice(0, 12);
}

function inferCoverImage(body) {
  const text = cleanBody(body);
  const yunheMedia = text.match(/\[图片(?::\s*[^\]]+)?\]\((https?:\/\/[^)]+)\)/);
  if (yunheMedia) return yunheMedia[1];
  const markdownImage = text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  return markdownImage ? markdownImage[1] : "";
}

function buildMeta(body, data, current, previous) {
  const requestedTemplate = String(data?.template || previous.template || "").toUpperCase();
  const requestedLevel = String(data?.knowledgeLevel || data?.knowledge_level || previous.knowledge_level || "");
  const template = /^[A-Z][A-Z0-9]{0,2}$/.test(requestedTemplate) ? requestedTemplate : defaultTemplate(current.type);
  const knowledgeLevel = ALLOWED_LEVELS.has(requestedLevel) ? requestedLevel : "Observation";
  const summary = String(data?.intro || data?.subtitle || previous.summary || cleanBody(body).slice(0, 160)).trim();
  const updatedAt = new Date().toISOString();

  return {
    ...previous,
    id: previous.id || `YH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    template,
    title: current.title,
    slug: current.slug,
    summary,
    topic: current.topic,
    type: current.type,
    knowledge_level: knowledgeLevel,
    archive: String(data?.archive || previous.archive || "未分类档案"),
    status: String(data?.status || previous.status || "Published"),
    visibility: String(data?.visibility || previous.visibility || "Public"),
    keywords: normalizeKeywords(data?.keywords || previous.keywords, current.title, current.topic, current.type, template),
    author: String(data?.author || previous.author || "Yunhe"),
    language: String(data?.language || previous.language || "zh-CN"),
    created_at: previous.created_at || current.createdAt || updatedAt,
    updated_at: updatedAt,
    version: String(data?.version || previous.version || "v1.0"),
    related_documents: Array.isArray(data?.relatedDocuments) ? data.relatedDocuments : (previous.related_documents || []),
    cover_image: String(data?.coverImage || previous.cover_image || inferCoverImage(body)),
    seo_title: String(data?.seoTitle || previous.seo_title || current.title),
    seo_description: String(data?.seoDescription || previous.seo_description || summary).slice(0, 200),
    subtitle: String(data?.subtitle || previous.subtitle || "").trim(),
    originalDate: String(data?.originalDate || previous.originalDate || "").trim(),
    source: inferSource(body, data?.source || previous.source)
  };
}

function withMeta(body, meta) {
  return `${cleanBody(body)}\n\n<!--yunhe-meta:${JSON.stringify(meta)}-->`;
}

function shouldEmbedMeta(type) {
  return type !== "thought" && type !== "thought_profile";
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

    const { id, title, intro, topic, body } = data || {};
    if (!id || !title || !body) {
      return res.status(400).json({ success: false, error: "缺少文章 ID、标题或正文" });
    }

    const currentRows = await supabaseRequest(
      `/rest/v1/contents?id=eq.${encodeURIComponent(id)}&select=body,type,slug,created_at`,
      { method: "GET" }
    ).catch(() => []);

    const stored = currentRows?.[0] || {};
    const contentType = String(stored.type || data?.type || "article");
    const nextTopic = String(topic || "未分类");
    const nextIntro = String(intro || data?.subtitle || "").trim();
    const plainBody = cleanBody(body);
    const previous = readMeta(stored.body || "");
    const meta = buildMeta(plainBody, data, {
      title: String(title).trim(),
      slug: stored.slug || previous.slug || "",
      topic: nextTopic,
      type: contentType,
      createdAt: stored.created_at || previous.created_at || ""
    }, previous);
    const nextBody = shouldEmbedMeta(contentType) ? withMeta(plainBody, meta) : plainBody;

    const updatedRows = await supabaseRequest(
      `/rest/v1/contents?id=eq.${encodeURIComponent(id)}&select=id,title,slug,intro,body,type,topic,created_at`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          title: String(title).trim(),
          intro: nextIntro,
          topic: nextTopic,
          body: nextBody
        })
      }
    );

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Supabase 没有找到 ID 为 ${id} 的文章，所以没有保存修改`
      });
    }

    return res.status(200).json({ success: true, data: updatedRows[0] });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
