const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("./_auth");

function requireWechatEnv() {
  if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET) {
    return {
      ok: false,
      status: 500,
      error: "Vercel 缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET。需要先登录微信公众平台复制 AppID 和 AppSecret。"
    };
  }

  return { ok: true };
}

function explainWechatError(message = "") {
  if (message.includes("invalid appid")) {
    return "微信返回 invalid appid：Vercel 里的 WECHAT_APP_ID 不是公众号后台真正的 AppID。注意 gh_29c8bc4a87bf 是公众号原始 ID，不是 AppID。请登录微信公众平台，在“设置与开发 -> 基本配置”复制 AppID 到 WECHAT_APP_ID。";
  }

  if (message.includes("invalid appsecret") || message.includes("secret")) {
    return "微信返回 AppSecret 错误：请登录微信公众平台，在“设置与开发 -> 基本配置”重新复制 AppSecret 到 WECHAT_APP_SECRET，并重新部署 Vercel。";
  }

  return message;
}

function classifyArticle(title = "", digest = "") {
  const text = `${title} ${digest}`;
  const rules = [
    ["平台", ["平台", "规则", "算法", "流量", "账号", "系统"]],
    ["品牌", ["品牌", "商业", "产品", "公司", "消费"]],
    ["城市", ["城市", "街区", "公共", "空间", "交通"]],
    ["组织", ["组织", "岗位", "公司", "管理", "协作"]],
    ["艺术", ["艺术", "摄影", "影像", "作品", "图像"]],
    ["梦境", ["梦", "梦境", "潜意识"]],
    ["日记", ["日记", "记录", "随笔", "私人"]]
  ];

  for (const [topic, words] of rules) {
    if (words.some((word) => text.includes(word))) {
      return { category: topic, topic, ai_summary: `按关键词自动归类为「${topic}」。` };
    }
  }

  return { category: "未分类", topic: "未分类", ai_summary: "暂未识别到明确分类。" };
}

async function getAccessToken() {
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", process.env.WECHAT_APP_ID);
  url.searchParams.set("secret", process.env.WECHAT_APP_SECRET);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(explainWechatError(data.errmsg || "获取微信公众号 access_token 失败"));
  }

  return data.access_token;
}

async function fetchNewsMaterials(accessToken) {
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "news",
      offset: 0,
      count: 20
    })
  });

  const data = await response.json();

  if (!response.ok || data.errcode) {
    throw new Error(explainWechatError(data.errmsg || "读取微信公众号图文素材失败"));
  }

  return Array.isArray(data.item) ? data.item : [];
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(body?.adminName, body?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    const wechatEnv = requireWechatEnv();
    if (!wechatEnv.ok) return res.status(wechatEnv.status).json({ success: false, error: wechatEnv.error });

    const accessToken = await getAccessToken();
    const materials = await fetchNewsMaterials(accessToken);
    const rows = [];

    materials.forEach((material) => {
      const newsItems = material.content?.news_item || [];

      newsItems.forEach((item, index) => {
        const classification = classifyArticle(item.title, item.digest);
        rows.push({
          wechat_article_key: `${material.media_id}:${index}`,
          account_id: process.env.WECHAT_ACCOUNT_ID || "gh_29c8bc4a87bf",
          media_id: material.media_id,
          title: item.title || "未命名公众号文章",
          digest: item.digest || "",
          author: item.author || "",
          content_url: item.url || "",
          source_url: item.content_source_url || "",
          thumb_media_id: item.thumb_media_id || "",
          category: classification.category,
          topic: classification.topic,
          ai_summary: classification.ai_summary,
          status: "imported",
          raw: item,
          updated_at: new Date().toISOString()
        });
      });
    });

    if (!rows.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("wechat_articles")
      .upsert(rows, { onConflict: "wechat_article_key" })
      .select("id,title,category,topic,status");

    if (error) return res.status(500).json({ success: false, error: error.message || error });

    return res.status(200).json({ success: true, count: data?.length || rows.length, data: data || [] });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
