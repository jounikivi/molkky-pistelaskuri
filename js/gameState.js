// gameState.js — Pelitila, vuorotus ja localStorage-pysyvyys
// Riippuu vain rules.js:stä (pure rules + tämä tila = helppo testata)

import {
  ThrowType,
  createPlayerState,
  applyThrow,
} from "./rules.js";

// ------------ LocalStorage apurit ------------
const STORAGE_KEY = "molkky:state:v1";

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Kevyt validointi
    if (!parsed || !Array.isArray(parsed.players)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ------------ Pelitila ------------
/**
 * gameState: {
 *   players: Array<{ name, score, misses, active }>,
 *   order:   Array<number>, // indeksit players-taulukkoon (arvottu)
 *   turn:    number,        // osoitin order-taulukossa
 *   ended:   boolean
 * }
 */
function createEmptyState() {
  return {
    players: [],
    order: [],
    turn: 0,
    ended: false,
  };
}

let state = createEmptyState();

// ------------ Julkinen API ------------

/** Palauta koko tila (kopiona) */
export function getState() {
  return JSON.parse(JSON.stringify(state));
}

/** Lisää pelaaja (nimen tulee olla uniikki case-insensitive). Palauttaa true/false. */
export function addPlayer(name) {
  const nm = String(name ?? "").trim();
  if (!nm) return false;
  if (state.players.some(p => p.name.toLowerCase() === nm.toLowerCase())) return false;

  state.players.push(createPlayerState(nm));
  state.ended = false;
  if (!state.order.length) {
    // ennen arvontaa pidetään luonnollista järjestystä
    state.order = state.players.map((_, i) => i);
    state.turn = 0;
  }
  saveState(state);
  return true;
}

/** Poista kaikki / aloita alusta */
export function resetAll() {
  state = createEmptyState();
  saveState(state);
}

/** Arvo aloittaja ja pelijärjestys (Fisher–Yates) */
export function startGameShuffleOrder() {
  if (state.players.length < 2) throw new Error("Lisää vähintään kaksi pelaajaa.");
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

/** Nykyinen pelaaja (olio) tai null, jos ei löydy */
export function getCurrentPlayer() {
  if (!state.order.length) return null;
  const idx = state.order[state.turn] ?? 0;
  return state.players[idx] ?? null;
}

/** Siirry seuraavaan aktiiviseen pelaajaan. Palauttaa nykyisen pelaajan tai null. */
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
  // varmistus
  saveState(state);
  return getCurrentPlayer();
}

/**
 * Lisää heitto nykyiselle pelaajalle käyttäen rules.js:n sääntöjä.
 * @param {"MISS"|"SINGLE_PIN"|"MULTI_PINS"} throwType
 * @param {number} value
 * @returns {object} { playerAfter, events }
 */
export function applyThrowToCurrentPlayer(throwType, value) {
  if (state.ended) return { error: "Peli on jo päättynyt." };
  const curIndexInPlayers = state.order[state.turn];
  const curPlayer = state.players[curIndexInPlayers];
  if (!curPlayer) return { error: "Ei pelaajaa vuorossa." };
  if (!curPlayer.active) {
    // hypätään varmuudeksi eteenpäin
    const nxt = nextTurn();
    return { error: "Pelaaja ei ole aktiivinen.", next: nxt };
  }

  const { player: updated, events } = applyThrow(curPlayer, throwType, value);
  state.players[curIndexInPlayers] = updated;

  // Päätä peli heti voitosta
  if (events.includes("WIN_50")) {
    state.ended = true;
    saveState(state);
    return { playerAfter: updated, events, win: true };
  }

  // Jos pelaaja eliminoitiin (3 hutia), hän jää aktiiviseksi=false
  // Vuoro etenee seuraavalle aktiiviselle
  const nxt = nextTurn();
  saveState(state);
  return { playerAfter: updated, events, next: nxt };
}

/** Lataa tallennettu tila, tai aloita tyhjällä. Palauttaa latauksen onnistumisen. */
export function loadOrInit() {
  const loaded = loadState();
  if (loaded) {
    state = loaded;
    return true;
  }
  state = createEmptyState();
  saveState(state);
  return false;
}

/** Manuaalinen “jatka peliä” – tarkasta onko peli käynnissä */
export function hasSavedGame() {
  return !!loadState();
}
