module.exports = async function handler(req, res) {
  const names = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "YUNHE",
    "PUBLISH_PASSWORD"
  ];

  const present = {};

  names.forEach((name) => {
    present[name] = Boolean(process.env[name]);
  });

  let supabaseKeyRole = "missing";

  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const payload = key.split(".")[1];

    if (payload) {
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
      supabaseKeyRole = decoded.role || "unknown";
    }
  } catch (e) {
    supabaseKeyRole = "unreadable";
  }

  return res.status(200).json({
    success: true,
    present,
    supabaseKeyRole,
    message: "这里只显示环境变量是否存在，以及 SUPABASE_SERVICE_ROLE_KEY 的角色，不显示任何密码或密钥内容"
  });
};
