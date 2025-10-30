// UI-sovelluskerros: käyttää gameStatea + rulesia
import { ThrowType, throwFromRawInput } from "./rules.js";
import {
  loadOrInit, getState, addPlayer, startGameShuffleOrder,
  getCurrentPlayer, applyThrowToCurrentPlayer, resetAll
} from "./gameState.js";

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toast(msg, ms=2500){
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

function setThrowMode(single){
  $("#grid-single")?.classList.toggle("hidden", !single);
  $("#grid-multi")?.classList.toggle("hidden", single);
}

// ---------- Render ----------
function render(){
  const st = getState();

  // Vuoro-otsikko
  const cur = getCurrentPlayer();
  $("#turnTitle").textContent = cur ? `Vuorossa: ${cur.name}` : "Vuorossa: –";

  // Pelaajakortit
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
      <div class="meta">${p.active ? `Hutit: ${p.misses}/3` : `Poistunut`}</div>
    `;
    grid.appendChild(card);
  });
}

// ---------- Actions ----------
function onQuick(value){
  // value on "MISS-0" / "S7" / "M5"
  try{
    let t;
    if (value === "MISS-0"){
      t = { type: ThrowType.MISS, value: 0 };
    } else {
      t = throwFromRawInput(value);
    }
    const res = applyThrowToCurrentPlayer(t.type, t.value);
    if (res?.error){ toast(res.error); }
    if (res?.events?.includes("BOUNCE_TO_25")) toast("Yli 50 → palautus 25:een");
    if (res?.events?.includes("WIN_50")) toast("Voitto 50! 🎉");
    if (res?.events?.some(e => e.startsWith("MISS_"))) {
      const cur = getCurrentPlayer(); // saattaa jo vaihtua nextTurnissa
      toast("Huti.");
    }
    if (res?.events?.includes("ELIMINATED_3_MISSES")) toast("3 hutia → poistui pelistä");
    render();
  }catch(err){
    toast("Virheellinen syöte.");
  }
}

function onFreeSubmit(){
  const raw = $("#freeInput").value.trim().toUpperCase();
  if (!raw){ toast("Syötä 0, S1..S12 tai M2..M12."); return; }
  $("#freeInput").value = "";
  onQuick(raw === "0" ? "MISS-0" : raw);
}

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
  }catch(e){
    toast("Tarvitset vähintään kaksi pelaajaa.");
  }
}

function onReset(){
  resetAll();
  render();
  toast("Peli nollattu.");
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  // Lataa tila
  const resumed = loadOrInit();
  if (resumed) toast("Jatketaan tallennettua peliä");

  // Heittotavan kytkin
  $("#mode-single")?.addEventListener("change", () => setThrowMode(true));
  $("#mode-multi")?.addEventListener("change", () => setThrowMode(false));
  setThrowMode(true);

  // Pikanapit
  $$(".quick-btn").forEach(btn => {
    btn.addEventListener("click", () => onQuick(btn.dataset.score));
  });

  // Vapaasyöte
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

  // Ensirender
  render();
});
