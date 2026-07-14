(function attachUtils(global) {
  "use strict";

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value, separator = ".") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = number => String(number).padStart(2, "0");
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(separator);
  }

  function formatDateTime(value) {
    if (!value) return "未标注";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function toDateInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    const pad = number => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function lines(value) {
    return String(value || "")
      .split(/[\n，,]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }

  global.YunheUtils = Object.freeze({
    escapeHtml,
    fetchJson,
    formatDate,
    formatDateTime,
    lines,
    toDateInput
  });
})(window);
