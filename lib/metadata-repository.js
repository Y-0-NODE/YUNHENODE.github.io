const { supabaseRequest } = require("./_supabase-rest");

async function saveContentMetadata(contentId, metadata) {
  if (!contentId || !metadata) return false;
  try {
    await supabaseRequest("/rest/v1/content_metadata?on_conflict=content_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        content_id: contentId,
        data: metadata,
        updated_at: new Date().toISOString()
      })
    });
    return true;
  } catch (error) {
    // Compatibility: existing deployments continue using the embedded legacy tail
    // until the metadata migration has been run in Supabase.
    return false;
  }
}

async function getContentMetadataMap(contentIds) {
  const ids = [...new Set((contentIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const rows = await supabaseRequest(
      `/rest/v1/content_metadata?content_id=in.(${ids.map(encodeURIComponent).join(",")})&select=content_id,data`
    );
    return new Map((rows || []).map(row => [String(row.content_id), row.data || {}]));
  } catch (error) {
    return new Map();
  }
}

async function saveMediaMetadata(mediaId, metadata) {
  if (!mediaId || !metadata) return false;
  try {
    await supabaseRequest("/rest/v1/media_metadata?on_conflict=media_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        media_id: mediaId,
        data: metadata,
        updated_at: new Date().toISOString()
      })
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function getMediaMetadataMap(mediaIds) {
  const ids = [...new Set((mediaIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const rows = await supabaseRequest(
      `/rest/v1/media_metadata?media_id=in.(${ids.map(encodeURIComponent).join(",")})&select=media_id,data`
    );
    return new Map((rows || []).map(row => [String(row.media_id), row.data || {}]));
  } catch (error) {
    return new Map();
  }
}

module.exports = {
  getContentMetadataMap,
  getMediaMetadataMap,
  saveContentMetadata,
  saveMediaMetadata
};
