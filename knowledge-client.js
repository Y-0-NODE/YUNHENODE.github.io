(function(){
  function option(value, label){
    const node = document.createElement("option");
    node.value = value;
    node.textContent = label || value;
    return node;
  }

  function replaceShared(select, items, map, preserve){
    if(!select || !Array.isArray(items) || !items.length) return;
    const selected = select.value;
    const retained = preserve
      ? [...select.querySelectorAll("option")].filter(item => preserve(item.value)).map(item => ({ value:item.value, label:item.textContent }))
      : [];
    select.innerHTML = "";
    items.forEach(item => {
      const data = map(item);
      select.appendChild(option(data.value, data.label));
    });
    retained.forEach(item => select.appendChild(option(item.value, item.label)));
    if([...select.options].some(item => item.value === selected)) select.value = selected;
  }

  async function load(){
    try{
      const response = await fetch("./api/admin-list?view=knowledge-config", { cache:"no-store" });
      const result = await response.json();
      if(!response.ok || !result.data) return;
      const config = result.data;
      const template = document.getElementById("edit-template") || document.getElementById("template");
      const level = document.getElementById("edit-knowledge-level") || document.getElementById("knowledge-level");
      const topic = document.getElementById("edit-topic") || document.getElementById("topic");

      replaceShared(template, config.templates, item => ({ value:item.code, label:`${item.code} | ${item.name}` }), value => !/^[A-Z][A-Z0-9]{0,2}$/.test(value));
      replaceShared(level, config.levels, item => ({ value:item, label:item }), () => false);
      replaceShared(topic, config.topics, item => ({ value:item, label:item }), value => value === "auto");

      window.dispatchEvent(new CustomEvent("yunhe:knowledge-ready", { detail:config }));
    }catch(error){
      console.warn("Knowledge System configuration is unavailable.");
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
