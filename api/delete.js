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

    const { id, password } = data || {};

    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({
        success: false,
        error: "ADMIN_PASSWORD is not configured"
      });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
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
