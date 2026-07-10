const crypto = require("crypto");

const attempts = global.__YUNHE_AUTH_ATTEMPTS__ || new Map();
global.__YUNHE_AUTH_ATTEMPTS__ = attempts;

function attemptKey(adminName) {
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  return `${String(adminName || "unknown").slice(0, 80)}:${bucket}`;
}

function recordFailedAttempt(adminName) {
  const key = attemptKey(adminName);
  const next = (attempts.get(key) || 0) + 1;
  attempts.set(key, next);
  return next;
}

function clearAttempts(adminName) {
  attempts.delete(attemptKey(adminName));
}

function tooManyAttempts(adminName) {
  return (attempts.get(attemptKey(adminName)) || 0) >= 8;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    crypto.timingSafeEqual(Buffer.from("0"), Buffer.from("0"));
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function checkAdmin(adminName, password) {
  if (!adminName || !password) {
    return {
      ok: false,
      status: 400,
      error: "请填写账户名称和密码"
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

  if (tooManyAttempts(adminName)) {
    return {
      ok: false,
      status: 429,
      error: "密码尝试次数过多，请 15 分钟后再试"
    };
  }

  if (!safeEqual(password, expectedPassword)) {
    recordFailedAttempt(adminName);
    return {
      ok: false,
      status: 401,
      error: "账户名称或密码错误"
    };
  }

  clearAttempts(adminName);
  return { ok: true };
}

function requireSupabaseEnv() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      status: 500,
      error: "Vercel 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY"
    };
  }

  return { ok: true };
}

module.exports = {
  checkAdmin,
  requireSupabaseEnv
};
