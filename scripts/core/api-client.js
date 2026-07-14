(function attachApiClient(global) {
  "use strict";

  async function request(path, options = {}) {
    const config = global.YUNHE_CONFIG;
    const response = await fetch(`${config.apiBase}/${path}`, {
      cache: "no-store",
      ...options
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    return result;
  }

  function post(path, payload) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  global.YunheApi = Object.freeze({ get: request, post });
})(window);
