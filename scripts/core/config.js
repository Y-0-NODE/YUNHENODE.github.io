(function attachConfig(global) {
  "use strict";

  const config = Object.freeze({
    siteName: "YUNHENODE",
    adminName: "YUNHE",
    supabaseUrl: "https://ndraugyrdnecqqcyfzjt.supabase.co",
    supabaseKey: "sb_publishable_QWJ-UAB2M1a9OwKcCJAA_w_WdbRHYyM",
    apiBase: "./api"
  });

  global.YUNHE_CONFIG = config;
})(window);
