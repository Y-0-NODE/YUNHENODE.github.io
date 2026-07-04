const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

function explainWechatError(message = "") {
  if (message.includes("invalid appid")) {
    return "微信返回 invalid appid：WECHAT_APP_ID 不是公众号后台真正的 AppID。";
  }

  if (message.includes("invalid ip")) {
    return "微信返回 invalid ip：这台中转服务器的公网 IP 还没有加入公众号后台 IP 白名单。";
  }

  if (message.includes("invalid appsecret") || message.includes("secret")) {
    return "微信返回 AppSecret 错误：请重新复制公众号后台的 AppSecret。";
  }

  return message;
}

function requireProxySecret(req, res, next) {
  const expected = process.env.WECHAT_PROXY_SECRET;
  const received = req.headers["x-yunhe-proxy-secret"];

  if (!expected) {
    return res.status(500).json({ success: false, error: "中转服务器缺少 WECHAT_PROXY_SECRET" });
  }

  if (received !== expected) {
    return res.status(401).json({ success: false, error: "中转服务器密码错误" });
  }

  next();
}

async function getAccessToken() {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("中转服务器缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET");
  }

  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(explainWechatError(data.errmsg || "获取微信公众号 access_token 失败"));
  }

  return data.access_token;
}

app.get("/health", (req, res) => {
  res.json({ success: true, message: "yunhe wechat proxy ok" });
});

app.post("/wechat/materials", requireProxySecret, async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: req.body?.type || "news",
        offset: Number(req.body?.offset || 0),
        count: Number(req.body?.count || 20)
      })
    });

    const data = await response.json();

    if (!response.ok || data.errcode) {
      throw new Error(explainWechatError(data.errmsg || "读取微信公众号图文素材失败"));
    }

    res.json({
      success: true,
      total_count: data.total_count || 0,
      item_count: data.item_count || 0,
      items: Array.isArray(data.item) ? data.item : []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Yunhe WeChat proxy listening on ${port}`);
});
