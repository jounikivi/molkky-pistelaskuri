// nav.js — hamburger-valikko + aktiivinen linkki + pikateema
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function toggleNav(open) {
  const nav = $("#siteNav");
  const btn = $("#navToggle");
  const willOpen = open ?? !nav.classList.contains("open");
  nav.classList.toggle("open", willOpen);
  btn.setAttribute("aria-expanded", String(willOpen));
}

function markActive() {
  const here = location.pathname.split("/").pop() || "index.html";
  $$('nav a[data-nav]').forEach(a => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", href.endsWith(here));
  });
}

function initThemeQuick() {
  const root = document.documentElement;
  const key = "molkky:theme";
  const saved = localStorage.getItem(key) || "system";
  if (saved === "dark") root.setAttribute("data-theme", "dark");
  else if (saved === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");

  $("#themeQuick")?.addEventListener("click", () => {
    const cur = root.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    if (cur == null) {
      // system -> dark
      root.setAttribute("data-theme", "dark");
      localStorage.setItem(key, "dark");
      return;
    }
    root.setAttribute("data-theme", next);
    localStorage.setItem(key, next);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  $("#navToggle")?.addEventListener("click", () => toggleNav());
  // sulje kun painetaan linkkiä (mobiilissa)
  $$('nav a[data-nav]').forEach(a => a.addEventListener("click", () => toggleNav(false)));
  markActive();
  initThemeQuick();
});
