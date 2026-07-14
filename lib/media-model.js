const MEDIA_KINDS = Object.freeze(["photo", "video", "audio", "document", "asset"]);
const MEDIA_STATUSES = Object.freeze(["published", "private", "draft", "archived"]);

function normalizeMediaKind(value) {
  return MEDIA_KINDS.includes(value) ? value : "asset";
}

function normalizeMediaStatus(value) {
  return MEDIA_STATUSES.includes(value) ? value : "published";
}

module.exports = {
  MEDIA_KINDS,
  MEDIA_STATUSES,
  normalizeMediaKind,
  normalizeMediaStatus
};
