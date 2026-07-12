const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");

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

    if (!body?.id) {
      return res.status(400).json({ success: false, error: "缺少作品 ID" });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (body?.action === "delete") {
      const existing = await supabase
        .from("media_items")
        .select("*")
        .eq("id", body.id)
        .maybeSingle();

      if (existing.error) {
        return res.status(500).json({
          success: false,
          error: existing.error.message || "读取作品失败",
          detail: existing.error.details || existing.error.hint || null
        });
      }

      if (!existing.data) {
        return res.status(404).json({ success: false, error: "没有找到这个作品，可能已经删除。" });
      }

      const deleted = await supabase
        .from("media_items")
        .delete()
        .eq("id", body.id)
        .select("*")
        .maybeSingle();

      if (deleted.error) {
        return res.status(500).json({
          success: false,
          error: deleted.error.message || "作品删除失败",
          detail: deleted.error.details || deleted.error.hint || null
        });
      }

      let storageWarning = null;
      if (existing.data.path) {
        const removed = await supabase.storage.from("media").remove([existing.data.path]);
        if (removed.error) {
          storageWarning = removed.error.message || "作品记录已删除，但图片文件清理失败。";
        }
      }

      return res.status(200).json({
        success: true,
        data: deleted.data || existing.data,
        storageWarning
      });
    }

    const next = {
      title: body?.title || "未命名作品",
      description: body?.description || "",
      shot_at: body?.shot_at || null,
      updated_at: new Date().toISOString()
    };

    let result = await supabase
      .from("media_items")
      .update(next)
      .eq("id", body.id)
      .select("*")
      .maybeSingle();

    if (result.error && /shot_at|column|schema cache/i.test(result.error.message || "")) {
      const fallback = {
        title: next.title,
        description: next.description,
        updated_at: next.updated_at
      };
      result = await supabase
        .from("media_items")
        .update(fallback)
        .eq("id", body.id)
        .select("*")
        .maybeSingle();
    }

    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error.message || "作品保存失败",
        detail: result.error.details || result.error.hint || null
      });
    }

    return res.status(200).json({ success: true, data: result.data || null });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
