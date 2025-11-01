/* app.js — Yksilöpeli UI + logiikka (v2.0.3: delegated throwPad fix) */

/* --------------------- SAFETY HELPERS --------------------- */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, m => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
  ));
}

/* --------------------- PERSISTENCE & STATE --------------------- */
const LS_KEY = "molkky_solo_v2";
const defaultState = () => ({
  players: [], order: [], turnIndex: 0, ended: false,
  createdAt: Date.now(), updatedAt: Date.now(), history: []
});
let state = load();
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const d = JSON.parse(raw);
    d.players ??= [];
    d.players.forEach(p => {
      p.score ??= 0; p.active ??= true; p.misses ??= 0; p.history ??= []; p.name = String(p.name ?? "");
    });
    d.order ??= d.players.map(p => p.id);
    d.turnIndex ??= 0; d.ended ??= false; d.updatedAt ??= Date.now(); d.createdAt ??= d.createdAt ?? Date.now(); d.history ??= [];
    return d;
  } catch { return defaultState(); }
}
function save(){ state.updatedAt = Date.now(); localStorage.setItem(LS_KEY, JSON.stringify(state)); }

/* --------------------- HELPERS --------------------- */
const uid = () => Math.random().toString(36).slice(2,10);
function getPlayer(id){ return state.players.find(p=>p.id===id); }
function currentPlayer(){
  if (state.ended) return null;
  const aliveOrder = state.order.filter(id => getPlayer(id)?.active);
  if (!aliveOrder.length) return null;
  let idx = state.turnIndex % state.order.length;
  for (let i=0;i<state.order.length;i++){
    const id = state.order[(idx+i)%state.order.length]; const p = getPlayer(id);
    if (p?.active){ state.turnIndex = (idx+i)%state.order.length; return p; }
  }
  return null;
}
function nextTurn(){
  if (state.ended) return;
  let steps = 0;
  do{
    state.turnIndex = (state.turnIndex+1)%state.order.length;
    steps++;
    const np = getPlayer(state.order[state.turnIndex]);
    if (np?.active) break;
  }while(steps<=state.order.length);
}
function statsFromPlayer(p){
  const throws = p.history?.length ?? 0;
  const sum = (p.history ?? []).reduce((a,h)=>a+(Number(h.score)||0),0);
  const misses = (p.history ?? []).reduce((a,h)=>a+(h.score===0?1:0),0);
  const avg = throws ? sum/throws : 0; const missPct = throws ? (100*misses/throws) : 0;
  return { throws, avg, missPct };
}

/* --------------------- SCORE RULES --------------------- */
function applyScoreRules(oldScore, gained){
  const next = (oldScore ?? 0) + (gained ?? 0);
  if (next === 50) return { score: 50, win: true, reset25: false };
  if (next > 50)   return { score: 25, win: false, reset25: true };
  return { score: next, win: false, reset25: false };
}

/* --------------------- DOM --------------------- */
const els = {
  playersGrid: document.getElementById("playersGrid"),
  emptyState:  document.getElementById("emptyState"),
  playerName:  document.getElementById("playerName"),
  addPlayer:   document.getElementById("addPlayer"),
  shuffle:     document.getElementById("shuffle"),
  undo:        document.getElementById("undo"),
  newSame:     document.getElementById("newSame"),
  newFresh:    document.getElementById("newFresh"),
  freeInput:   document.getElementById("freeInput"),
  submitFree:  document.getElementById("submitFree"),
  turnTitle:   document.getElementById("turnTitle"),
  shuffleAlt:  document.getElementById("shuffleAlt"),
  undoAlt:     document.getElementById("undoAlt"),
  winModal:    document.getElementById("winModal"),
  winText:     document.getElementById("winText"),
  winSame:     document.getElementById("winSame"),
  winFresh:    document.getElementById("winFresh"),
  winClose:    document.getElementById("winClose"),
  toast:       document.getElementById("toast")
};

/* --------------------- RENDER --------------------- */
function render(){ renderTurn(); renderPlayers(); renderControls(); save(); }
function renderTurn(){
  if (!els.turnTitle) return;
  if (state.ended){ els.turnTitle.textContent = "Peli päättynyt"; return; }
  const p = currentPlayer(); els.turnTitle.textContent = p ? `Vuorossa: ${p.name}` : "Vuorossa: –";
}
function renderPlayers(){
  const grid = els.playersGrid; if(!grid) return; grid.innerHTML="";
  if (!state.players.length){ els.emptyState?.classList.remove("hidden"); return; }
  els.emptyState?.classList.add("hidden");
  state.players.forEach(p=>{
    const stats = statsFromPlayer(p);
    const card = document.createElement("article");
    card.className="player-card"; card.classList.toggle("card--eliminated", !p.active); card.dataset.eliminated=String(!p.active);
    card.innerHTML = `
      <div class="card__header">
        <div class="card__title">${escapeHtml(p.name)}</div>
        <div class="chips">
          <span class="chip chip--score">🥇 ${p.score ?? 0}</span>
          <span class="chip">${stats.throws} heittoa</span>
          <span class="chip chip--avg">${stats.avg.toFixed(1)}</span>
          <span class="chip chip--miss">${Math.round(stats.missPct)}% huti</span>
        </div>
      </div>
      <div class="card__body">
        <div class="card__score">Pisteet: ${p.score ?? 0}</div>
      </div>`;
    grid.appendChild(card);
  });
}
function renderControls(){
  const canShuffle = state.players.length >= 2 && state.order.length >= 2 && !state.ended;
  const canUndo = state.players.some(p => p.history?.length) && !state.ended;
  [els.shuffle, els.shuffleAlt].forEach(b=>b&&(b.disabled=!canShuffle));
  [els.undo, els.undoAlt].forEach(b=>b&&(b.disabled=!canUndo));
}

/* --------------------- ACTIONS --------------------- */
function addPlayer(){
  const name = (els.playerName?.value ?? "").trim();
  if (!name) return toast("Anna nimi");
  const p = { id: uid(), name, score: 0, active: true, misses: 0, history: [] };
  state.players.push(p); state.order = state.players.map(pl=>pl.id); els.playerName.value="";
  render();
}
function shuffleOrder(){
  if (state.players.length < 2) return;
  const arr = [...state.players.map(p=>p.id)];
  for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  state.order = arr; state.turnIndex = 0; render();
}
function applyThrow(n){
  if (state.ended) return;
  const p = currentPlayer(); if (!p) return;
  const scoreVal = Number(n); const isMiss = scoreVal === 0;
  if (isMiss) p.misses = (p.misses ?? 0) + 1; else p.misses = 0;
  if (p.misses >= 3) p.active = false;
  p.history.push({ score: scoreVal, ts: Date.now() });
  if (p.active){
    const res = applyScoreRules(p.score ?? 0, scoreVal);
    p.score = res.score;
    if (res.win){ openWin(`${p.name} saavutti 50 pistettä!`); state.ended = true; render(); return; }
    if (res.reset25) toast(`${p.name} yli 50 → 25 pisteeseen`);
  } else { toast(`${p.name} tippui (3 hutia)`); }
  if (state.players.every(pl => !pl.active)){ state.ended=true; openWin(`Kaikki tippuivat. Ei voittajaa.`); render(); return; }
  nextTurn(); render();
}
function undo(){
  const lastWithThrow = [...state.players].reverse().find(pl => pl.history?.length);
  if (!lastWithThrow) return;
  const last = lastWithThrow.history.pop();
  if (last.score === 0){ lastWithThrow.misses = Math.max(0, (lastWithThrow.misses ?? 0) - 1); }
  else{
    const recalc = (lastWithThrow.history ?? []).reduce((acc,h)=>applyScoreRules(acc,h.score).score,0);
    lastWithThrow.score = recalc;
    if (lastWithThrow.misses >= 3) lastWithThrow.active = true;
  }
  state.ended = false; toast("Peruttu viimeisin heitto"); render();
}
function newGameSame(){ state.players.forEach(p=>{ p.score=0;p.misses=0;p.active=true;p.history=[]; }); state.turnIndex=0; state.ended=false; closeWin(); render(); }
function newGameFresh(){ state = defaultState(); closeWin(); render(); }

/* --------------------- WIN & TOAST --------------------- */
function openWin(text){ els.winText && (els.winText.textContent=text); els.winModal?.removeAttribute("hidden"); }
function closeWin(){ els.winModal?.setAttribute("hidden",""); }
function toast(msg){ if(!els.toast) return; els.toast.textContent=msg; els.toast.classList.add("show"); setTimeout(()=>els.toast.classList.remove("show"),1600); }

/* --------------------- EVENTS --------------------- */
els.addPlayer?.addEventListener("click", addPlayer);
els.shuffle?.addEventListener("click", shuffleOrder);
els.shuffleAlt?.addEventListener("click", shuffleOrder);
els.undo?.addEventListener("click", undo);
els.undoAlt?.addEventListener("click", undo);
els.newSame?.addEventListener("click", newGameSame);
els.newFresh?.addEventListener("click", newGameFresh);
els.winSame?.addEventListener("click", newGameSame);
els.winFresh?.addEventListener("click", newGameFresh);
els.winClose?.addEventListener("click", closeWin);

els.submitFree?.addEventListener("click", () => {
  const val = (els.freeInput?.value ?? "").trim();
  if (!val) return;
  const n = Number(val);
  if (Number.isNaN(n) || n < 0 || n > 12) { toast("Syötä numero 0–12"); return; }
  applyThrow(n); els.freeInput.value = "";
});

/* --- Delegoitu kuuntelija heittoruudukolle: EI tuplia --- */
const throwPad = document.getElementById("throwPad");
if (throwPad && !throwPad.dataset.bound) {
  throwPad.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-score]");
    if (!btn) return;
    const n = Number(btn.dataset.score || 0);
    if (Number.isNaN(n)) return;
    applyThrow(n);
  });
  throwPad.dataset.bound = "1";
}

/* --- Yläruudukon pikanapit (jos näkyvissä) --- */
const quickHost = document.querySelector(".turn-card");
if (quickHost && !quickHost.dataset.bound) {
  quickHost.addEventListener("click", (e) => {
    const b = e.target.closest(".quick-btn[data-score]");
    if (!b) return;
    applyThrow(Number(b.dataset.score || 0));
  });
  quickHost.dataset.bound = "1";
}

render();
