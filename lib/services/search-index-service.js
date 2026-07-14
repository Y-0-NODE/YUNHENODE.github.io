const { supabaseRequest } = require("../_supabase-rest");
const { getContentMetadataMap } = require("../metadata-repository");
const contentModel = require("../../shared/content-model");
const contentMetadata = require("../../shared/metadata").content;

async function buildSearchIndex() {
  const rows = await supabaseRequest(
    "/rest/v1/contents?select=id,title,slug,intro,body,type,topic,created_at&order=created_at.desc"
  );
  const contents = (rows || []).filter(
    row => !["thought_profile", "system_config"].includes(row.type)
  );
  const independent = await getContentMetadataMap(contents.map(row => row.id));
  return contents.map(row => {
    const legacy = contentMetadata.parse(row.body);
    const metadata = { ...legacy, ...(independent.get(String(row.id)) || {}) };
    return {
      ...row,
      body: contentMetadata.strip(row.body),
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
      template: metadata.template || "",
      knowledge_level: metadata.knowledge_level || "",
      archive: metadata.archive || "",
      related_documents: Array.isArray(metadata.related_documents)
        ? metadata.related_documents
        : [],
      collections: Array.isArray(metadata.collections) ? metadata.collections : [],
      media_files: Array.isArray(metadata.media_files) ? metadata.media_files : [],
      lifecycle: contentModel.lifecycleOf(row),
      seo_title: metadata.seo_title || row.title || "",
      seo_description: metadata.seo_description || row.intro || ""
    };
  });
}

module.exports = { buildSearchIndex };
