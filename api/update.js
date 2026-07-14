const { supabaseRequest } = require("../lib/_supabase-rest");
const {
  failure,
  onlyMethods,
  parseBody,
  requireAdmin,
  requireEnvironment
} = require("../lib/api-handler");
const { buildMetadata, metadata } = require("../lib/content-metadata");
const contentModel = require("../shared/content-model");
const { saveContentMetadata } = require("../lib/metadata-repository");

async function backup(content, operation, adminName) {
  if (!content?.id) return;
  await supabaseRequest("/rest/v1/content_backups", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      content_id: content.id,
      operation,
      snapshot: content,
      created_by: adminName
    })
  }).catch(() => null);
}

async function updateLifecycle(input, res) {
  const rows = await supabaseRequest(
    `/rest/v1/contents?id=eq.${encodeURIComponent(input.id)}&select=*`
  );
  const current = rows?.[0];
  if (!current) return res.status(404).json({ success: false, error: "没有找到这条内容" });
  const lifecycle = contentModel.LIFECYCLES.includes(input.lifecycle)
    ? input.lifecycle
    : "published";
  await backup(current, `lifecycle_${lifecycle}`, input.adminName);
  const type = contentModel.baseType(current.type);
  const patch =
    type === "thought"
      ? { topic: lifecycle === "published" ? "public" : lifecycle }
      : { type: contentModel.typeForLifecycle(type, lifecycle) };
  const updated = await supabaseRequest(
    `/rest/v1/contents?id=eq.${encodeURIComponent(input.id)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch)
    }
  );
  return res.status(200).json({ success: true, lifecycle, data: updated?.[0] || null });
}

module.exports = async function updateContent(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!onlyMethods(req, res, ["POST"])) return;

  try {
    const input = parseBody(req);
    if (!requireAdmin(input, res) || !requireEnvironment(res)) return;
    if (!input.id) return res.status(400).json({ success: false, error: "缺少内容 ID" });
    if (input.action === "lifecycle") return updateLifecycle(input, res);
    if (!input.title || !input.body)
      return res.status(400).json({ success: false, error: "缺少内容 ID、标题或正文" });

    const rows = await supabaseRequest(
      `/rest/v1/contents?id=eq.${encodeURIComponent(input.id)}&select=*`
    ).catch(() => []);
    const stored = rows?.[0];
    if (!stored)
      return res.status(404).json({ success: false, error: `没有找到 ID 为 ${input.id} 的内容` });

    const type = String(stored.type || input.type || "article");
    const topic = String(input.topic || "未分类");
    const intro = String(input.intro || input.subtitle || "").trim();
    const plainBody = metadata.strip(input.body);
    const previous = metadata.parse(stored.body);
    const nextMetadata = buildMetadata(
      plainBody,
      input,
      {
        title: String(input.title).trim(),
        slug: stored.slug || previous.slug || "",
        topic,
        type,
        createdAt: stored.created_at || previous.created_at || ""
      },
      previous
    );
    const body = type === "thought_profile" ? plainBody : metadata.append(plainBody, nextMetadata);
    await backup(stored, "edit", input.adminName);

    const updated = await supabaseRequest(
      `/rest/v1/contents?id=eq.${encodeURIComponent(input.id)}&select=id,title,slug,intro,body,type,topic,created_at`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ title: String(input.title).trim(), intro, topic, body })
      }
    );
    await saveContentMetadata(input.id, nextMetadata);
    return res.status(200).json({ success: true, data: updated?.[0] || null });
  } catch (error) {
    return failure(res, error);
  }
};
