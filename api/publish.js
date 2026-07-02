const { createClient } = require("@supabase/supabase-js");

console.log("API START");

module.exports = async function handler(req, res) {
  console.log("STEP 1");

  try {
    console.log("ENV CHECK:", {
      url: process.env.SUPABASE_URL ? "OK" : "MISSING",
      key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING"
    });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const data = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    console.log("DATA:", data);

    const { title } = data;

    const { error } = await supabase
      .from("contents")
      .insert([{ title: title || "test" }]);

    if (error) {
      console.log("SUPABASE ERROR:", error);
      return res.status(500).json({ error });
    }

    console.log("SUPABASE OK");

    return res.status(200).json({
      success: true,
      msg: "OK"
    });

  } catch (e) {
    console.log("FATAL:", e);
    return res.status(500).json({
      error: e.message
    });
  }
};
