const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Only GET allowed" });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      success: false,
      error: "Vercel 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY"
    });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let query = supabase
    .from("media_items")
    .select("id,title,description,kind,url,path,status,created_at,shot_at")
    .order("created_at", { ascending: false });

  let { data, error } = await query.eq("status", "published");

  if (error) {
    const message = `${error.message || ""} ${error.details || ""}`;
    const isColumnMismatch = /column|schema cache|status|path/i.test(message);
    if (!isColumnMismatch) return res.status(500).json({ success: false, error: error.message || error });

    const fallback = await supabase
      .from("media_items")
      .select("id,title,description,kind,url,created_at")
      .order("created_at", { ascending: false });

    data = fallback.data;
    error = fallback.error;
  }

  if (error) return res.status(500).json({ success: false, error: error.message || error });

  const cleaned = (data || []).map(item => ({
    ...item,
    description: String(item.description || "").replace(/\n*<!--yunhe-media-meta:[\s\S]*?-->\s*$/m, "").trim()
  }));
  return res.status(200).json({ success: true, data: cleaned });
};
