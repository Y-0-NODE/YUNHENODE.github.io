const { supabaseRequest } = require("../lib/_supabase-rest");
const {
  failure,
  onlyMethods,
  parseBody,
  requireAdmin,
  requireEnvironment
} = require("../lib/api-handler");
const { buildMetadata, makeSlug, metadata } = require("../lib/content-metadata");
const { saveContentMetadata } = require("../lib/metadata-repository");

module.exports = async function publishContent(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!onlyMethods(req, res, ["POST"])) return;

  try {
    const input = parseBody(req);
    if (!requireAdmin(input, res) || !requireEnvironment(res)) return;

    const title = String(input.title || "").trim();
    const plainBody = metadata.strip(input.body);
    const type = String(input.type || "article").trim();
    const topic = String(input.topic || "未分类").trim();
    const intro = String(input.intro || input.subtitle || "").trim();
    if (!title || !plainBody)
      return res.status(400).json({ success: false, error: "标题和正文不能为空" });

    const slug = makeSlug(title);
    const createdAt = new Date().toISOString();
    const contentMetadata = buildMetadata(plainBody, input, {
      title,
      slug,
      topic,
      type,
      createdAt
    });
    const body =
      type === "thought_profile" ? plainBody : metadata.append(plainBody, contentMetadata);
    const inserted = await supabaseRequest(
      "/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          title,
          intro,
          body,
          video: input.video || "",
          type,
          topic,
          slug,
          created_at: createdAt
        })
      }
    );
    await saveContentMetadata(inserted?.[0]?.id, contentMetadata);

    return res.status(200).json({
      success: true,
      message: "发布成功",
      slug,
      url: `/content.html?slug=${slug}`,
      data: inserted?.[0] || null
    });
  } catch (error) {
    return failure(res, error);
  }
};
