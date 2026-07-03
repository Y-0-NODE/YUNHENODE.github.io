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

  return res.status(200).json({
    success: true,
    present,
    message: "这里只显示环境变量是否存在，不显示任何密码或密钥内容"
  });
};
