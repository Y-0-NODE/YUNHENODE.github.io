function getSupabaseEnv() {
  return {
    url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };
}

function isJwtKey(key) {
  return String(key || "").split(".").length === 3;
}

async function supabaseRequest(path, options = {}) {
  const env = getSupabaseEnv();
  const headers = {
    apikey: env.key,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (isJwtKey(env.key)) {
    headers.Authorization = `Bearer ${env.key}`;
  }

  const response = await fetch(`${env.url}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text || `Supabase HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

module.exports = {
  supabaseRequest
};
