async function publishToSite() {
  const adminName = document.getElementById("admin-name").value.trim();
  const password = document.getElementById("password").value.trim();
  const type = document.getElementById("type").value;
  const topic = window.YunheTaxonomy.canonicalTopic(document.getElementById("topic").value);
  const template = document.getElementById("template").value;
  const knowledgeLevel = document.getElementById("knowledge-level").value;
  const title = document.getElementById("title").value.trim();
  const subtitle = document.getElementById("subtitle").value.trim();
  const intro = document.getElementById("intro").value.trim();
  const originalDate = document.getElementById("original-date").value;
  const source = document.getElementById("source").value;
  const video = document.getElementById("video").value.trim();
  const body = document.getElementById("body").value.trim();
  const output = document.getElementById("output");

  if (!adminName || !password || !title || !body || !template || !knowledgeLevel) {
    output.textContent = "必填项缺失：管理员名称 / 密码 / 标题 / 正文 / 模板 / 知识层级";
    return;
  }

  output.textContent = "正在发布...";

  try {
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adminName,
        password,
        title,
        subtitle,
        intro,
        originalDate,
        source,
        body,
        type,
        topic,
        template,
        knowledgeLevel,
        video
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      output.textContent =
        "发布成功\n\n" +
        "标题：" +
        title +
        "\n" +
        "slug：" +
        data.slug +
        "\n" +
        "访问链接：" +
        data.url;

      alert("发布成功");
    } else {
      output.textContent = "发布失败：\n" + (data.error || JSON.stringify(data, null, 2));
    }
  } catch (err) {
    output.textContent = "请求失败：\n" + err.message;
  }
}

function resetPublishTopic() {
  const text = [
    document.getElementById("title").value,
    document.getElementById("subtitle").value,
    document.getElementById("intro").value,
    document.getElementById("body").value
  ].join("\n");
  const topic = window.YunheTaxonomy.detectTopic(text, document.getElementById("topic").value);
  document.getElementById("topic").value = topic;
  document.getElementById("output").textContent = `分类已重新判断为：${topic}`;
}

window.YunheTaxonomy.populateTopicSelect(document.getElementById("topic"));
