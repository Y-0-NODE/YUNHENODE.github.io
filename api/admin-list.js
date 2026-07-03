const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    const { adminName, password } = data || {};
    const auth = checkAdmin(adminName, password);

    if (!auth.ok) {
      return res.status(auth.status).json({
        success: false,
        error: auth.error
      });
    }

    const { data: contents, error } = await supabase
      .from("contents")
      .select("id,title,slug,intro,type,topic,created_at")
      .eq("type", "article")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error
      });
    }

    return res.status(200).json({
      success: true,
      data: contents || []
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
