const { createClient } = require("@supabase/supabase-js");
const { checkAdmin, requireSupabaseEnv } = require("../lib/_auth");
const mediaMetadata = require("../shared/metadata").media;
const { normalizeMediaStatus } = require("../lib/media-model");
const { getMediaMetadataMap, saveMediaMetadata } = require("../lib/metadata-repository");

const clean = mediaMetadata.strip;
const readMeta = mediaMetadata.parse;
const textWithMeta = mediaMetadata.append;
const PAYMENT_SETTINGS_TITLE = "YUNHE_PAYMENT_SETTINGS";
const PAYWALL_PRICES = new Set(["9.9", "19.9", "29.9", "59", "99", "199"]);
async function backup(supabase, row, operation, user) {
  if (!row) return;
  await supabase
    .from("content_backups")
    .insert({ content_id: row.id, operation, snapshot: row, created_by: user });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Only POST allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const auth = checkAdmin(body?.adminName, body?.password);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const env = requireSupabaseEnv();
    if (!env.ok) return res.status(env.status).json({ success: false, error: env.error });
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (body?.action === "admin-list") {
      let q = supabase.from("media_items").select("*").order("created_at", { ascending: false });
      if (body.kind) q = q.eq("kind", body.kind);
      const { data, error } = await q;
      if (error) throw error;
      const independent = await getMediaMetadataMap((data || []).map(item => item.id));
      return res.status(200).json({
        success: true,
        data: (data || [])
          .filter(x => x.title !== PAYMENT_SETTINGS_TITLE)
          .map(x => ({
            ...x,
            description: clean(x.description),
            metadata: {
              ...readMeta(x.description),
              ...(independent.get(String(x.id)) || {})
            }
          }))
      });
    }
    if (!body?.id) return res.status(400).json({ success: false, error: "缺少作品 ID" });
    const found = await supabase.from("media_items").select("*").eq("id", body.id).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return res.status(404).json({ success: false, error: "没有找到这个作品" });
    const current = found.data;
    const currentMetadata = {
      ...readMeta(current.description),
      ...((await getMediaMetadataMap([current.id])).get(String(current.id)) || {})
    };

    if (body.action === "history") {
      const { data, error } = await supabase
        .from("content_backups")
        .select("*")
        .eq("content_id", body.id)
        .like("operation", "media_%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, data: data || [] });
    }
    if (body.action === "restore") {
      const snap = body.snapshot;
      if (!snap) return res.status(400).json({ success: false, error: "缺少历史快照" });
      await backup(supabase, current, "media_before_restore", body.adminName);
      const allowed = {
        title: snap.title,
        description: snap.description,
        url: snap.url,
        path: snap.path,
        kind: snap.kind,
        status: snap.status,
        shot_at: snap.shot_at,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from("media_items")
        .update(allowed)
        .eq("id", body.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      await saveMediaMetadata(data?.id, {
        ...currentMetadata,
        ...readMeta(data?.description)
      });
      return res.status(200).json({ success: true, data });
    }
    if (body.action === "duplicate") {
      let url = current.url,
        path = current.path;
      if (path && !String(path).startsWith("external/")) {
        const dot = path.lastIndexOf("."),
          copyPath = `${dot > 0 ? path.slice(0, dot) : path}-copy-${Date.now()}${dot > 0 ? path.slice(dot) : ""}`;
        const copied = await supabase.storage.from("media").copy(path, copyPath);
        if (copied.error) throw new Error(`复制媒体文件失败：${copied.error.message}`);
        path = copyPath;
        url = supabase.storage.from("media").getPublicUrl(copyPath).data.publicUrl;
      }
      const duplicate = { ...current };
      delete duplicate.id;
      delete duplicate.created_at;
      delete duplicate.updated_at;
      Object.assign(duplicate, {
        title: `${current.title || "未命名作品"}（副本）`,
        url,
        path,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      const { data, error } = await supabase
        .from("media_items")
        .insert(duplicate)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      await saveMediaMetadata(data?.id, currentMetadata);
      return res.status(200).json({ success: true, data });
    }
    await backup(supabase, current, `media_${body.action || "edit"}`, body.adminName);
    if (body.action === "delete") {
      const { error } = await supabase.from("media_items").delete().eq("id", body.id);
      if (error) throw error;
      let storageWarning = null;
      if (current.path && !String(current.path).startsWith("external/")) {
        const removed = await supabase.storage.from("media").remove([current.path]);
        storageWarning = removed.error?.message || null;
      }
      return res.status(200).json({ success: true, storageWarning });
    }
    const oldMeta = currentMetadata,
      meta = { ...oldMeta };
    if (Array.isArray(body.collections)) meta.collections = body.collections;
    if (Array.isArray(body.relatedContent)) meta.related_content = body.relatedContent;
    if (Array.isArray(body.mediaFiles)) meta.media_files = body.mediaFiles;
    if (body.visibility) meta.visibility = body.visibility;
    if (body.paywallEnabled !== undefined || body.paywallPrice !== undefined) {
      const paywallPrice = PAYWALL_PRICES.has(String(body.paywallPrice))
        ? String(body.paywallPrice)
        : PAYWALL_PRICES.has(String(oldMeta.paywall?.price))
          ? String(oldMeta.paywall.price)
          : "9.9";
      meta.paywall = {
        enabled:
          body.paywallEnabled === undefined
            ? Boolean(oldMeta.paywall?.enabled)
            : Boolean(body.paywallEnabled),
        price: paywallPrice
      };
    }
    const patch = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = String(body.title || "未命名作品");
    if (body.description !== undefined || Object.keys(meta).length)
      patch.description = textWithMeta(
        body.description !== undefined ? body.description : clean(current.description),
        meta
      );
    if (body.shot_at !== undefined) patch.shot_at = body.shot_at || null;
    if (body.status !== undefined) patch.status = normalizeMediaStatus(body.status);
    if (body.action === "lifecycle") patch.status = normalizeMediaStatus(body.lifecycle);
    let result = await supabase
      .from("media_items")
      .update(patch)
      .eq("id", body.id)
      .select("*")
      .maybeSingle();
    if (result.error && /shot_at|status|schema cache|column/i.test(result.error.message || "")) {
      delete patch.shot_at;
      delete patch.status;
      result = await supabase
        .from("media_items")
        .update(patch)
        .eq("id", body.id)
        .select("*")
        .maybeSingle();
    }
    if (result.error) throw result.error;
    await saveMediaMetadata(body.id, meta);
    return res.status(200).json({ success: true, data: result.data });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, error: e.message, detail: e.details || e.hint || null });
  }
};
