const { checkAdmin, requireSupabaseEnv } = require("./_auth");

function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function onlyMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.status(405).json({ success: false, error: `Only ${methods.join(" / ")} allowed` });
  return false;
}

function requireAdmin(body, res) {
  const auth = checkAdmin(body?.adminName, body?.password);
  if (!auth.ok) {
    res.status(auth.status).json({ success: false, error: auth.error });
    return false;
  }
  return true;
}

function requireEnvironment(res) {
  const env = requireSupabaseEnv();
  if (!env.ok) {
    res.status(env.status).json({ success: false, error: env.error });
    return false;
  }
  return true;
}

function failure(res, error, status = 500) {
  return res.status(status).json({
    success: false,
    error: error?.message || String(error),
    detail: error?.data || error?.details || error?.hint || null
  });
}

module.exports = { failure, onlyMethods, parseBody, requireAdmin, requireEnvironment };
