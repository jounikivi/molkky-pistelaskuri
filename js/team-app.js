/* team-app.js — Joukkuepeli (v2.3.3: Nollaa peli -napit) */

import { applyScoreRules, createPlayerState } from "./rules.js";
import { canonName, getLatestHistoryEntry, sanitizeName } from "./shared.js";
import {
  applyTeamThrowToTeam,
  getNextActivePlayerIndex,
  getNextTeamTurnIndex,
  recomputeTeamFromHistory,
  shouldEndTeamGame
} from "./state-utils.js";

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m => (
    { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]
  ));
}

const LS_TEAM_KEY = "molkky_team_v233";
const defaultTeamState = () => ({
  teams: [], order: [], teamTurnIdx: 0, playerTurnIdx: 0, ended:false,
  createdAt: Date.now(), updatedAt: Date.now()
});
let T = loadT();

function loadT(){
  try{
    const raw = localStorage.getItem(LS_TEAM_KEY);
    if(!raw) return defaultTeamState();
    const d = JSON.parse(raw);
    d.teams ??= [];
    d.teams.forEach(t=>{
      t.id ||= tuid();
      t.name = String(t.name ?? "");
      t.score ??= 0; t.active ??= true;
      t.nextPlayerIdx ??= 0;
      t.players ??= [];
      t.players.forEach(p=>{
        p.id ||= tuid();
        p.name = String(p.name ?? "");
        p.active ??= true; p.misses ??= 0; p.history ??= [];
      });
    });
    d.order ??= d.teams.map(t=>t.id);
    d.teamTurnIdx ??= 0; d.playerTurnIdx ??= 0; d.ended ??= false;
    return d;
  }catch{ return defaultTeamState(); }
}
function saveT(){ T.updatedAt = Date.now(); localStorage.setItem(LS_TEAM_KEY, JSON.stringify(T)); }

const tuid = () => Math.random().toString(36).slice(2,10);
const getTeam = id => T.teams.find(t=>t.id===id);
const aliveTeams = () => T.teams.filter(t=>t.active);
const teamReady = (t) => !!(t?.players?.some(p=>p.active));
const teamsReadyCount = () => aliveTeams().filter(teamReady).length;

function currentTeam(){
  if(T.ended || !T.order.length) return null;
  let idx = T.teamTurnIdx % T.order.length;
  for(let i=0;i<T.order.length;i++){
    const t = getTeam(T.order[(idx+i)%T.order.length]);
    if(t?.active){ T.teamTurnIdx = (idx+i)%T.order.length; return t; }
  }
  return null;
}
function currentPlayerTeamScoped(){
  const team = currentTeam(); if(!team) return { team:null, player:null };
  if(!team.players?.length) return { team, player:null };
  const idx = getNextActivePlayerIndex(team.players, team.nextPlayerIdx ?? 0);
  if(idx >= 0){
    team.nextPlayerIdx = idx;
    return { team, player:team.players[idx] };
  }
  return { team, player:null };
}
function nextTurnTeam(){
  const team = currentTeam(); if(!team) return;
  if(team.players?.length){
    const currentIdx = team.players.findIndex(p=>p.id === currentPlayerTeamScoped().player?.id);
    const nextIdx = getNextActivePlayerIndex(team.players, currentIdx + 1);
    team.nextPlayerIdx = nextIdx >= 0 ? nextIdx : 0;
  }
  T.teamTurnIdx = getNextTeamTurnIndex(T.teams, T.order, T.teamTurnIdx);
}

function tstatsFromTeam(t){
  const all = (t.players ?? []).flatMap(p=>p.history ?? []);
  const throws = all.length;
  const sum = all.reduce((a,h)=>a+(Number(h.score)||0),0);
  const misses = all.reduce((a,h)=>a+(h.score===0?1:0),0);
  const avg = throws ? sum/throws : 0;
  const missPct = throws ? (100*misses/throws) : 0;
  return { throws, avg, missPct };
}
function pstats(p){
  const throws = p.history?.length ?? 0;
  const sum = (p.history ?? []).reduce((a,h)=>a+(Number(h.score)||0),0);
  const misses = (p.history ?? []).reduce((a,h)=>a+(h.score===0?1:0),0);
  const avg = throws ? sum/throws : 0;
  const missPct = throws ? (100*misses/throws) : 0;
  return { throws, avg, missPct };
}
function sumScore(history){ return (history ?? []).reduce((a,h)=>a+(Number(h.score)||0),0); }

function recomputeTeamState(team){
  Object.assign(team, recomputeTeamFromHistory(team));
}

function getLatestTeamThrow(){
  const candidates = T.teams.flatMap((team, teamIndex)=>
    (team.players ?? []).map((player, playerIndex)=>({
      team,
      teamIndex,
      player,
      playerIndex,
      history: player.history
    }))
  );
  return getLatestHistoryEntry(candidates);
}

function hasTeamGameStarted(){
  return T.teams.some(team => team.players?.some(player => player.history?.length));
}

function getTeamRanking(){
  return [...T.teams].sort((a, b)=>{
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if(scoreDiff) return scoreDiff;
    const activeDiff = Number(b.active) - Number(a.active);
    if(activeDiff) return activeDiff;
    return String(a.name || "").localeCompare(String(b.name || ""), "fi");
  });
}

/* --------------------- DOM --------------------- */
const el = {
  grid: document.getElementById("teamsGrid"),
  empty: document.getElementById("emptyState"),
  teamSetupCard: document.getElementById("teamSetupCard"),
  teamName: document.getElementById("teamName"),
  addTeam: document.getElementById("addTeam"),
  teamLockNotice: document.getElementById("teamLockNotice"),
  shuffle: document.getElementById("shuffle"),
  shuffleAlt: document.getElementById("shuffleAlt"),
  undo: document.getElementById("undo"),
  undoAlt: document.getElementById("undoAlt"),
  free: document.getElementById("freeInput"),
  go: document.getElementById("submitFree"),
  turnTitle: document.getElementById("turnTitle"),
  matchSummary: document.getElementById("matchSummary"),
  winModal: document.getElementById("winModal"),
  winText: document.getElementById("winText"),
  winSame: document.getElementById("winSame"),
  winFresh: document.getElementById("winFresh"),
  winClose: document.getElementById("winClose"),
  missModal: document.getElementById("missModal"),
  missTitle: document.getElementById("missTitle"),
  missText: document.getElementById("missText"),
  missContinue: document.getElementById("missContinue"),
  missEliminate: document.getElementById("missEliminate"),
  confirmModal: document.getElementById("confirmModal"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmText: document.getElementById("confirmText"),
  confirmCancel: document.getElementById("confirmCancel"),
  confirmOk: document.getElementById("confirmOk"),
  entryModal: document.getElementById("entryModal"),
  entryTitle: document.getElementById("entryTitle"),
  entryText: document.getElementById("entryText"),
  entryInput: document.getElementById("entryInput"),
  entryCancel: document.getElementById("entryCancel"),
  entrySave: document.getElementById("entrySave"),
  toast: document.getElementById("toast"),
  reset: document.getElementById("reset"),
  resetAlt: document.getElementById("resetAlt"),
};

let pendingMissDecision = null;
let lastFocusedBeforeMissModal = null;
let pendingConfirmDecision = null;
let lastFocusedBeforeConfirmModal = null;
let pendingEntryRequest = null;
let lastFocusedBeforeEntryModal = null;

/* --------------------- RENDER --------------------- */
function trender(){
  trenderTurn(); trenderMatchSummary(); trenderTeams(); trenderControls(); saveT();
}
function trenderTurn(){
  if(T.ended){ el.turnTitle.textContent = "Peli päättynyt"; return; }
  const { team, player } = currentPlayerTeamScoped();
  if(team && player) el.turnTitle.textContent = `Vuorossa: ${team.name} – ${player.name}`;
  else if(team && !team.players?.length) el.turnTitle.textContent = `Vuorossa: ${team.name} – lisää pelaajia tiimiin`;
  else if(team) el.turnTitle.textContent = `Vuorossa: ${team.name}`;
  else el.turnTitle.textContent = "Vuorossa: –";
}
function trenderMatchSummary(){
  if(!el.matchSummary) return;
  if(!T.teams.length){
    el.matchSummary.innerHTML = `<div class="match-summary__empty muted">Pelitilanne näkyy tässä, kun tiimit on lisätty.</div>`;
    return;
  }

  const ranking = getTeamRanking();
  const current = currentTeam();
  const leader = ranking[0];

  el.matchSummary.innerHTML = `
    <div class="match-summary__header">
      <div class="match-summary__title">Pelitilanne</div>
      <div class="match-summary__leader">Johdossa: <strong>${escapeHtml(leader?.name ?? "–")}</strong> (${leader?.score ?? 0})</div>
    </div>
    <ol class="match-summary__list">
      ${ranking.map((team, index)=>`
        <li class="match-summary__item ${team.id === current?.id ? "is-current" : ""} ${!team.active ? "is-eliminated" : ""}">
          <span class="match-summary__place">${index + 1}.</span>
          <span class="match-summary__name">${escapeHtml(team.name)}</span>
          <span class="match-summary__score">${team.score ?? 0}</span>
          <span class="match-summary__badges">
            ${team.id === current?.id ? `<span class="match-summary__badge match-summary__badge--turn">Vuorossa</span>` : ""}
            ${!team.active ? `<span class="match-summary__badge match-summary__badge--out">Ei aktiivisia pelaajia</span>` : ""}
          </span>
        </li>
      `).join("")}
    </ol>
  `;
}
function trenderTeams(){
  const grid = el.grid; if(!grid) return;
  const rosterLocked = hasTeamGameStarted();
  grid.innerHTML="";
  if(!T.teams.length){ el.empty?.classList.remove("hidden"); return; }
  el.empty?.classList.add("hidden");

  T.teams.forEach(team=>{
    const ts = tstatsFromTeam(team);

    const playersHtml = (team.players ?? []).map(p=>{
      const ps = pstats(p);
      return `
        <li class="team-player-row ${p.active ? "" : "muted"}">
          <div class="team-player-main">
            <span class="team-player-name">${escapeHtml(p.name)}</span>
            <button class="btn small danger" data-remove-player data-team-id="${team.id}" data-player-id="${p.id}" title="Poista">🗑</button>
          </div>
          <span class="chips team-player-stats">
            <span class="chip chip--score">🥇 ${sumScore(p.history)}</span>
            <span class="chip">${ps.throws}</span>
            <span class="chip chip--miss">${Math.round(ps.missPct)}%</span>
          </span>
        </li>
      `;
    }).join("");

    const card = document.createElement("article");
    card.className = "team-card";
    card.classList.toggle("card--eliminated", !team.active);
    card.innerHTML = `
      <div class="card__header">
        <div class="card__title">${escapeHtml(team.name)}</div>
        <div class="chips">
          <span class="chip chip--score">🥇 ${team.score ?? 0}</span>
          <span class="chip">${ts.throws} heittoa</span>
          <span class="chip chip--avg">${ts.avg.toFixed(1)}</span>
          <span class="chip chip--miss">${Math.round(ts.missPct)}% huti</span>
        </div>
      </div>
      <div class="card__body">
        <div class="card__score">Pisteet: ${team.score ?? 0}</div>
        ${(team.players?.length)
          ? `<ul class="list thin team-player-list">${playersHtml}</ul>`
          : `<p class="muted" style="margin:.5rem 0">Ei pelaajia. Lisää pelaajia tiimiin.</p>`}
        <div class="team-card__actions">
          <button class="btn small ok" data-add-player data-team-id="${team.id}" ${rosterLocked ? "disabled" : ""}>Lisää pelaaja</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
function trenderControls(){
  const canShuffle = teamsReadyCount() >= 2 && !T.ended;
  const canUndo = T.teams.some(t=>t.players?.some(p=>p.history?.length)) && !T.ended;
  const rosterLocked = hasTeamGameStarted();
  [el.shuffle, el.shuffleAlt].forEach(b=>b&&(b.disabled=!canShuffle));
  [el.undo, el.undoAlt].forEach(b=>b&&(b.disabled=!canUndo));
  el.teamSetupCard?.classList.toggle("hidden", rosterLocked);
  if(el.addTeam) el.addTeam.disabled = rosterLocked;
  if(el.teamName) el.teamName.disabled = rosterLocked;
  el.teamLockNotice?.classList.toggle("hidden", !rosterLocked);
}

/* --------------------- ACTIONS --------------------- */
function addTeam(){
  if(hasTeamGameStarted()) return ttoast("Tiimejä ei voi lisätä kesken pelin");
  const name = sanitizeName(el.teamName?.value);
  if(!name) return ttoast("Anna tiimin nimi");
  if(T.teams.some(team => canonName(team.name) === canonName(name))){
    return ttoast("Tiimi on jo lisätty");
  }
  const team = { id:tuid(), name, score:0, active:true, nextPlayerIdx:0, players:[] };
  T.teams.push(team);
  T.order = T.teams.map(t=>t.id);
  el.teamName.value = "";
  trender();
}

function addPlayerToTeam(teamId, name){
  if(hasTeamGameStarted()){
    ttoast("Pelaajia ei voi lisätä kesken pelin");
    return;
  }
  const team = getTeam(teamId); if(!team) return;
  const nextNum = (team.players?.length ?? 0) + 1;
  const cleanName = sanitizeName(name || `Pelaaja ${nextNum}`) || `Pelaaja ${nextNum}`;
  if(team.players.some(player => canonName(player.name) === canonName(cleanName))){
    ttoast("Pelaaja on jo tiimissä");
    return;
  }
  const newP = {
    id: tuid(),
    name: cleanName,
    ...createPlayerState(cleanName),
    history: []
  };
  team.players = team.players || [];
  team.players.push(newP);
  team.active = true;
  if(team.players.length === 1) team.nextPlayerIdx = 0;
  saveT(); trender();
}

function removePlayer(teamId, playerId){
  const team = getTeam(teamId); if(!team) return;
  const idx = team.players?.findIndex(p=>p.id===playerId);
  if(idx == null || idx < 0) return;

  team.players.splice(idx,1);

  if(team.players.length === 0){
    team.nextPlayerIdx = 0;
  } else if(team.nextPlayerIdx >= team.players.length){
    team.nextPlayerIdx = team.players.length - 1;
  }

  recomputeTeamState(team);

  if(T.order[T.teamTurnIdx] === teamId && !team.active){
    const nextReadyIdx = T.order.findIndex(id => getTeam(id)?.active);
    T.teamTurnIdx = nextReadyIdx >= 0 ? nextReadyIdx : 0;
  }

  if(shouldEndTeamGame(T.teams)) T.ended = true;

  saveT(); trender();
}

async function submitThrowTeam(n){
  if(T.ended) return;
  if(pendingMissDecision) return;
  const { team, player } = currentPlayerTeamScoped();

  if(!team){ ttoast("Lisää ensin tiimejä"); return; }
  if(!player){ ttoast("Lisää pelaajia tiimiin"); return; }

  const val = Number(n)||0;
  const previousScore = team.score || 0;
  const isMiss = val===0;
  let missDecision = null;
  if(isMiss){
    player.misses=(player.misses||0)+1;
    if(player.misses>=3){
      const shouldContinue = await askMissDecision(player.name);
      missDecision = shouldContinue ? "continue" : "eliminate";
      if(shouldContinue){
        player.misses = 0;
        ttoast(`${player.name} jatkaa peliä`);
      } else {
        player.active=false;
        ttoast(`${player.name} tippui (3 hutia)`);
      }
    }
  } else {
  }
  const applied = applyTeamThrowToTeam(team, player.id, val, missDecision);
  Object.assign(team, applied.team);
  const playerIdx = applied.playerIndex;

  if(team.active){
    const res = applyScoreRules(previousScore, val);
    if(res.bounced) ttoast(`Yli 50 → 25`);
    if(res.win){ T.ended = true; openWin(`Tiimi ${team.name} saavutti 50 pistettä!`); trender(); return; }
  }

  if(shouldEndTeamGame(T.teams)){ T.ended=true; openWin(`Ei pelivalmiita tiimejä. Ei voittajaa.`); trender(); return; }

  nextTurnTeam(); trender();
}

function undoTeam(){
  const latest = getLatestTeamThrow();
  if(!latest) return;

  latest.player.history.pop();
  recomputeTeamState(latest.team);
  latest.team.nextPlayerIdx = latest.playerIndex;
  T.teamTurnIdx = latest.teamIndex;
  T.playerTurnIdx = 0;
  T.ended=false;
  closeWin();
  ttoast("Peruttu viimeisin heitto");
  trender();
}

/* ---------- Nollaus ---------- */
function newTeamFresh(){ T = defaultTeamState(); closeWin(); localStorage.setItem(LS_TEAM_KEY, JSON.stringify(T)); trender(); }
async function askReset(){
  const confirmed = await askConfirm({
    title: "Nollataanko peli?",
    text: "Tämä poistaa kaikki tiimit ja pisteet.",
    confirmLabel: "Nollaa peli"
  });
  if(!confirmed) return;
  newTeamFresh();
  ttoast("Peli nollattu");
}

/* ---------- WIN, TOAST & UI ---------- */
function openWin(txt){ el.winText.textContent=txt; el.winModal?.removeAttribute("hidden"); }
function closeWin(){ el.winModal?.setAttribute("hidden",""); }
function handleMissModalKeydown(event){
  if(!pendingMissDecision) return;
  if(event.key === "Escape"){
    event.preventDefault();
    el.missEliminate?.click();
    return;
  }
  if(event.key !== "Tab") return;

  const focusables = [el.missContinue, el.missEliminate].filter(Boolean);
  if(!focusables.length) return;

  const currentIndex = focusables.indexOf(document.activeElement);
  let nextIndex = currentIndex;

  if(event.shiftKey){
    nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
  } else {
    nextIndex = currentIndex === -1 || currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
  }

  event.preventDefault();
  focusables[nextIndex]?.focus();
}
function askMissDecision(playerName){
  if(!el.missModal || !el.missContinue || !el.missEliminate) return Promise.resolve(false);
  if(pendingMissDecision) return pendingMissDecision.promise;

  lastFocusedBeforeMissModal = document.activeElement;
  el.missTitle.textContent = "Kolme hutia";
  el.missText.textContent = `${playerName} on heittänyt 3 hutia peräkkäin. Jatkaako pelaaja pelissä vai tiputetaanko hänet?`;
  el.missModal.removeAttribute("hidden");
  el.missModal.addEventListener("keydown", handleMissModalKeydown);

  let resolveChoice;
  const promise = new Promise(resolve => {
    resolveChoice = resolve;
  });

  const onContinue = () => cleanup(true);
  const onEliminate = () => cleanup(false);
  const cleanup = (choice) => {
    el.missModal.setAttribute("hidden", "");
    el.missContinue.removeEventListener("click", onContinue);
    el.missEliminate.removeEventListener("click", onEliminate);
    el.missModal.removeEventListener("keydown", handleMissModalKeydown);
    pendingMissDecision = null;
    resolveChoice(choice);
    lastFocusedBeforeMissModal?.focus?.();
    lastFocusedBeforeMissModal = null;
  };

  el.missContinue.addEventListener("click", onContinue, { once:true });
  el.missEliminate.addEventListener("click", onEliminate, { once:true });
  pendingMissDecision = { promise };
  el.missContinue.focus();
  return promise;
}
function handleConfirmModalKeydown(event){
  if(!pendingConfirmDecision) return;
  if(event.key === "Escape"){
    event.preventDefault();
    el.confirmCancel?.click();
    return;
  }
  if(event.key !== "Tab") return;

  const focusables = [el.confirmCancel, el.confirmOk].filter(Boolean);
  if(!focusables.length) return;

  const currentIndex = focusables.indexOf(document.activeElement);
  let nextIndex = currentIndex;

  if(event.shiftKey){
    nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
  } else {
    nextIndex = currentIndex === -1 || currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
  }

  event.preventDefault();
  focusables[nextIndex]?.focus();
}
function askConfirm({ title, text, confirmLabel = "OK", cancelLabel = "Peruuta" } = {}){
  if(!el.confirmModal || !el.confirmCancel || !el.confirmOk) return Promise.resolve(false);
  if(pendingConfirmDecision) return pendingConfirmDecision.promise;

  lastFocusedBeforeConfirmModal = document.activeElement;
  el.confirmTitle.textContent = title || "Vahvista toiminto";
  el.confirmText.textContent = text || "";
  el.confirmCancel.textContent = cancelLabel;
  el.confirmOk.textContent = confirmLabel;
  el.confirmModal.removeAttribute("hidden");
  el.confirmModal.addEventListener("keydown", handleConfirmModalKeydown);

  let resolveChoice;
  const promise = new Promise(resolve => {
    resolveChoice = resolve;
  });

  const onCancel = () => cleanup(false);
  const onConfirm = () => cleanup(true);
  const cleanup = (choice) => {
    el.confirmModal.setAttribute("hidden", "");
    el.confirmCancel.removeEventListener("click", onCancel);
    el.confirmOk.removeEventListener("click", onConfirm);
    el.confirmModal.removeEventListener("keydown", handleConfirmModalKeydown);
    pendingConfirmDecision = null;
    resolveChoice(choice);
    lastFocusedBeforeConfirmModal?.focus?.();
    lastFocusedBeforeConfirmModal = null;
  };

  el.confirmCancel.addEventListener("click", onCancel, { once:true });
  el.confirmOk.addEventListener("click", onConfirm, { once:true });
  pendingConfirmDecision = { promise };
  el.confirmCancel.focus();
  return promise;
}
function handleEntryModalKeydown(event){
  if(!pendingEntryRequest) return;
  if(event.key === "Escape"){
    event.preventDefault();
    el.entryCancel?.click();
    return;
  }
  if(event.key === "Enter"){
    event.preventDefault();
    el.entrySave?.click();
    return;
  }
  if(event.key !== "Tab") return;

  const focusables = [el.entryInput, el.entryCancel, el.entrySave].filter(Boolean);
  if(!focusables.length) return;

  const currentIndex = focusables.indexOf(document.activeElement);
  let nextIndex = currentIndex;

  if(event.shiftKey){
    nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
  } else {
    nextIndex = currentIndex === -1 || currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
  }

  event.preventDefault();
  focusables[nextIndex]?.focus();
}
function askPlayerName({ title, text, defaultValue = "", confirmLabel = "Lisää pelaaja" } = {}){
  if(!el.entryModal || !el.entryInput || !el.entryCancel || !el.entrySave) return Promise.resolve(defaultValue);
  if(pendingEntryRequest) return pendingEntryRequest.promise;

  lastFocusedBeforeEntryModal = document.activeElement;
  el.entryTitle.textContent = title || "Lisää pelaaja";
  el.entryText.textContent = text || "";
  el.entryInput.value = defaultValue;
  el.entrySave.textContent = confirmLabel;
  el.entryModal.removeAttribute("hidden");
  el.entryModal.addEventListener("keydown", handleEntryModalKeydown);

  let resolveValue;
  const promise = new Promise(resolve => {
    resolveValue = resolve;
  });

  const onCancel = () => cleanup(null);
  const onSave = () => cleanup(el.entryInput.value);
  const cleanup = (value) => {
    el.entryModal.setAttribute("hidden", "");
    el.entryCancel.removeEventListener("click", onCancel);
    el.entrySave.removeEventListener("click", onSave);
    el.entryModal.removeEventListener("keydown", handleEntryModalKeydown);
    pendingEntryRequest = null;
    resolveValue(value);
    lastFocusedBeforeEntryModal?.focus?.();
    lastFocusedBeforeEntryModal = null;
  };

  el.entryCancel.addEventListener("click", onCancel, { once:true });
  el.entrySave.addEventListener("click", onSave, { once:true });
  pendingEntryRequest = { promise };
  el.entryInput.focus();
  el.entryInput.select();
  return promise;
}
function newTeamSame(){
  T.teams.forEach(t=>{
    t.score=0; t.active=true;
    t.players.forEach(p=>{ p.active=true; p.misses=0; p.history=[]; });
    t.nextPlayerIdx = 0;
  });
  T.teamTurnIdx=0; T.playerTurnIdx=0; T.ended=false; closeWin(); trender();
}
function ttoast(msg){ if(!el.toast) return; el.toast.textContent=msg; el.toast.classList.add("show"); setTimeout(()=>el.toast.classList.remove("show"),1400); }

/* ---------- Eventit ---------- */
el.addTeam?.addEventListener("click", addTeam);
[el.shuffle, el.shuffleAlt].forEach(b=>b?.addEventListener("click", ()=>{
  if(teamsReadyCount() < 2) return;
  const arr = [...T.teams.map(t=>t.id)];
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  T.teams.forEach(t=>{ t.nextPlayerIdx = 0; });
  T.order = arr; T.teamTurnIdx=0; T.playerTurnIdx=0; trender();
}));
[el.undo, el.undoAlt].forEach(b=>b?.addEventListener("click", undoTeam));
el.go?.addEventListener("click", ()=>{
  const v = (el.free?.value ?? "").trim(); if(v==="") return;
  const n = Number(v); if(Number.isNaN(n)||n<0||n>12){ ttoast("Syötä 0–12"); return; }
  submitThrowTeam(n); el.free.value="";
});
el.winSame?.addEventListener("click", newTeamSame);
el.winFresh?.addEventListener("click", newTeamFresh);
el.winClose?.addEventListener("click", closeWin);

/* Nollausnapit */
[el.reset, el.resetAlt].forEach(b=>b?.addEventListener("click", askReset));

/* Heittopaneeli delegoituna */
const tPad = document.getElementById("throwPad");
if(tPad && !tPad.dataset.bound){
  tPad.addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-score]"); if(!btn) return;
    const n = Number(btn.dataset.score || 0); if(Number.isNaN(n)) return;
    submitThrowTeam(n);
  });
  tPad.dataset.bound="1";
}

/* Kortin sisäiset napit: lisää/poista pelaaja */
el.grid?.addEventListener("click",(e)=>{
  const delBtn = e.target.closest("[data-remove-player]");
  if(delBtn){
    removePlayer(delBtn.getAttribute("data-team-id"), delBtn.getAttribute("data-player-id"));
    return;
  }
  const addBtn = e.target.closest("[data-add-player]");
  if(addBtn){
    e.preventDefault();
    const teamId = addBtn.getAttribute("data-team-id");
    const team = getTeam(teamId);
    const defaultName = `Pelaaja ${(team?.players?.length ?? 0) + 1}`;
    askPlayerName({
      title: "Lisää pelaaja",
      text: `Anna uuden pelaajan nimi tiimiin ${team?.name ?? ""}.`,
      defaultValue: defaultName,
      confirmLabel: "Lisää pelaaja"
    }).then(name => {
      if(name == null) return;
      addPlayerToTeam(teamId, name);
    });
  }
});

trender();
