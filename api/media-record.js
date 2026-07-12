const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");

async function insertMediaRecord(supabase, payload) {
  const attempts = [
    {
      title: payload.title,
      description: payload.description,
      kind: payload.kind,
      url: payload.url,
      path: payload.path,
      shot_at: payload.shot_at || null,
      status: "published"
    },
    {
      title: payload.title,
      description: payload.description,
      kind: payload.kind,
      url: payload.url,
      path: payload.path
    },
    {
      title: payload.title,
      description: payload.description,
      kind: payload.kind,
      url: payload.url
    }
  ];

  let lastError = null;

  for (const row of attempts) {
    const { data, error } = await supabase
      .from("media_items")
      .insert(row)
      .select("*")
      .maybeSingle();

    if (!error) return { data, error: null };
    lastError = error;

    const message = `${error.message || ""} ${error.details || ""}`;
    const isColumnMismatch = /column|schema cache|status|path|shot_at/i.test(message);
    if (!isColumnMismatch) break;
  }

  return { data: null, error: lastError };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(body?.adminName, body?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });

    if (!body?.url || !body?.path) {
      return res.status(400).json({ success: false, error: "缺少作品文件地址" });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const payload = {
      title: body?.title || body?.fileName || "未命名作品",
      description: body?.description || "",
      kind: body?.kind === "video" ? "video" : "photo",
      url: body.url,
      path: body.path,
      shot_at: body?.shot_at || null
    };
    const { data, error } = await insertMediaRecord(supabase, payload);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message || "作品库记录失败",
        detail: error.details || error.hint || null
      });
    }

    return res.status(200).json({ success: true, data: data || null });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
