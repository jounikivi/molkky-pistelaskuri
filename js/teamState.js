// teamState.js — JOUKKUEPELIN tila, vuorotus ja pysyvyys + UNDO + reset-tilat
import { ThrowType, applyThrow, createPlayerState, applyScoreRules } from "./rules.js";

const STORAGE_KEY   = "molkky:team:state:v1";
const HISTORY_KEY   = "molkky:team:history:v1";
const HISTORY_LIMIT = 50;

const deepCopy = (o) => JSON.parse(JSON.stringify(o));

function createEmptyState(){
  return {
    teams: [],
    teamOrder: [],
    teamTurn: 0,
    playerTurns: {},          // { [teamIdx]: playerIdx }
    ended: false,
    selectedTeam: null
  };
}

let state   = createEmptyState();
let history = [];
let nextId  = 1;
const newId = () => nextId++;

// ---------- Storage ----------
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

// ---------- Public API ----------
export function loadOrInit(){
  const loaded = loadState();
  state = loaded ?? createEmptyState();
  history = loadHistory();
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
export function resetAll(){ pushHistory(); state = createEmptyState(); saveState(); }

// UUSI: resetoi pisteet & hutiputket, mutta säilytä kokoonpano
export function newGameSameRoster(){
  pushHistory();
  state.teams.forEach(t => {
    t.score = 0; t.active = true;
    t.players.forEach(p => { p.score = 0; p.misses = 0; p.active = true; });
  });
  // Arvonta jätetään käyttäjälle (painike), mutta nollataan osoittimet
  state.teamTurn = 0;
  state.playerTurns = {};
  state.ended = false;
  saveState();
}

// TIIMIT & PELAAJAT
export function addTeam(name){
  const nm = String(name||"").trim();
  if (!nm) return false;
  if (state.teams.some(t => t.name.toLowerCase() === nm.toLowerCase())) return false;

  pushHistory();
  state.teams.push({ id: newId(), name: nm, score: 0, active: true, players: [] });
  state.selectedTeam = state.teams.length - 1;
  if (!state.teamOrder.length){
    state.teamOrder = state.teams.map((_, i) => i);
    state.teamTurn = 0;
  }
  saveState();
  return true;
}

export function setSelectedTeam(idx){
  if (idx >= 0 && idx < state.teams.length){ state.selectedTeam = idx; saveState(); return true; }
  return false;
}

export function addPlayerToSelectedTeam(name){
  const nm = String(name||"").trim();
  if (!nm) return { ok:false, error:"Anna pelaajan nimi." };
  const tIdx = state.selectedTeam;
  if (tIdx == null) return { ok:false, error:"Valitse ensin tiimi." };
  const team = state.teams[tIdx];
  if (!team) return { ok:false, error:"Virheellinen tiimi." };
  if (team.players.some(p => p.name.toLowerCase() === nm.toLowerCase()))
    return { ok:false, error:"Nimi jo käytössä tässä tiimissä." };

  pushHistory();
  team.players.push({ ...createPlayerState(nm), id: newId() });
  if (state.playerTurns[tIdx] == null) state.playerTurns[tIdx] = 0;
  saveState();
  return { ok:true };
}

// ARVONTA
export function shuffleOrder(){
  if (state.teams.length < 2) throw new Error("Lisää vähintään kaksi tiimiä.");
  if (state.teams.some(t => t.players.length === 0)) throw new Error("Jokaisessa tiimissä oltava vähintään 1 pelaaja.");
  pushHistory();

  state.teamOrder = state.teams.map((_, i)=>i);
  for (let i = state.teamOrder.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [state.teamOrder[i], state.teamOrder[j]] = [state.teamOrder[j], state.teamOrder[i]];
  }
  state.playerTurns = {};
  state.teams.forEach((_, idx) => state.playerTurns[idx] = 0);
  state.teamTurn = 0;
  state.ended = false;
  saveState();
  return getCurrent();
}

// KUKA HEITTÄÄ?
export function getCurrent(){
  if (!state.teamOrder.length) return null;
  const teamIdx = state.teamOrder[state.teamTurn] ?? 0;
  const team = state.teams[teamIdx];
  if (!team || !team.active) return null;

  const pIdx = state.playerTurns[teamIdx] ?? 0;
  const player = team.players[pIdx] ?? null;
  if (!player || !player.active) return null;
  return { teamIdx, team, playerIdx: pIdx, player };
}

// SEURAAVA
function nextTurn(){
  if (state.teams.every(t => !t.active || t.players.every(p => !p.active))){
    state.ended = true; saveState(); return null;
  }
  const len = state.teamOrder.length;
  for (let step=0; step<len; step++){
    state.teamTurn = (state.teamTurn + 1) % len;
    const teamIdx = state.teamOrder[state.teamTurn];
    const team = state.teams[teamIdx];

    if (!team.active) continue;
    const players = team.players;
    if (!players.length) continue;

    // etsi seuraava aktiivinen pelaaja
    let pIdx = state.playerTurns[teamIdx] ?? 0;
    for (let round=0; round<players.length; round++){
      pIdx = (pIdx + 1) % players.length;
      if (players[pIdx]?.active){ state.playerTurns[teamIdx] = pIdx; saveState(); return getCurrent(); }
    }
  }
  saveState();
  return getCurrent();
}

// HEITTO (pisteet tiimille, hutit pelaajalle)
export function applyThrowToCurrent(throwType, value){
  if (state.ended) return { error:"Peli on jo päättynyt." };
  const cur = getCurrent();
  if (!cur){ return { error:"Ei vuoroa. Lisää tiimit & pelaajat ja paina 'Arvo aloitusjärjestys'." }; }

  const { teamIdx, team, playerIdx } = cur;
  const player = team.players[playerIdx];

  pushHistory();

  const { player: updatedPlayer, events } = applyThrow(player, throwType, value);
  team.players[playerIdx] = updatedPlayer;

  let gained = 0;
  if (throwType !== ThrowType.MISS){
    // pisteet = value (1..12 tai 2..12); Mölkyn erikoissäännöt tiimin kokonaissaldoon
    gained = value;
    const { score, win, bounced } = applyScoreRules(team.score, gained);
    team.score = score;
    if (bounced && !events.includes("BOUNCE_TO_25")) events.push("BOUNCE_TO_25");
    if (win && !events.includes("WIN_50")) events.push("WIN_50");
  }

  if (team.players.every(p => !p.active)) team.active = false;

  if (events.includes("WIN_50")){
    state.ended = true; saveState();
    return { teamAfter: team, playerAfter: updatedPlayer, events, win:true };
  }

  const nxt = nextTurn();
  saveState();
  return { teamAfter: team, playerAfter: updatedPlayer, events, next:nxt };
}
