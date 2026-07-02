const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST" });
  }

  try {
    const data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    console.log("DATA:", data);

    const { title, intro, body, video, type, topic } = data;

    if (!title || !body) {
      return res.status(400).json({
        error: "title/body missing"
      });
    }

    const { data: result, error } = await supabase
      .from("contents")
      .insert([
        {
          title,
          intro: intro || "",
          body,
          video: video || "",
          type: type || "article",
          topic: topic || "未分类"
        }
      ])
      .select();

    if (error) {
      console.log("SUPABASE ERROR:", error);
      return res.status(500).json({
        step: "supabase_insert",
        error
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
};
