const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
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

    const adminPassword =
      process.env.ADMIN_PASSWORD ||
      process.env.PUBLISH_PASSWORD ||
      process.env.SITE_PASSWORD ||
      process.env.PASSWORD;

    const expectedAdminName =
      process.env.DATA_ADMIN_NAME ||
      process.env.ADMIN_NAME ||
      "admin";

    if (!adminPassword) {
      return res.status(500).json({
        success: false,
        error: "管理员密码没有在 Vercel 环境变量里配置"
      });
    }

    if (adminName !== expectedAdminName) {
      return res.status(401).json({
        success: false,
        error: "数据管理员名称错误"
      });
    }

    if (password !== adminPassword) {
      return res.status(401).json({
        success: false,
        error: "管理员密码错误"
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "缺少文章 ID"
      });
    }

    const { error } = await supabase
      .from("contents")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({
        success: false,
        error
      });
    }

    return res.status(200).json({
      success: true,
      id
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
