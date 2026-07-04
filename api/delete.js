const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const { supabaseRequest } = require("../lib/_supabase-rest");

const DELETE_API_VERSION = "delete-api-rest-2026-07-04-v1";

function getSupabaseKeyRole() {
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const payload = key.split(".")[1];
    if (!payload) return "missing-or-not-jwt";

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return decoded.role || "unknown";
  } catch (e) {
    return "unreadable";
  }
}

async function findArticle({ id, slug, title }) {
  if (id) {
    const rows = await supabaseRequest(`/rest/v1/contents?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    if (rows?.length === 1) return { article: rows[0], matchedBy: "id" };
  }

  if (slug) {
    const rows = await supabaseRequest(`/rest/v1/contents?select=*&slug=eq.${encodeURIComponent(slug)}&limit=2`);
    if (rows?.length === 1) return { article: rows[0], matchedBy: "slug" };
  }

  if (title) {
    const rows = await supabaseRequest(`/rest/v1/contents?select=*&type=eq.article&title=eq.${encodeURIComponent(title)}&limit=2`);
    if (rows?.length === 1) return { article: rows[0], matchedBy: "title" };
    if (rows?.length > 1) {
      throw new Error(`找到多篇标题同为「${title}」的文章，为避免误删，请刷新管理页后再删除`);
    }
  }

  return { article: null, matchedBy: null };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      version: DELETE_API_VERSION,
      message: "这是删除接口版本检查。看到 rest-2026-07-04-v1 才说明 GitHub/Vercel 已经更新到新版。"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { id, slug, title, adminName, password } = data || {};
    const auth = checkAdmin(adminName, password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    if (!id) return res.status(400).json({ success: false, error: "缺少文章 ID" });

    const found = await findArticle({ id, slug, title });
    if (!found.article) {
      return res.status(404).json({
        success: false,
        error: `Supabase 没有找到这篇文章。页面传来的信息是：ID=${id || "空"}，slug=${slug || "空"}，标题=${title || "空"}。请重新登录管理页刷新列表后再试。`
      });
    }

    let backupWarning = "";
    try {
      await supabaseRequest("/rest/v1/content_backups", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          content_id: found.article.id,
          operation: "delete",
          snapshot: found.article,
          created_by: adminName
        })
      });
    } catch (backupError) {
      backupWarning = backupError.message || String(backupError);
    }

    await supabaseRequest(`/rest/v1/contents?id=eq.${encodeURIComponent(found.article.id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });

    const remainingRows = await supabaseRequest(`/rest/v1/contents?select=id&id=eq.${encodeURIComponent(found.article.id)}&limit=1`);
    if (remainingRows && remainingRows.length > 0) {
      const role = getSupabaseKeyRole();
      return res.status(500).json({
        success: false,
        supabaseKeyRole: role,
        error: `已经找到文章「${found.article.title}」，但删除后它仍然存在。当前 SUPABASE_SERVICE_ROLE_KEY 角色是「${role}」。它必须拥有删除 contents 的权限。`
      });
    }

    return res.status(200).json({
      success: true,
      id: found.article.id,
      matchedBy: found.matchedBy,
      backupWarning,
      deleted: {
        id: found.article.id,
        title: found.article.title
      }
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
      detail: e.data || null
    });
  }
};
