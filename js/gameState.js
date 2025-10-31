// gameState.js — YKSILÖPELIN tila, vuorotus, UNDO, reset, poistot, heittoloki
import { ThrowType, applyThrow, createPlayerState, applyScoreRules } from "./rules.js";

const STORAGE_KEY   = "molkky:solo:state:v1";
const HISTORY_KEY   = "molkky:solo:history:v1";
const HISTORY_LIMIT = 50;

const deepCopy = (o) => JSON.parse(JSON.stringify(o));

function createEmptyState(){
  return {
    players: [],       // [{ id, name, score, misses, active }]
    order: [],         // pelaajaindeksit vuorokiertoon
    turn: 0,           // order-indeksi
    ended: false,
    logs: []           // heittoloki
  };
}

let state   = createEmptyState();
let history = [];
let nextId  = 1;
const newId = () => nextId++;

/* ---- Sanitointi + duplikaattikanonisointi ---- */
function sanitizeName(raw) {
  return String(raw || "")
    .replace(/[<>"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}
const canon = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

/* ---- Storage ---- */
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { const s = JSON.parse(raw); return (s && Array.isArray(s.players)) ? s : null; }
  catch { return null; }
}
function saveHistory(){ localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT))); }
function loadHistory(){
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try { const h = JSON.parse(raw); return Array.isArray(h) ? h : []; }
  catch { return []; }
}
function pushHistory(){ history.push(deepCopy(state)); saveHistory(); }
function popHistory(){ const p = history.pop() || null; saveHistory(); return p; }

/* ---- LOKI ---- */
const LOG_LIMIT = 300;
function addLog(entry){
  state.logs.push(entry);
  if (state.logs.length > LOG_LIMIT) state.logs.splice(0, state.logs.length - LOG_LIMIT);
}

/* ---- API ---- */
export function loadOrInit(){
  const loaded = loadState();
  state = loaded ?? createEmptyState();
  history = loadHistory();

  // eheys: order vastaa pelaajalistaa
  const should = state.players.map((_, i)=>i);
  if (state.order.length !== should.length || !should.every(i => state.order.includes(i))) {
    state.order = should;
    state.turn = 0;
  }

  // AUTOKORJAUS: jos ei pelaajia, peli ei voi olla päättynyt
  if (state.players.length === 0) {
    state.ended = false;
    state.logs = [];
  }

  saveState();
  return !!loaded;
}

export function getState(){ return deepCopy(state); }
export function canUndo(){ return history.length > 0; }
export function undoLastAction(){
  const prev = popHistory();
  if (!prev) return false;
  state = prev; saveState(); return true;
}

export function resetAll(){
  pushHistory();
  state = createEmptyState();
  saveState();
}

export function newGameSameRoster(){
  pushHistory();
  state.players.forEach(p => { p.score = 0; p.misses = 0; p.active = true; });
  state.turn = 0;
  state.ended = false;
  state.logs = [];
  saveState();
}

/* ---- Pelaajat ---- */
export function addPlayer(name){
  const nm = sanitizeName(name);
  if (!nm) return { ok:false, error:"Anna pelaajan nimi." };
  if (state.players.some(p => canon(p.name) === canon(nm)))
    return { ok:false, error:"Nimi on jo listalla." };

  pushHistory();
  state.players.push({ ...createPlayerState(nm), id: newId() });
  // ylläpidä order
  const newIdx = state.players.length - 1;
  if (!state.order.length) state.order = state.players.map((_, i)=>i);
  else if (!state.order.includes(newIdx)) state.order.push(newIdx);

  state.ended = false;
  saveState();
  return { ok:true };
}

export function removePlayer(pIdx){
  if (pIdx == null || !state.players[pIdx]) return false;
  pushHistory();

  const isCurrent = state.order[state.turn] === pIdx;

  state.players.splice(pIdx, 1);

  // päivitä order indeksit
  state.order = state.order
    .filter(i => i !== pIdx)
    .map(i => i > pIdx ? i - 1 : i);

  // korjaa turn
  if (state.turn >= state.order.length) state.turn = 0;

  // jos poistettiin vuorossa ollut, siirrä seuraavaan
  if (isCurrent && state.order.length){
    state.turn = state.turn % state.order.length;
  }

  // jos ei yhtään pelaajaa
  if (!state.players.length){
    state.order = [];
    state.turn = 0;
    state.ended = false;
    state.logs = [];
  }

  saveState();
  return true;
}

/* ---- Arvonta ---- */
export function shufflePlayers(){
  if (state.players.length < 2) throw new Error("Lisää vähintään kaksi pelaajaa.");
  pushHistory();

  state.order = state.players.map((_, i)=>i);
  for (let i = state.order.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
  }
  state.turn = 0;
  state.ended = false;
  state.logs = [];
  saveState();
  return getCurrent();
}

/* ---- Kuka heittää ---- */
export function getCurrent(){
  if (!state.order.length) return null;
  const idx = state.order[state.turn] ?? 0;
  const p = state.players[idx];
  if (!p || !p.active) return null;
  return { playerIdx: idx, player: p };
}

/* ---- Seuraava ---- */
function nextTurn(){
  if (state.players.every(p => !p.active)){
    state.ended = true; saveState(); return null;
  }
  const len = state.order.length;
  for (let step=0; step<len; step++){
    state.turn = (state.turn + 1) % len;
    const idx = state.order[state.turn];
    const p = state.players[idx];
    if (p && p.active){ saveState(); return getCurrent(); }
  }
  saveState();
  return getCurrent();
}

/* ---- Heitto ---- */
export function applyThrowToCurrent(throwType, value){
  if (state.ended) return { error:"Peli on jo päättynyt." };
  const cur = getCurrent();
  if (!cur){ return { error:"Ei vuoroa. Lisää pelaajia ja paina 'Arvo aloitusjärjestys'." }; }

  const { playerIdx } = cur;
  const player = state.players[playerIdx];

  pushHistory();

  const beforeScore = player.score;

  const { player: updated, events } = applyThrow(player, throwType, value);
  state.players[playerIdx] = updated;

  let pointsAwarded = 0;
  if (throwType !== ThrowType.MISS){
    const gained = value;
    const { score, win, bounced } = applyScoreRules(updated.score - gained, gained);
    pointsAwarded = score - (updated.score - gained);
    updated.score = score;
    if (bounced && !events.includes("BOUNCE_TO_25")) events.push("BOUNCE_TO_25");
    if (win && !events.includes("WIN_50")) events.push("WIN_50");
  }

  if (events.includes("WIN_50")){
    state.ended = true;
  }

  // Loki
  addLog({
    ts: Date.now(),
    playerId: updated.id,
    playerName: updated.name,
    type: throwType,
    value,
    points: pointsAwarded,
    scoreAfter: updated.score,
    missesAfter: updated.misses,
    events
  });

  if (!state.ended) nextTurn();
  saveState();
  return { playerAfter: updated, events };
}
