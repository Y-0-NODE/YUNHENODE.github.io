const { createClient } = require("@supabase/supabase-js");

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

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

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

    const { id, adminName, password } = data || {};
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

    const { data: deletedRows, error } = await supabase
      .from("contents")
      .delete()
      .eq("id", id)
      .select("id,title");

    if (error) {
      return res.status(500).json({
        success: false,
        error
      });
    }

    if (!deletedRows || deletedRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Supabase 没有找到 ID 为 ${id} 的文章，所以没有删除任何内容`
      });
    }

    return res.status(200).json({
      success: true,
      id,
      deleted: deletedRows[0]
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
