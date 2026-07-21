const { supabaseRequest } = require("../_supabase-rest");
const contentModel = require("../../shared/content-model");

const ALLOWED_TYPES = new Set([
  "article",
  "case",
  "video",
  "thought",
  "thought_profile",
  "knowledge_card"
]);

async function listContent(requestedType) {
  const type = ALLOWED_TYPES.has(requestedType) ? requestedType : "article";
  const typeFilter =
    type === "thought" ? `eq.${type}` : `in.(${type},${type}_private,${type}_archived)`;
  const rows = await supabaseRequest(
    `/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at&type=${typeFilter}&order=created_at.desc`
  );
  return (rows || []).map(row => ({
    ...row,
    lifecycle: contentModel.lifecycleOf(row),
    base_type: contentModel.baseType(row.type || type)
  }));
}

module.exports = { listContent };
