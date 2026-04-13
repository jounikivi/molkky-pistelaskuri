/* app.js — Yksilöpeli (v2.1.1: Nollaa peli -napit) */

import { createPlayerState, applyScoreRules } from "./rules.js";
import { canonName, getLatestHistoryEntry, sanitizeName } from "./shared.js";
import {
  applySoloThrowToPlayer,
  getNextSoloTurnIndex,
  recomputePlayerFromHistory,
  shouldEndSoloGame
} from "./state-utils.js";

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m => (
    { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]
  ));
}

const LS_KEY = "molkky_solo_v210";
const defaultState = () => ({
  players: [], order: [], turnIndex: 0, ended: false,
  createdAt: Date.now(), updatedAt: Date.now()
});
let state = load();

function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return defaultState();
    const d = JSON.parse(raw);
    d.players ??= [];
    d.players.forEach(p=>{
      p.name = String(p.name ?? "");
      p.score ??= 0; p.active ??= true; p.misses ??= 0; p.history ??= [];
    });
    d.order ??= d.players.map(p=>p.id);
    d.turnIndex ??= 0; d.ended ??= false;
    return d;
  }catch{ return defaultState(); }
}
function save(){ state.updatedAt = Date.now(); localStorage.setItem(LS_KEY, JSON.stringify(state)); }

const uid = () => Math.random().toString(36).slice(2,10);
const getPlayer = id => state.players.find(p=>p.id===id);

function currentPlayer(){
  if(state.ended) return null;
  if(!state.order.length) return null;
  let idx = state.turnIndex % state.order.length;
  for(let i=0;i<state.order.length;i++){
    const p = getPlayer(state.order[(idx+i)%state.order.length]);
    if(p?.active) { state.turnIndex = (idx+i)%state.order.length; return p; }
  }
  return null;
}
function nextTurn(){
  state.turnIndex = getNextSoloTurnIndex(state.players, state.order, state.turnIndex);
}

function statsFromPlayer(p){
  const throws = p.history?.length ?? 0;
  const sum = (p.history ?? []).reduce((a,h)=>a+(Number(h.score)||0),0);
  const misses = (p.history ?? []).reduce((a,h)=>a+(h.score===0?1:0),0);
  const avg = throws ? sum/throws : 0;
  const missPct = throws ? (100*misses/throws) : 0;
  return { throws, avg, missPct };
}

function recomputePlayerState(p){
  Object.assign(p, recomputePlayerFromHistory(p));
}

function getLatestThrow(){
  return getLatestHistoryEntry(state.players.map((player, index)=>({ player, index, history: player.history })));
}

function hasSoloGameStarted(){
  return state.players.some(player => player.history?.length);
}

function getSoloRanking(){
  return [...state.players].sort((a, b)=>{
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if(scoreDiff) return scoreDiff;
    const activeDiff = Number(b.active) - Number(a.active);
    if(activeDiff) return activeDiff;
    return String(a.name || "").localeCompare(String(b.name || ""), "fi");
  });
}

const els = {
  playersGrid: document.getElementById("playersGrid"),
  emptyState: document.getElementById("emptyState"),
  playerSetupCard: document.getElementById("playerSetupCard"),
  playerName: document.getElementById("playerName"),
  addPlayer: document.getElementById("addPlayer"),
  playerLockNotice: document.getElementById("playerLockNotice"),
  shuffle: document.getElementById("shuffle"),
  shuffleAlt: document.getElementById("shuffleAlt"),
  undo: document.getElementById("undo"),
  undoAlt: document.getElementById("undoAlt"),
  freeInput: document.getElementById("freeInput"),
  submitFree: document.getElementById("submitFree"),
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
  toast: document.getElementById("toast"),
  reset: document.getElementById("reset"),
  resetAlt: document.getElementById("resetAlt"),
};

let pendingMissDecision = null;
let lastFocusedBeforeMissModal = null;

function render(){
  renderTurn();
  renderMatchSummary();
  renderPlayers();
  renderControls();
  save();
}
function renderTurn(){
  if(state.ended){ els.turnTitle.textContent = "Peli päättynyt"; return; }
  const p = currentPlayer();
  els.turnTitle.textContent = p ? `Vuorossa: ${p.name}` : "Vuorossa: –";
}
function renderMatchSummary(){
  if(!els.matchSummary) return;
  if(!state.players.length){
    els.matchSummary.innerHTML = `<div class="match-summary__empty muted">Pelitilanne näkyy tässä, kun pelaajat on lisätty.</div>`;
    return;
  }

  const ranking = getSoloRanking();
  const currentId = currentPlayer()?.id;
  const leader = ranking[0];

  els.matchSummary.innerHTML = `
    <div class="match-summary__header">
      <div class="match-summary__title">Pelitilanne</div>
      <div class="match-summary__leader">Johdossa: <strong>${escapeHtml(leader?.name ?? "–")}</strong> (${leader?.score ?? 0})</div>
    </div>
    <ol class="match-summary__list">
      ${ranking.map((player, index)=>`
        <li class="match-summary__item ${player.id === currentId ? "is-current" : ""} ${!player.active ? "is-eliminated" : ""}">
          <span class="match-summary__place">${index + 1}.</span>
          <span class="match-summary__name">${escapeHtml(player.name)}</span>
          <span class="match-summary__score">${player.score ?? 0}</span>
          <span class="match-summary__badges">
            ${player.id === currentId ? `<span class="match-summary__badge match-summary__badge--turn">Vuorossa</span>` : ""}
            ${!player.active ? `<span class="match-summary__badge match-summary__badge--out">Tippunut</span>` : ""}
          </span>
        </li>
      `).join("")}
    </ol>
  `;
}
function renderPlayers(){
  const grid = els.playersGrid; if(!grid) return;
  grid.innerHTML = "";
  if(!state.players.length){ els.emptyState?.classList.remove("hidden"); return; }
  els.emptyState?.classList.add("hidden");

  state.players.forEach(p=>{
    const s = statsFromPlayer(p);
    const card = document.createElement("article");
    card.className = "player-card";
    card.classList.toggle("card--eliminated", !p.active);
    card.innerHTML = `
      <div class="card__header">
        <div class="card__title">${escapeHtml(p.name)}</div>
        <div class="chips">
          <span class="chip chip--score">🥇 ${p.score ?? 0}</span>
          <span class="chip">${s.throws} heittoa</span>
          <span class="chip chip--avg">${s.avg.toFixed(1)}</span>
          <span class="chip chip--miss">${Math.round(s.missPct)}% huti</span>
        </div>
      </div>
      <div class="card__body">
        <div class="card__score">Pisteet: ${p.score ?? 0}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}
function renderControls(){
  const canShuf = state.players.length>=2 && !state.ended;
  const canUndo = state.players.some(p=>p.history?.length) && !state.ended;
  const rosterLocked = hasSoloGameStarted();
  [els.shuffle,els.shuffleAlt].forEach(b=>b&&(b.disabled=!canShuf));
  [els.undo,els.undoAlt].forEach(b=>b&&(b.disabled=!canUndo));
  els.playerSetupCard?.classList.toggle("hidden", rosterLocked);
  if(els.addPlayer) els.addPlayer.disabled = rosterLocked;
  if(els.playerName) els.playerName.disabled = rosterLocked;
  els.playerLockNotice?.classList.toggle("hidden", !rosterLocked);
}

function addPlayer(){
  if(hasSoloGameStarted()) return toast("Pelaajia ei voi lisätä kesken pelin");
  const name = sanitizeName(els.playerName?.value);
  if(!name) return toast("Anna nimi");
  if(state.players.some(player => canonName(player.name) === canonName(name))){
    return toast("Pelaaja on jo lisätty");
  }
  state.players.push({ id:uid(), ...createPlayerState(name), history:[] });
  state.order = state.players.map(p=>p.id);
  els.playerName.value = "";
  render();
}
function shuffleOrder(){
  if(state.players.length<2) return;
  const arr = [...state.players.map(p=>p.id)];
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  state.order = arr; state.turnIndex = 0; render();
}
async function applyThrow(n){
  if(state.ended) return;
  if(pendingMissDecision) return;
  const p = currentPlayer(); if(!p) return;
  const val = Number(n)||0;
  const previousScore = p.score || 0;
  const isMiss = val===0;
  let missDecision = null;
  if(isMiss){
    p.misses=(p.misses||0)+1;
    if(p.misses>=3){
      const shouldContinue = await askMissDecision(p.name);
      missDecision = shouldContinue ? "continue" : "eliminate";
      if(shouldContinue){
        p.misses = 0;
        toast(`${p.name} jatkaa peliä`);
      } else {
        p.active=false;
        toast(`${p.name} tippui (3 hutia)`);
      }
    }
  } else {
  }
  Object.assign(p, applySoloThrowToPlayer(p, val, missDecision));

  if(p.active){
    const res = applyScoreRules(previousScore, val);
    if(res.bounced) toast(`Yli 50 → 25`);
    if(res.win){ state.ended = true; openWin(`${p.name} saavutti 50 pistettä!`); render(); return; }
  }
  if(shouldEndSoloGame(state.players)){ state.ended=true; openWin(`Kaikki tippuivat. Ei voittajaa.`); render(); return; }

  nextTurn(); render();
}
function undo(){
  const latest = getLatestThrow();
  if(!latest) return;

  latest.player.history.pop();
  recomputePlayerState(latest.player);
  state.turnIndex = latest.index;
  state.ended=false;
  closeWin();
  toast("Peruttu viimeisin heitto");
  render();
}

/* Nollaus */
function newGameFresh(){ state = defaultState(); closeWin(); localStorage.setItem(LS_KEY, JSON.stringify(state)); render(); }
function askReset(){
  if(confirm("Nollataanko peli? Tämä poistaa kaikki pelaajat ja pisteet.")){
    newGameFresh();
    toast("Peli nollattu");
  }
}

function openWin(txt){ els.winText.textContent = txt; els.winModal?.removeAttribute("hidden"); }
function closeWin(){ els.winModal?.setAttribute("hidden",""); }
function handleMissModalKeydown(event){
  if(!pendingMissDecision) return;
  if(event.key === "Escape"){
    event.preventDefault();
    els.missEliminate?.click();
    return;
  }
  if(event.key !== "Tab") return;

  const focusables = [els.missContinue, els.missEliminate].filter(Boolean);
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
  if(!els.missModal || !els.missContinue || !els.missEliminate) return Promise.resolve(false);
  if(pendingMissDecision) return pendingMissDecision.promise;

  lastFocusedBeforeMissModal = document.activeElement;
  els.missTitle.textContent = "Kolme hutia";
  els.missText.textContent = `${playerName} on heittänyt 3 hutia peräkkäin. Jatkaako pelaaja pelissä vai tiputetaanko hänet?`;
  els.missModal.removeAttribute("hidden");
  els.missModal.addEventListener("keydown", handleMissModalKeydown);

  let resolveChoice;
  const promise = new Promise(resolve => {
    resolveChoice = resolve;
  });

  const onContinue = () => cleanup(true);
  const onEliminate = () => cleanup(false);
  const cleanup = (choice) => {
    els.missModal.setAttribute("hidden", "");
    els.missContinue.removeEventListener("click", onContinue);
    els.missEliminate.removeEventListener("click", onEliminate);
    els.missModal.removeEventListener("keydown", handleMissModalKeydown);
    pendingMissDecision = null;
    resolveChoice(choice);
    lastFocusedBeforeMissModal?.focus?.();
    lastFocusedBeforeMissModal = null;
  };

  els.missContinue.addEventListener("click", onContinue, { once:true });
  els.missEliminate.addEventListener("click", onEliminate, { once:true });
  pendingMissDecision = { promise };
  els.missContinue.focus();
  return promise;
}
function newGameSame(){
  state.players.forEach(p=>{ p.score=0;p.misses=0;p.active=true;p.history=[]; });
  state.turnIndex=0; state.ended=false; closeWin(); render();
}
function toast(msg){ if(!els.toast) return; els.toast.textContent=msg; els.toast.classList.add("show"); setTimeout(()=>els.toast.classList.remove("show"),1400); }

/* Events */
els.addPlayer?.addEventListener("click", addPlayer);
[els.shuffle, els.shuffleAlt].forEach(b=>b?.addEventListener("click", shuffleOrder));
[els.undo, els.undoAlt].forEach(b=>b?.addEventListener("click", undo));
els.submitFree?.addEventListener("click", ()=>{
  const v = (els.freeInput?.value ?? "").trim();
  if(v==="") return;
  const n = Number(v);
  if(Number.isNaN(n) || n<0 || n>12){ toast("Syötä 0–12"); return; }
  applyThrow(n); els.freeInput.value="";
});
els.winSame?.addEventListener("click", newGameSame);
els.winFresh?.addEventListener("click", newGameFresh);
els.winClose?.addEventListener("click", closeWin);

/* Nollausnapit */
[els.reset, els.resetAlt].forEach(b=>b?.addEventListener("click", askReset));

/* Heittopaneeli delegoituna */
const throwPad = document.getElementById("throwPad");
if(throwPad && !throwPad.dataset.bound){
  throwPad.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-score]"); if(!btn) return;
    const n = Number(btn.dataset.score || 0);
    if(Number.isNaN(n)) return;
    applyThrow(n);
  });
  throwPad.dataset.bound="1";
}

render();
