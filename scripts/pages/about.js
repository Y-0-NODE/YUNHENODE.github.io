const navLinks = Array.from(document.querySelectorAll(".section-nav a"));
const sections = navLinks.map(link => document.querySelector(link.getAttribute("href")));
const CONTACT_SETTINGS_TITLE = "YUNHE_PUBLIC_CONTACTS";
const PUBLIC_MEDIA_API = "https://yunhenode-github-io-qwu7.vercel.app/api/media-list";
const DEFAULT_CONTACT_SETTINGS = {
  title: "联系方式",
  intro: "如需合作，可通过以下方式联系。",
  contacts: [
    {
      label: "Email",
      value: "YUNHE-ZK@outlook.com",
      url: "mailto:YUNHE-ZK@outlook.com",
      visible: true
    },
    { label: "Behance", value: "云鹤系统", url: "", visible: true },
    { label: "GitHub", value: "YUNHENODE", url: "", visible: true },
    { label: "公众号", value: "云鹤系统", url: "", visible: true },
    { label: "小红书", value: "云鹤系统", url: "", visible: true }
  ]
};

function escapeContact(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeContactUrl(value) {
  const url = String(value || "").trim();
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : "";
}

async function fetchMediaItems(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const result = await response.json();
    return Array.isArray(result.data) ? result.data : null;
  } catch (error) {
    return null;
  }
}

function parseContactSettings(record) {
  if (!record?.description) return DEFAULT_CONTACT_SETTINGS;
  try {
    const parsed = JSON.parse(record.description);
    return {
      title: String(parsed.title || DEFAULT_CONTACT_SETTINGS.title),
      intro: String(parsed.intro || DEFAULT_CONTACT_SETTINGS.intro),
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : DEFAULT_CONTACT_SETTINGS.contacts
    };
  } catch (error) {
    return DEFAULT_CONTACT_SETTINGS;
  }
}

function renderContacts(settings) {
  document.getElementById("contact-title").textContent = settings.title || "联系方式";
  document.getElementById("contact-intro").textContent = settings.intro || "";
  const contacts = (settings.contacts || []).filter(
    item => item.visible !== false && (item.label || item.value)
  );
  const box = document.getElementById("contact-line");
  box.innerHTML = contacts.length
    ? contacts
        .map(item => {
          const label = escapeContact(item.label || "联系");
          const value = escapeContact(item.value || item.url || "");
          const url = safeContactUrl(item.url);
          if (!url) return `<span><strong>${label}</strong><em>${value}</em></span>`;
          const external = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : "";
          return `<a href="${escapeContact(url)}"${external}><strong>${label}</strong><em>${value}</em></a>`;
        })
        .join("")
    : "<span><strong>Contact</strong><em>暂未开放公开联系方式</em></span>";
}

async function loadPublicContacts() {
  const cacheKey = Date.now();
  let items = await fetchMediaItems(`./api/media-list?contacts=${cacheKey}`);
  if (!items) items = await fetchMediaItems(`${PUBLIC_MEDIA_API}?contacts=${cacheKey}`);
  const record = items?.find(item => item.title === CONTACT_SETTINGS_TITLE);
  renderContacts(parseContactSettings(record));
}

function updateActiveSection() {
  const y = window.scrollY + 150;
  let activeIndex = 0;

  sections.forEach((section, index) => {
    if (section && section.offsetTop <= y) activeIndex = index;
  });

  navLinks.forEach((link, index) => link.classList.toggle("active", index === activeIndex));
}

window.addEventListener("scroll", updateActiveSection);

updateActiveSection();
loadPublicContacts();
