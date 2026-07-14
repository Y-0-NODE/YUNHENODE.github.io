const navLinks = Array.from(document.querySelectorAll(".section-nav a"));
const sections = navLinks.map(link => document.querySelector(link.getAttribute("href")));
const routeSteps = Array.from(document.querySelectorAll(".route-step"));

function updateActiveSection() {
  const y = window.scrollY + 150;
  let activeIndex = 0;

  sections.forEach((section, index) => {
    if (section && section.offsetTop <= y) activeIndex = index;
  });

  navLinks.forEach((link, index) => link.classList.toggle("active", index === activeIndex));
}

function updateRoute() {
  const route = document.getElementById("route");
  const rect = route.getBoundingClientRect();
  const progress = Math.min(
    1,
    Math.max(0, (window.innerHeight * 0.72 - rect.top) / Math.max(1, rect.height))
  );
  const activeCount = Math.max(1, Math.ceil(progress * routeSteps.length));
  routeSteps.forEach((step, index) => step.classList.toggle("active", index < activeCount));
}

window.addEventListener("scroll", () => {
  updateActiveSection();
  updateRoute();
});

updateActiveSection();
updateRoute();
