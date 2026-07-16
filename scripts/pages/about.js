const navLinks = Array.from(document.querySelectorAll(".section-nav a"));
const sections = navLinks.map(link => document.querySelector(link.getAttribute("href")));

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
