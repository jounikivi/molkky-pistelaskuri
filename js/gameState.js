// gameState.js — Pelitila, vuorotus, localStorage-pysyvyys + UNDO
import {
  ThrowType,
  createPlayerState,
  applyThrow,
} from "./rules.js";

const STORAGE_KEY = "molkky:state:v1";
const HISTORY_KEY = "molkky:history:v1";
const HISTORY_LIMIT = 50;

function deepCopy(obj){ return JSON.parse(JSON.stringify(obj)); }

// ---------- Tallennus ----------
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn("localStorage save failed:", e); }
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.players)) return null;
    return parsed;
  } catch { return null; }
}
function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT))); }
  catch (e) { console.warn("localStorage save history failed:", e); }
}
function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

// ---------- Pelitila ----------
function createEmptyState() {
  return { players: [], order: [], turn: 0, ended: false };
}
let state = createEmptyState();
let history = []; // pinoa (aiemmat tilat)

function pushHistory(){
  history.push(deepCopy(state));
  if (history.length > HISTORY_LIMIT) history.shift();
  saveHistory(history);
}
function popHistory(){
  const prev = history.pop();
  saveHistory(history);
  return prev ?? null;
}

// ---------- Julkinen API ----------
export function getState(){ return deepCopy(state); }

export function addPlayer(name) {
  const nm = String(name ?? "").trim();
  if (!nm) return false;
  if (state.players.some(p => p.name.toLowerCase() === nm.toLowerCase())) return false;

  pushHistory();
  state.players.push(createPlayerState(nm));
  state.ended = false;
  if (!state.order.length) {
    state.order = state.players.map((_, i) => i);
    state.turn = 0;
  }
  saveState(state);
  return true;
}

export function resetAll() {
  pushHistory();
  state = createEmptyState();
  saveState(state);
}

export function startGameShuffleOrder() {
  if (state.players.length < 2) throw new Error("Lisää vähintään kaksi pelaajaa.");
  pushHistory();
  state.order = state.players.map((_, i) => i);
  for (let i = state.order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.order[i], state.order[j]] = [state.order[j], state.order[i]];
  }
  state.turn = 0;
  state.ended = false;
  saveState(state);
  return getCurrentPlayer();
}

export function getCurrentPlayer() {
  if (!state.order.length) return null;
  const idx = state.order[state.turn] ?? 0;
  return state.players[idx] ?? null;
}

export function nextTurn() {
  if (!state.order.length) return null;
  if (state.players.every(p => !p.active)) {
    state.ended = true;
    saveState(state);
    return null;
  }
  const len = state.order.length;
  for (let step = 0; step < len; step++) {
    state.turn = (state.turn + 1) % len;
    const p = getCurrentPlayer();
    if (p && p.active) {
      saveState(state);
      return p;
    }
  }
  saveState(state);
  return getCurrentPlayer();
}

/**
 * Lisää heitto nykyiselle pelaajalle.
 * Palauttaa { playerAfter, events, win?, next? } tai { error }.
 */
export function applyThrowToCurrentPlayer(throwType, value) {
  if (state.ended) return { error: "Peli on jo päättynyt." };
  const curIndexInPlayers = state.order[state.turn];
  const curPlayer = state.players[curIndexInPlayers];
  if (!curPlayer) return { error: "Ei pelaajaa vuorossa." };
  if (!curPlayer.active) {
    const nxt = nextTurn();
    return { error: "Pelaaja ei ole aktiivinen.", next: nxt };
  }

  pushHistory(); // snapshot ennen muutosta

  const { player: updated, events } = applyThrow(curPlayer, throwType, value);
  state.players[curIndexInPlayers] = updated;

  if (events.includes("WIN_50")) {
    state.ended = true;
    saveState(state);
    return { playerAfter: updated, events, win: true };
  }

  const nxt = nextTurn();
  saveState(state);
  return { playerAfter: updated, events, next: nxt };
}

// ---------- Pysyvyys ----------
export function loadOrInit() {
  const loaded = loadState();
  state = loaded ?? createEmptyState();
  history = loadHistory();
  saveState(state);
  return !!loaded;
}
export function hasSavedGame(){ return !!loadState(); }

// ---------- UNDO ----------
export function canUndo(){ return history.length > 0; }
export function undoLastAction(){
  const prev = popHistory();
  if (!prev) return false;
  state = prev;
  saveState(state);
  return true;
}
