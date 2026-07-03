const { createClient } = require("@supabase/supabase-js");

const DELETE_API_VERSION = "delete-api-2026-07-03-check-after-delete-v2";

function checkAdmin(adminName, password) {
  if (!adminName || !password) {
    return {
      ok: false,
      status: 400,
      error: "请填写数据管理员名称和密码"
    };
  }

  // 你在 Vercel 里新增的环境变量名就是管理员名称。
  // 例如：环境变量名 YUNHE，值是密码；页面登录时名称填 YUNHE。
  const passwordFromNamedVariable = process.env[adminName];
  const fallbackPassword = process.env.PUBLISH_PASSWORD;
  const expectedPassword = passwordFromNamedVariable || fallbackPassword;

  if (!expectedPassword) {
    return {
      ok: false,
      status: 500,
      error: `Vercel 里没有找到名为 ${adminName} 的环境变量，也没有找到 PUBLISH_PASSWORD`
    };
  }

  if (password !== expectedPassword) {
    return {
      ok: false,
      status: 401,
      error: "数据管理员名称或密码错误"
    };
  }

  return { ok: true };
}

async function findArticle(supabase, { id, slug, title }) {
  if (id) {
    const { data, error } = await supabase
      .from("contents")
      .select("id,title,slug")
      .eq("id", id)
      .limit(1);

    if (error) return { error };
    if (data && data.length === 1) return { article: data[0], matchedBy: "id" };
  }

  if (slug) {
    const { data, error } = await supabase
      .from("contents")
      .select("id,title,slug")
      .eq("slug", slug)
      .limit(2);

    if (error) return { error };
    if (data && data.length === 1) return { article: data[0], matchedBy: "slug" };
  }

  if (title) {
    const { data, error } = await supabase
      .from("contents")
      .select("id,title,slug")
      .eq("type", "article")
      .eq("title", title)
      .limit(2);

    if (error) return { error };
    if (data && data.length === 1) return { article: data[0], matchedBy: "title" };
    if (data && data.length > 1) {
      return {
        error: {
          message: `找到多篇标题同为「${title}」的文章，为避免误删，请刷新管理页后再删除`
        }
      };
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
      message: "这是删除接口版本检查。看到 check-after-delete-v2 才说明 GitHub/Vercel 已经更新到新版。"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Only POST allowed"
    });
  }

  try {
    const data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { id, slug, title, adminName, password } = data || {};
    const auth = checkAdmin(adminName, password);

    if (!auth.ok) {
      return res.status(auth.status).json({
        success: false,
        error: auth.error
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "缺少文章 ID"
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Vercel 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请确认它们已添加到 Production 环境并重新部署"
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const found = await findArticle(supabase, { id, slug, title });

    if (found.error) {
      return res.status(500).json({
        success: false,
        error: found.error.message || found.error
      });
    }

    if (!found.article) {
      return res.status(404).json({
        success: false,
        error: `Supabase 没有找到这篇文章。页面传来的信息是：ID=${id || "空"}，slug=${slug || "空"}，标题=${title || "空"}。请重新登录管理页刷新列表后再试。`
      });
    }

    const { error } = await supabase
      .from("contents")
      .delete()
      .eq("id", found.article.id);

    if (error) {
      return res.status(500).json({
        success: false,
        error
      });
    }

    const { data: remainingRows, error: verifyError } = await supabase
      .from("contents")
      .select("id")
      .eq("id", found.article.id)
      .limit(1);

    if (verifyError) {
      return res.status(500).json({
        success: false,
        error: verifyError.message || verifyError
      });
    }

    if (remainingRows && remainingRows.length > 0) {
      return res.status(500).json({
        success: false,
        error: `已经找到文章「${found.article.title}」，但删除后它仍然存在。请检查 SUPABASE_SERVICE_ROLE_KEY 是否真的是 service_role 密钥。`
      });
    }

    return res.status(200).json({
      success: true,
      id: found.article.id,
      matchedBy: found.matchedBy,
      deleted: {
        id: found.article.id,
        title: found.article.title
      }
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
