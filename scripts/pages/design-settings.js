const KEY = "yunhe.site.design.v1";

function currentDesign() {
  return {
    theme: document.getElementById("theme").value,
    accent: document.getElementById("accent").value,
    backgroundUrl: document.getElementById("background-url").value.trim(),
    backgroundOpacity: document.getElementById("background-opacity").value
  };
}

function applyForm(design) {
  document.getElementById("theme").value = design.theme || "dark";
  document.getElementById("accent").value = design.accent || "#ffffff";
  document.getElementById("background-url").value = design.backgroundUrl || "";
  document.getElementById("background-opacity").value = design.backgroundOpacity || "0.18";
}

function previewDesign() {
  const design = currentDesign();
  const sample = document.getElementById("sample");
  const isLight = design.theme === "light";

  sample.style.backgroundColor = isLight ? "#f6f4ef" : "#111";
  sample.style.color = isLight ? "#111" : "#f2f2f2";
  sample.style.borderColor = isLight ? "#d9d4c8" : "#2a2a2a";
  sample.style.backgroundImage = design.backgroundUrl
    ? `linear-gradient(rgba(${isLight ? "246,244,239" : "17,17,17"},${1 - Number(design.backgroundOpacity)}), rgba(${isLight ? "246,244,239" : "17,17,17"},${1 - Number(design.backgroundOpacity)})), url("${design.backgroundUrl}")`
    : "none";
  sample.querySelector("h3").style.color = design.accent;
}

function saveDesign() {
  localStorage.setItem(KEY, JSON.stringify(currentDesign()));
  document.getElementById("status").textContent = "已保存。打开内容页后会应用到这台设备。";
}

function resetDesign() {
  localStorage.removeItem(KEY);
  applyForm({});
  previewDesign();
  document.getElementById("status").textContent = "已恢复默认。";
}

applyForm(JSON.parse(localStorage.getItem(KEY) || "{}"));
previewDesign();
