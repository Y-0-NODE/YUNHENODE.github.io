const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");

const TABLES = ["contents", "diary_entries", "media_items", "content_backups"];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ success:false, error:"Only POST allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(body?.adminName, body?.password);
    if (!auth.ok) return res.status(auth.status).json({ success:false, error:auth.error });
    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success:false, error:env.error });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (body?.action === "history") {
      const { data, error } = await supabase.from("content_backups").select("*").order("created_at", { ascending:false }).limit(100);
      if (error) throw error;
      return res.status(200).json({ success:true, data:data || [] });
    }

    if (body?.action === "restore-version") {
      const snapshot = body?.snapshot;
      if (!snapshot || typeof snapshot !== "object") return res.status(400).json({ success:false, error:"缺少可恢复的内容快照" });
      const { error } = await supabase.from("contents").upsert(snapshot, { onConflict:"id" });
      if (error) throw error;
      return res.status(200).json({ success:true, message:"内容版本已恢复" });
    }

    if (body?.action === "restore-backup") {
      const tables = body?.backup?.tables;
      if (!tables || typeof tables !== "object") return res.status(400).json({ success:false, error:"备份文件格式不正确" });
      const restored = {};
      for (const table of TABLES) {
        const rows = Array.isArray(tables?.[table]?.data) ? tables[table].data : [];
        if (!rows.length) { restored[table] = 0; continue; }
        const { error } = await supabase.from(table).upsert(rows);
        if (error) throw new Error(`${table}: ${error.message}`);
        restored[table] = rows.length;
      }
      return res.status(200).json({ success:true, restored });
    }

    const backup = { exportedAt:new Date().toISOString(), schemaVersion:"yunhe-backup-v2", tables:{} };
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      backup.tables[table] = error ? { error:error.message || String(error), data:[] } : { data:data || [] };
    }
    return res.status(200).json({ success:true, backup });
  } catch (error) {
    return res.status(500).json({ success:false, error:error.message });
  }
};
