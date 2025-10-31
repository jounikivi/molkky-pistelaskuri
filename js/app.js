// app.js — Yksilö-UI: heittoloki + minitilastot + poistot + Voitto-modal
import { ThrowType, throwFromRawInput } from "./rules.js";
import {
  loadOrInit, getState, canUndo, undoLastAction,
  addPlayer, removePlayer, shufflePlayers, getCurrent,
  applyThrowToCurrent, newGameSameRoster, resetAll
} from "./gameState.js";

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

function toast(msg, ms=2300){
  const el = $("#toast"); if(!el) return;
  el.textContent = msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), ms);
}

function canThrowNow(){ return !!getCurrent(); }
function canShuffle(st){ return st.players.length >= 2; }

function updateControlsState(){
  const st = getState();
  $("#emptyState").style.display = st.players.length === 0 ? "block" : "none";
  $("#shuffle").toggleAttribute("disabled", !canShuffle(st));

  const throwing = canThrowNow();
  $$(".quick-btn").forEach(b => b.toggleAttribute("disabled", !throwing));
  $("#freeInput").toggleAttribute("disabled", !throwing);
  $("#submitFree").toggleAttribute("disabled", !throwing);

  $("#undo")?.toggleAttribute("disabled", !canUndo());
}

/* ---- tilastot ---- */
function statsForPlayer(logs, playerId){
  const rows = logs.filter(l => l.playerId === playerId);
  const throws = rows.length;
  const misses = rows.filter(l => l.type === ThrowType.MISS).length;
  const points = rows.reduce((s, r) => s + Math.max(0, r.points || 0), 0);
  const avg = throws ? (points / throws) : 0;
  const missPct = throws ? (misses / throws * 100) : 0;
  return { throws, misses, avg, missPct };
}

function renderLog(){
  const st = getState();
  const box = $("#throwLog");
  if (!box) return;
  const last = st.logs.slice(-10).reverse();
  if (!last.length){
    box.innerHTML = `<div class="muted">Ei heittoja vielä.</div>`;
    return;
  }
  box.innerHTML = last.map(e => {
    const v = (e.type === ThrowType.MISS) ? "huti" : `+${e.value}`;
    const ev = (e.events||[]).includes("WIN_50") ? " 🏆"
              : (e.events||[]).includes("BOUNCE_TO_25") ? " ↩︎25"
              : "";
    const t = new Date(e.ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    return `
      <div class="log-row">
        <div class="log-main"><strong>${e.playerName}</strong></div>
        <div class="log-val">${v}${ev}</div>
      </div>
      <div class="log-sub">klo ${t} • pisteet: ${e.scoreAfter}</div>
    `;
  }).join("");
}

/* ---- Voitto-modal (solo) ---- */
let winShown = false;

function openWinModalSolo(winnerName){
  const bd = document.getElementById("winModal");
  const txt = document.getElementById("winText");
  const same = document.getElementById("winSame");
  const fresh= document.getElementById("winFresh");
  const close= document.getElementById("winClose");

  txt.textContent = `${winnerName} saavutti 50 pistettä. Onneksi olkoon!`;
  same.textContent = "Aloita uusi peli samoilla pelaajilla";

  bd.hidden = false;

  same.replaceWith(same.cloneNode(true));
  fresh.replaceWith(fresh.cloneNode(true));
  close.replaceWith(close.cloneNode(true));

  document.getElementById("winSame").addEventListener("click", () => {
    newGameSameRoster();
    bd.hidden = true;
    winShown = false;
    render();
  });
  document.getElementById("winFresh").addEventListener("click", () => {
    resetAll();
    bd.hidden = true;
    winShown = false;
    render();
  });
  document.getElementById("winClose").addEventListener("click", () => {
    bd.hidden = true;
  });
}

function maybeShowWinSolo(){
  if (winShown) return;
  const st = getState();
  if (!st.ended) return;
  const winner = st.players.find(p => p.score === 50);
  if (winner){
    winShown = true;
    openWinModalSolo(winner.name);
  }
}

function render(){
  const st = getState();
  const cur = getCurrent();

  $("#turnTitle").textContent = cur?.player
    ? `Vuorossa: ${cur.player.name}`
    : "Vuorossa: –";

  const wrap = $("#playersGrid");
  wrap.innerHTML = "";

  const order = st.order.length ? st.order : st.players.map((_, i)=>i);
  order.forEach((pIdx) => {
    const p = st.players[pIdx];
    const card = document.createElement("div");
    card.className = "player-card";
    if (!p.active) card.classList.add("inactive");
    if (p.score === 50) card.classList.add("winner");

    const activeMark = (cur && st.order[st.turn]===pIdx) ? "🔵" : (p.active ? "🟢" : "⚫");
    const miss = p.active ? ` · Hutit: ${p.misses}/3` : " · Poistunut";

    const stp = statsForPlayer(st.logs, p.id);

    card.innerHTML = `
      <div class="card-top">
        <h3>${p.name}</h3>
        <button class="icon-btn danger" aria-label="Poista pelaaja" data-del-player="${pIdx}">🗑</button>
      </div>
      <div class="score">${p.score}</div>
      <div class="meta player-row">
        <span>${activeMark} ${p.name}${miss}</span>
        <span class="stat-chips">
          <span class="chip" title="Heittoja">${stp.throws}</span>
          <span class="chip" title="Ka. pisteet/heitto">${stp.avg.toFixed(1)}</span>
          <span class="chip" title="Huti-%">${Math.round(stp.missPct)}%</span>
        </span>
      </div>
    `;

    const delBtn = card.querySelector('[data-del-player]');
    delBtn.addEventListener("click", () => {
      if (!confirm(`Poistetaanko pelaaja ${p.name}?`)) return;
      const ok = removePlayer(pIdx);
      if (!ok) { toast("Poisto epäonnistui."); return; }
      toast("Pelaaja poistettu.");
      render();
    });

    wrap.appendChild(card);
  });

  renderLog();
  updateControlsState();
  maybeShowWinSolo();
}

/* ---- heitot ---- */
function onQuick(value){
  if (!canThrowNow()){
    toast("Heitto ei ole käytössä vielä. Lisää pelaajia ja arvo aloitusjärjestys.");
    return;
  }
  try{
    let t;
    if (/^\d{1,2}$/.test(value)) {
      const n = parseInt(value, 10);
      t = n === 0 ? { type: ThrowType.MISS, value: 0 }
                  : { type: ThrowType.SINGLE_PIN, value: n };
    } else {
      t = throwFromRawInput(value);
    }
    const res = applyThrowToCurrent(t.type, t.value);
    if (res?.error) toast(res.error);
    if (res?.events?.includes("BOUNCE_TO_25")) toast("Yli 50 → palautus 25:een");
    if (res?.events?.includes("WIN_50")) {
      toast("Voitto 50! 🎉");
      const stNow = getState();
      const w = stNow.players.find(p => p.score === 50);
      if (w) { winShown = true; openWinModalSolo(w.name); }
    }
    if (res?.events?.some(e => e.startsWith("MISS_"))) toast("Huti.");
    if (res?.events?.includes("ELIMINATED_3_MISSES")) toast("Pelaaja tippui (3 hutia).");
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

/* ---- hallinta ---- */
function onAddPlayer(){
  const name = $("#playerName").value.trim();
  if (!name){ toast("Anna pelaajan nimi."); return; }
  const res = addPlayer(name);
  if (!res.ok){ toast(res.error || "Nimi jo käytössä."); return; }
  $("#playerName").value = "";
  render();
}
function onShuffle(){
  try{
    const first = shufflePlayers();
    toast(`Aloittaa: ${first.player.name}`);
    render();
  }catch(e){
    toast(e.message || "Arvonta epäonnistui.");
  }
}
function onUndo(){
  if (!canUndo()) return;
  const ok = undoLastAction();
  if (ok){ toast("Peruttu viimeisin."); render(); }
}
function onNewSame(){
  newGameSameRoster();
  toast("Uusi peli – kokoonpano säilytettiin. Arvo aloitusjärjestys.");
  render();
}
function onNewFresh(){
  resetAll();
  toast("Uusi peli – uudet pelaajat.");
  render();
}

/* ---- init ---- */
document.addEventListener("DOMContentLoaded", () => {
  loadOrInit();

  // heitot
  $$(".quick-btn").forEach(btn => btn.addEventListener("click", () => onQuick(btn.dataset.score)));
  $("#submitFree")?.addEventListener("click", onFreeSubmit);
  $("#freeInput")?.addEventListener("keydown", (e) => { if (e.key==="Enter"){ e.preventDefault(); onFreeSubmit(); } });

  // hallinta
  $("#addPlayer")?.addEventListener("click", onAddPlayer);
  $("#playerName")?.addEventListener("keydown", (e) => { if (e.key==="Enter"){ e.preventDefault(); onAddPlayer(); } });
  $("#shuffle")?.addEventListener("click", onShuffle);
  $("#undo")?.addEventListener("click", onUndo);
  $("#newSame")?.addEventListener("click", onNewSame);
  $("#newFresh")?.addEventListener("click", onNewFresh);

  render();
});
