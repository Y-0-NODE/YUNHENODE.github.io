const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("./_auth");

const TABLES = ["contents", "diary_entries", "media_items", "content_backups"];

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

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const backup = {
      exportedAt: new Date().toISOString(),
      tables: {}
    };

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      backup.tables[table] = error
        ? { error: error.message || String(error), data: [] }
        : { data: data || [] };
    }

    return res.status(200).json({ success: true, backup });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
