(function defineMetadata(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.YunheMetadata = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMetadata() {
  "use strict";

  const CONTENT_PATTERN = /\n*<!--yunhe-meta:([\s\S]*?)-->\s*$/m;
  const MEDIA_PATTERN = /\n*<!--yunhe-media-meta:([\s\S]*?)-->\s*$/m;

  function parse(value, pattern) {
    const match = String(value || "").match(pattern);
    if (!match) return {};
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      return {};
    }
  }

  function strip(value, pattern) {
    return String(value || "")
      .replace(pattern, "")
      .trim();
  }

  function append(value, metadata, marker, pattern) {
    const body = strip(value, pattern);
    return `${body}\n\n<!--${marker}:${JSON.stringify(metadata || {})}-->`.trim();
  }

  return Object.freeze({
    content: Object.freeze({
      append: (value, metadata) => append(value, metadata, "yunhe-meta", CONTENT_PATTERN),
      parse: value => parse(value, CONTENT_PATTERN),
      strip: value => strip(value, CONTENT_PATTERN)
    }),
    media: Object.freeze({
      append: (value, metadata) => append(value, metadata, "yunhe-media-meta", MEDIA_PATTERN),
      parse: value => parse(value, MEDIA_PATTERN),
      strip: value => strip(value, MEDIA_PATTERN)
    })
  });
});
