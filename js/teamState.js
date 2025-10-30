// teamState.js — JOUKKUEPELIN tila, vuorotus ja pysyvyys + UNDO + reset + remove
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

/* ---------- Sanitointi & duplikaattien kanonisointi ---------- */
function sanitizeName(raw) {
  return String(raw || "")
    .replace(/[<>"]/g, "")   // karkeat XSS-merkinnät pois
    .replace(/\s+/g, " ")    // monivälit -> yksi väli
    .trim()
    .slice(0, 40);           // pituusraja
}
const canon = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

/* ---------- Storage ---------- */
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

/* ---------- teamOrder-synkka ---------- */
function ensureTeamOrderSync(){
  const should = state.teams.map((_, i) => i);
  if (state.teamOrder.length !== should.length || !should.every(i => state.teamOrder.includes(i))){
    state.teamOrder = should;
  }
}

/* ---------- Public API ---------- */
export function loadOrInit(){
  const loaded = loadState();
  state = loaded ?? createEmptyState();
  history = loadHistory();
  ensureTeamOrderSync();
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

export function newGameSameRoster(){
  pushHistory();
  state.teams.forEach(t => {
    t.score = 0; t.active = true;
    t.players.forEach(p => { p.score = 0; p.misses = 0; p.active = true; });
  });
  state.teamTurn = 0;
  state.playerTurns = {};
  state.ended = false;
  saveState();
}

/* ---------- TIIMIT & PELAAJAT ---------- */
export function addTeam(name){
  const nm = sanitizeName(name);
  if (!nm) return false;
  if (state.teams.some(t => canon(t.name) === canon(nm))) return false;

  pushHistory();

  state.teams.push({ id: newId(), name: nm, score: 0, active: true, players: [] });

  const newIdx = state.teams.length - 1;
  if (!state.teamOrder.length) {
    state.teamOrder = state.teams.map((_, i) => i);
  } else if (!state.teamOrder.includes(newIdx)) {
    state.teamOrder.push(newIdx);
  }

  state.selectedTeam = newIdx;
  if (state.playerTurns[newIdx] == null) state.playerTurns[newIdx] = 0;

  state.ended = false;
  saveState();
  return true;
}

export function setSelectedTeam(idx){
  if (idx >= 0 && idx < state.teams.length){ state.selectedTeam = idx; saveState(); return true; }
  return false;
}

export function addPlayerToSelectedTeam(name){
  const nm = sanitizeName(name);
  if (!nm) return { ok:false, error:"Anna pelaajan nimi." };
  const tIdx = state.selectedTeam;
  if (tIdx == null) return { ok:false, error:"Valitse ensin tiimi." };
  const team = state.teams[tIdx];
  if (!team) return { ok:false, error:"Virheellinen tiimi." };
  if (team.players.some(p => canon(p.name) === canon(nm)))
    return { ok:false, error:"Nimi jo käytössä tässä tiimissä." };

  pushHistory();
  team.players.push({ ...createPlayerState(nm), id: newId() });
  if (state.playerTurns[tIdx] == null) state.playerTurns[tIdx] = 0;
  saveState();
  return { ok:true };
}

/* ---------- Poista-toiminnot ---------- */
export function removePlayer(teamIdx, playerIdx){
  if (teamIdx == null || playerIdx == null) return false;
  const team = state.teams[teamIdx]; if (!team) return false;
  if (!team.players[playerIdx]) return false;

  pushHistory();

  // Jos poistetaan nykyinen heittäjä, siirretään vuoro eteenpäin
  const isCurrentTeam = state.teamOrder[state.teamTurn] === teamIdx;
  const curP = state.playerTurns[teamIdx] ?? 0;
  const removingCurrent = isCurrentTeam && curP === playerIdx;

  team.players.splice(playerIdx, 1);

  // Säädä playerTurn indeksiä
  if (!team.players.length){
    team.active = false;
    delete state.playerTurns[teamIdx];
  } else {
    let pt = state.playerTurns[teamIdx] ?? 0;
    if (playerIdx < pt) pt = Math.max(0, pt - 1);
    if (pt >= team.players.length) pt = 0;
    state.playerTurns[teamIdx] = pt;
  }

  // Jos poistettiin juuri vuorossa ollut pelaaja, koita löytää uusi current
  if (removingCurrent){
    // Jos tiimissä on vielä aktiivisia, pysy tässä tiimissä, muuten siirry seuraavaan turniin
    const hasActive = team.players.some(p => p.active);
    if (!hasActive) team.active = false;
  }

  // Jos kaikki tiimit kuolleet -> peli päättyy
  if (state.teams.every(t => !t.active || t.players.every(p => !p.active))){
    state.ended = true;
  }

  // Jos poistettiin viimeinen tiimin pelaaja ja current osoitti tähän tiimiin, siirretään seuraavaan tiimiin
  if ((!team.players.length || !team.active) && state.teamOrder[state.teamTurn] === teamIdx){
    // stepataan seuraavaan tiimiin, kunnes löytyy aktiivinen
    const len = state.teamOrder.length;
    for (let step=0; step<len; step++){
      state.teamTurn = (state.teamTurn + 1) % len;
      const tIdx2 = state.teamOrder[state.teamTurn];
      const t2 = state.teams[tIdx2];
      if (t2 && t2.active && t2.players.some(p=>p.active)) break;
    }
  }

  saveState();
  return true;
}

export function removeTeam(teamIdx){
  if (teamIdx == null) return false;
  if (!state.teams[teamIdx]) return false;

  pushHistory();

  // Poista tiimi
  state.teams.splice(teamIdx, 1);

  // Päivitä teamOrder indeksit
  state.teamOrder = state.teamOrder
    .filter(i => i !== teamIdx)
    .map(i => i > teamIdx ? i - 1 : i);

  // Päivitä playerTurns indeksit
  const newPT = {};
  Object.keys(state.playerTurns).forEach(k => {
    const idx = parseInt(k, 10);
    if (idx === teamIdx) return;
    const newIdx = idx > teamIdx ? idx - 1 : idx;
    newPT[newIdx] = state.playerTurns[idx];
  });
  state.playerTurns = newPT;

  // Säädä teamTurn
  if (state.teamTurn >= state.teamOrder.length) state.teamTurn = 0;

  // Korjaa selectedTeam
  if (state.selectedTeam != null){
    if (state.selectedTeam === teamIdx) state.selectedTeam = null;
    else if (state.selectedTeam > teamIdx) state.selectedTeam -= 1;
  }

  ensureTeamOrderSync();

  // Jos ei yhtään tiimiä -> resetoi perusosoittimet
  if (!state.teams.length){
    state.teamOrder = [];
    state.teamTurn = 0;
    state.playerTurns = {};
    state.ended = false;
  }

  saveState();
  return true;
}

/* ---------- ARVONTA ---------- */
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

/* ---------- KUKA HEITTÄÄ? ---------- */
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

/* ---------- SEURAAVA ---------- */
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

/* ---------- HEITTO (pisteet tiimille, hudit pelaajalle) ---------- */
export function applyThrowToCurrent(throwType, value){
  if (state.ended) return { error:"Peli on jo päättynyt." };
  const cur = getCurrent();
  if (!cur){ return { error:"Ei vuoroa. Lisää tiimit & pelaajat ja paina 'Arvo aloitusjärjestys'." }; }

  const { teamIdx, team, playerIdx } = cur;
  const player = team.players[playerIdx];

  pushHistory();

  const { player: updatedPlayer, events } = applyThrow(player, throwType, value);
  team.players[playerIdx] = updatedPlayer;

  if (throwType !== ThrowType.MISS){
    const gained = value; // 1..12 (tai 2..12)
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
