const { createClient } = require("@supabase/supabase-js");

function checkAdmin(adminName, password) {
  if (!adminName || !password) {
    return {
      ok: false,
      status: 400,
      error: "请填写数据管理员名称和密码"
    };
  }

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

    const {
      id,
      title,
      intro,
      topic,
      body,
      adminName,
      password
    } = data || {};

    const auth = checkAdmin(adminName, password);

    if (!auth.ok) {
      return res.status(auth.status).json({
        success: false,
        error: auth.error
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Vercel 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请确认它们已添加到 Production 环境并重新部署"
      });
    }

    if (!id || !title || !body) {
      return res.status(400).json({
        success: false,
        error: "缺少文章 ID、标题或正文"
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: updatedRows, error } = await supabase
      .from("contents")
      .update({
        title,
        intro: intro || "",
        topic: topic || "未分类",
        body
      })
      .eq("id", id)
      .select("id,title,slug,intro,body,type,topic,created_at");

    if (error) {
      return res.status(500).json({
        success: false,
        error
      });
    }

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Supabase 没有找到 ID 为 ${id} 的文章，所以没有保存修改`
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedRows[0]
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
