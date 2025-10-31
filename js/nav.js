// nav.js — hamburger + aktiivinen linkki + pysyvä tumma/vaalea teema
const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

const THEME_KEY = "molkky:theme"; // "light" | "dark" | "" (järjestelmä)

function applyTheme(theme){
  // theme: "light" | "dark" | ""
  const html = document.documentElement;
  if (theme === "dark") {
    html.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    html.setAttribute("data-theme", "light"); // (valinnaista jos halutaan pakottaa)
    // jos haluat käyttää aina preferenssejä kun light, voit poistaa tämän rivin
  } else {
    html.removeAttribute("data-theme"); // käytä prefers-color-scheme
  }

  // Päivitä napin teksti + aria
  const isDark = (html.getAttribute("data-theme") === "dark")
    || (theme === "" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const headerBtn = $("#themeToggle");
  const drawerBtn = $("#themeToggleDrawer");

  if (headerBtn){
    headerBtn.setAttribute("aria-pressed", String(isDark));
    headerBtn.querySelector(".theme-ico").textContent = isDark ? "☀️" : "🌙";
    headerBtn.querySelector(".theme-text").textContent = isDark ? "Vaalea" : "Tumma";
  }
  if (drawerBtn){
    drawerBtn.setAttribute("aria-pressed", String(isDark));
    drawerBtn.textContent = isDark ? "Vaihda vaaleaan" : "Vaihda tummaan";
  }
}

function cycleTheme(){
  const cur = localStorage.getItem(THEME_KEY) ?? "";
  const next = (cur === "dark") ? "light" : (cur === "light" ? "" : "dark");
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) ?? "";
  applyTheme(saved);

  // Jos käyttäjä vaihtaa järjestelmäteemaa ja meillä on "", päivitä UI
  if (saved === "" && window.matchMedia){
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", () => applyTheme(""));
  }
}

function initNav(){
  // hamburger
  const btn = $("#navToggle");
  const drawer = $("#siteNav");
  btn?.addEventListener("click", () => {
    const open = drawer.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
  // sulje kun klikataan navigaatio-linkkiä
  $$("#siteNav [data-nav]").forEach(a => {
    a.addEventListener("click", () => {
      drawer.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    });
  });

  // aktiivinen linkki
  const here = location.pathname.split("/").pop() || "index.html";
  $$("#siteNav a[href]").forEach(a => {
    const target = a.getAttribute("href") || "";
    if (target.endsWith(here)) a.classList.add("active");
  });

  // teema
  $("#themeToggle")?.addEventListener("click", cycleTheme);
  $("#themeToggleDrawer")?.addEventListener("click", cycleTheme);
  initTheme();
}

document.addEventListener("DOMContentLoaded", initNav);
