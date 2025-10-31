// teamState.js — Joukkuepelin tila, vuorotus, UNDO, reset, loki
import { ThrowType, applyThrow, createPlayerState, applyScoreRules } from "./rules.js";

/* ---------- Storage ---------- */
const STORAGE_KEY   = "molkky:team:state:v1";
const HISTORY_KEY   = "molkky:team:history:v1";
const HISTORY_LIMIT = 50;

const deepCopy = (o) => JSON.parse(JSON.stringify(o));

/* ---------- State ---------- */
function createEmptyState() {
  return {
    teams: [],          // [{ id, name, score, active, players:[{ id,name,score,misses,active }] }]
    teamOrder: [],      // tiimi-indeksit vuorokiertoon
    current: null,      // { teamIdx, playerIdx } kun arvottu
    ended: false,
    logs: [],           // heittoloki
    _selectedTeam: null // UI:n apu: mille tiimille lisätään pelaaja
  };
}
let state   = createEmptyState();
let history = [];
let nextId  = 1;
const newId = () => nextId++;

/* ---------- Utils ---------- */
const canon = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
function sanitizeName(raw){
  return String(raw || "").replace(/[<>"]/g,"").replace(/\s+/g," ").trim().slice(0, 40);
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { const s = JSON.parse(raw); return (s && Array.isArray(s.teams)) ? s : null; }
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

/* ---------- LOKI ---------- */
const LOG_LIMIT = 300;
function addLog(entry){
  state.logs.push(entry);
  if (state.logs.length > LOG_LIMIT) state.logs.splice(0, state.logs.length - LOG_LIMIT);
}

/* ---------- Order eheys ---------- */
function ensureTeamOrderSync(){
  const should = state.teams.map((_, i)=>i);
  if (state.teamOrder.length !== should.length || !should.every(i => state.teamOrder.includes(i))) {
    state.teamOrder = should;
  }
  // current korjaus
  if (!state.current || state.teamOrder.length === 0) {
    state.current = null;
  } else {
    const { teamIdx, playerIdx } = state.current;
    if (teamIdx == null || !state.teams[teamIdx]) state.current = null;
    else if (playerIdx == null || !state.teams[teamIdx].players[playerIdx]) {
      state.current.playerIdx = 0;
    }
  }
}

/* ---------- Public API ---------- */
export function loadOrInit(){
  const loaded = loadState();
  state   = loaded ?? createEmptyState();
  history = loadHistory();

  ensureTeamOrderSync();

  // AUTOKORJAUS: jos ei tiimejä, peli ei voi olla päättynyt
  if (state.teams.length === 0) {
    state.ended = false;
    state.logs = [];
    state.current = null;
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
  state.teams.forEach(t => {
    t.score = 0; t.active = true;
    t.players.forEach(p => { p.score = 0; p.misses = 0; p.active = true; });
  });
  state.ended = false;
  state.logs = [];
  // säilytä teamOrder; aloita ensimmäisestä
  if (state.teamOrder.length && state.teams[state.teamOrder[0]]){
    state.current = { teamIdx: state.teamOrder[0], playerIdx: 0 };
  } else {
    state.current = null;
  }
  saveState();
}

/* ---- Tiimit ---- */
export function addTeam(name){
  const nm = sanitizeName(name);
  if (!nm) return false;
  if (state.teams.some(t => canon(t.name) === canon(nm))) return false;

  pushHistory();
  state.teams.push({ id: newId(), name: nm, score: 0, active: true, players: [] });
  ensureTeamOrderSync();
  state.ended = false;
  saveState();
  return true;
}
export function removeTeam(tIdx){
  if (tIdx == null || !state.teams[tIdx]) return false;
  pushHistory();

  const isCurrentTeam = state.current && state.current.teamIdx === tIdx;

  state.teams.splice(tIdx, 1);
  // order indeksit uusiksi
  state.teamOrder = state.teamOrder
    .filter(i => i !== tIdx)
    .map(i => i > tIdx ? i - 1 : i);

  if (!state.teams.length){
    state.current = null;
    state.ended = false;
    state.logs = [];
  } else if (isCurrentTeam) {
    // siirrä vuoro seuraavalle tiimille
    const nextTeamIdx = state.teamOrder[0] ?? 0;
    state.current = { teamIdx: nextTeamIdx, playerIdx: 0 };
  }
  saveState();
  return true;
}

export function setSelectedTeam(tIdx){
  if (tIdx == null || !state.teams[tIdx]) return false;
  state._selectedTeam = tIdx; saveState(); return true;
}

export function addPlayerToSelectedTeam(name){
  const tIdx = state._selectedTeam;
  if (tIdx == null || !state.teams[tIdx]) return { ok:false, error:"Valitse tiimi." };

  const nm = sanitizeName(name);
  if (!nm) return { ok:false, error:"Anna pelaajan nimi." };

  const team = state.teams[tIdx];
  if (team.players.some(p => canon(p.name) === canon(nm)))
    return { ok:false, error:"Nimi on jo tiimissä." };

  pushHistory();
  team.players.push({ ...createPlayerState(nm), id: newId() });

  // jos ei currentia ja tiimejä väh. 1 → valmius alkaa arvonnan jälkeen
  state.ended = false;
  saveState();
  return { ok:true };
}

export function removePlayer(tIdx, pIdx){
  const team = state.teams[tIdx];
  if (!team || !team.players[pIdx]) return false;
  pushHistory();

  // jos poistetaan juuri vuorossa oleva pelaaja
  const isCurrent = state.current
    && state.current.teamIdx === tIdx
    && state.current.playerIdx === pIdx;

  team.players.splice(pIdx, 1);

  if (team.players.length === 0) {
    // tiimissä ei pelaajia → pidä tiimi mutta aktivoidu vasta kun lisätään
    if (isCurrent) state.current = null;
  } else {
    // korjaa current.playerIdx
    if (isCurrent) state.current.playerIdx %= team.players.length;
  }

  saveState();
  return true;
}

/* ---- Arvonta & vuorotus ---- */
export function shuffleOrder(){
  // vaatii vähintään 2 tiimiä ja jokaisessa 1 pelaaja
  if (state.teams.length < 2 || !state.teams.every(t => t.players.length >= 1))
    throw new Error("Tarvitset vähintään 2 tiimiä ja 1 pelaajan per tiimi.");

  pushHistory();

  state.teamOrder = state.teams.map((_, i)=>i);
  for (let i = state.teamOrder.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [state.teamOrder[i], state.teamOrder[j]] = [state.teamOrder[j], state.teamOrder[i]];
  }
  state.current = { teamIdx: state.teamOrder[0], playerIdx: 0 };
  state.ended = false;
  state.logs = [];

  saveState();
  return getCurrent();
}

export function getCurrent(){
  if (!state.current) return null;
  const { teamIdx, playerIdx } = state.current;
  const team = state.teams[teamIdx];
  if (!team || !team.active || team.players.length === 0) return null;
  const player = team.players[playerIdx];
  if (!player || !player.active) return null;
  return { teamIdx, playerIdx, team, player };
}

function stepToNext(){
  if (!state.teamOrder.length || state.teams.every(t => !t.active || t.players.every(p => !p.active))){
    state.ended = true; saveState(); return null;
  }
  // siirretään aina seuraavaan tiimiin, ja siinä seuraavaan pelaajaan
  let tIndex = state.current ? state.current.teamIdx : (state.teamOrder[0] ?? 0);
  // etsi nykyinen tiimin paikka orderissa
  let pos = state.teamOrder.indexOf(tIndex);
  for (let loops=0; loops<state.teamOrder.length; loops++){
    pos = (pos + 1) % state.teamOrder.length;
    const nextTeamIdx = state.teamOrder[pos];
    const team = state.teams[nextTeamIdx];
    if (!team || !team.active || team.players.length === 0) continue;

    let pIdx = state.current && nextTeamIdx === state.current.teamIdx
      ? (state.current.playerIdx + 1) % team.players.length
      : 0;

    // etsi seuraava aktiivinen pelaaja
    for (let c=0; c<team.players.length; c++){
      const tryIdx = (pIdx + c) % team.players.length;
      if (team.players[tryIdx]?.active){
        state.current = { teamIdx: nextTeamIdx, playerIdx: tryIdx };
        saveState();
        return getCurrent();
      }
    }
    // jos tiimissä ei aktiivisia pelaajia → jatka seuraavaan tiimiin
  }
  saveState();
  return getCurrent();
}

/* ---- Heitto ---- */
export function applyThrowToCurrent(throwType, value){
  const cur = getCurrent();
  if (!cur){ return { error:"Ei vuoroa. Lisää tiimit & pelaajat ja arvo aloitusjärjestys." }; }

  pushHistory();

  const { teamIdx, playerIdx } = cur;
  const team   = state.teams[teamIdx];
  const player = team.players[playerIdx];

  const { player: updated, events } = applyThrow(player, throwType, value);
  team.players[playerIdx] = updated;

  let pointsAwarded = 0;

  if (throwType !== ThrowType.MISS){
    const gained = value;
    const { score, win, bounced } = applyScoreRules(team.score, gained);
    pointsAwarded = score - team.score;
    team.score = score;
    if (bounced && !events.includes("BOUNCE_TO_25")) events.push("BOUNCE_TO_25");
    if (win && !events.includes("WIN_50")) events.push("WIN_50");
  }

  if (events.includes("WIN_50")) {
    state.ended = true;
  }

  addLog({
    ts: Date.now(),
    teamId: team.id, teamName: team.name,
    playerId: updated.id, playerName: updated.name,
    type: throwType, value, points: pointsAwarded,
    teamScoreAfter: team.score,
    events
  });

  if (!state.ended) stepToNext();
  saveState();
  return { teamAfter: team, playerAfter: updated, events };
}
