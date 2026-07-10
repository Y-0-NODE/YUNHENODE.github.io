const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

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
  return String(source || "").trim();
}

function withMeta(body, data, currentBody) {
  const previous = readMeta(currentBody || body);
  const meta = {
    subtitle: String(data?.subtitle || previous.subtitle || "").trim(),
    originalDate: String(data?.originalDate || previous.originalDate || "").trim(),
    source: inferSource(body, data?.source || previous.source) || "本站撰写"
  };
  return `${cleanBody(body)}\n\n<!--yunhe-meta:${JSON.stringify(meta)}-->`;
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

    const currentRows = await supabaseRequest(`/rest/v1/contents?id=eq.${encodeURIComponent(id)}&select=body`, {
      method: "GET"
    }).catch(() => []);
    const bodyWithMeta = withMeta(body, data, currentRows?.[0]?.body || "");
    const nextIntro = String(intro || data?.subtitle || "").trim();

    const updatedRows = await supabaseRequest(`/rest/v1/contents?id=eq.${encodeURIComponent(id)}&select=id,title,slug,intro,body,type,topic,created_at`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title,
        intro: nextIntro,
        topic: topic || "未分类",
        body: bodyWithMeta
      })
    });

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
