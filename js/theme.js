const THEME_KEY = "molkky_theme_v1";
const DARK_THEME = "dark";
const SUNLIGHT_THEME = "sunlight";
const THEME_COLORS = {
  [DARK_THEME]: "#0b1018",
  [SUNLIGHT_THEME]: "#f7f9fb"
};

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === SUNLIGHT_THEME ? SUNLIGHT_THEME : DARK_THEME;
  } catch {
    return DARK_THEME;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage errors and keep the in-memory theme.
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === SUNLIGHT_THEME ? SUNLIGHT_THEME : DARK_THEME;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS[DARK_THEME]);
}

function getButtonLabel(theme) {
  return theme === SUNLIGHT_THEME ? "Tumma teema" : "Kirkas ulkotila";
}

function syncToggleButtons(theme) {
  const isSunlight = theme === SUNLIGHT_THEME;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = getButtonLabel(theme);
    button.setAttribute("aria-pressed", String(isSunlight));
    button.setAttribute("title", isSunlight ? "Vaihda takaisin tummaan teemaan" : "Vaihda kirkkaaseen ulkoteemaan");
  });
}

function closeHeaderMenus() {
  document.querySelectorAll(".header-menu[open]").forEach((menu) => menu.removeAttribute("open"));
}

function setTheme(theme) {
  const nextTheme = theme === SUNLIGHT_THEME ? SUNLIGHT_THEME : DARK_THEME;
  applyTheme(nextTheme);
  setStoredTheme(nextTheme);
  syncToggleButtons(nextTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme === SUNLIGHT_THEME ? SUNLIGHT_THEME : DARK_THEME;
  setTheme(currentTheme === SUNLIGHT_THEME ? DARK_THEME : SUNLIGHT_THEME);
  closeHeaderMenus();
}

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", toggleTheme);
});

setTheme(getStoredTheme());
