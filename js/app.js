// UI-sovelluskerros: käyttää gameStatea + rulesia
import { ThrowType, throwFromRawInput } from "./rules.js";
import {
  loadOrInit, getState, addPlayer, startGameShuffleOrder,
  getCurrentPlayer, applyThrowToCurrentPlayer, resetAll,
  canUndo, undoLastAction
} from "./gameState.js";

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toast(msg, ms=2300){
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), ms);
}

function colorFor(i){
  const palette = ["#00796b","#2196f3","#f44336","#ff9800","#9c27b0","#4caf50","#8d6e63","#00bcd4"];
  return palette[i % palette.length];
}

function render(){
  const st = getState();
  const cur = getCurrentPlayer();
  $("#turnTitle").textContent = cur ? `Vuorossa: ${cur.name}` : "Vuorossa: –";

  const grid = $("#playerGrid");
  grid.innerHTML = "";
  st.order.forEach((playerIdx, iInOrder) => {
    const p = st.players[playerIdx];
    const card = document.createElement("div");
    card.className = "player-card";
    if (!p.active) card.classList.add("inactive");
    if (p.score === 50) card.classList.add("winner");
    card.style.backgroundColor = colorFor(iInOrder);
    card.innerHTML = `
      <h3>${p.name}</h3>
      <div class="score">${p.score}</div>
      <div class="meta" aria-live="polite">${p.active ? `Hutit: ${p.misses}/3` : `Poistunut`}</div>
    `;
    grid.appendChild(card);
  });

  $("#undo")?.toggleAttribute("disabled", !canUndo());
}

// Hyväksy 0–12 sekä S#/M# vapaasyötteessä (taaksepäin yhteensopiva)
function onQuick(value){
  try{
    let t;
    if (/^\d{1,2}$/.test(value)) {
      const n = parseInt(value, 10);
      t = n === 0
        ? { type: ThrowType.MISS, value: 0 }
        : { type: ThrowType.SINGLE_PIN, value: n };
    } else {
      t = throwFromRawInput(value); // S# / M#
    }

    const res = applyThrowToCurrentPlayer(t.type, t.value);
    if (res?.error) toast(res.error);
    if (res?.events?.includes("BOUNCE_TO_25")) toast("Yli 50 → palautus 25:een");
    if (res?.events?.includes("WIN_50")) toast("Voitto 50! 🎉");
    if (res?.events?.some(e => e.startsWith("MISS_"))) toast("Huti.");
    if (res?.events?.includes("ELIMINATED_3_MISSES")) toast("3 hutia → poistui pelistä");
    render();
  }catch{
    toast("Virheellinen syöte.");
  }
}

function onFreeSubmit(){
  const raw = $("#freeInput").value.trim().toUpperCase();
  if (!raw){ toast("Syötä 0–12."); return; }
  $("#freeInput").value = "";
  onQuick(raw);
}

// Pelaajat
function onAddPlayer(){
  const name = $("#playerName").value.trim();
  if (!name){ toast("Anna pelaajan nimi."); return; }
  const ok = addPlayer(name);
  if (!ok){ toast("Nimi on jo käytössä."); return; }
  $("#playerName").value = "";
  $("#playerName").focus();
  render();
}
function onShuffle(){
  try{
    const first = startGameShuffleOrder();
    toast(`Aloittaja: ${first.name}`);
    render();
  }catch{
    toast("Tarvitset vähintään kaksi pelaajaa.");
  }
}
function onReset(){
  resetAll();
  render();
  toast("Peli nollattu.");
}

// UNDO
function onUndo(){
  if (!canUndo()) return;
  const ok = undoLastAction();
  if (ok) { toast("Peruttu viimeisin heitto / muutos."); render(); }
}

// Teema
const THEME_KEY = "molkky:theme"; // "light" | "dark" | "system"
function applyTheme(theme){
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  localStorage.setItem(THEME_KEY, theme);
  $("#themeToggle")?.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  $("#themeToggle") && ($("#themeToggle").textContent = theme === "dark" ? "Vaalea teema" : "Tumma teema");
}
function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || "system";
  applyTheme(saved);
}
function toggleTheme(){
  const root = document.documentElement;
  const cur = root.getAttribute("data-theme");
  if (cur === "dark") applyTheme("light");
  else applyTheme("dark");
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  const resumed = loadOrInit();
  if (resumed) toast("Jatketaan tallennettua peliä");

  // Pikanapit
  $$(".quick-btn").forEach(btn => {
    btn.addEventListener("click", () => onQuick(btn.dataset.score));
  });

  // Vapaa syöte
  $("#submitFree")?.addEventListener("click", onFreeSubmit);
  $("#freeInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){ e.preventDefault(); onFreeSubmit(); }
  });

  // Pelaajien lisäys & hallinta
  $("#addPlayer")?.addEventListener("click", onAddPlayer);
  $("#playerName")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){ e.preventDefault(); onAddPlayer(); }
  });
  $("#shuffle")?.addEventListener("click", onShuffle);
  $("#reset")?.addEventListener("click", onReset);

  // Undo & teema
  $("#undo")?.addEventListener("click", onUndo);
  $("#themeToggle")?.addEventListener("click", toggleTheme);

  render();
});
