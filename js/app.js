/* app.js — Yksilöpeli (v2.1.1: Nollaa peli -napit) */

import { createPlayerState, applyScoreRules } from "./rules.js";
import { canonName, getLatestHistoryEntry, sanitizeName } from "./shared.js";
import {
  applySoloThrowToPlayer,
  getTurnIndexForParticipant,
  getNextSoloTurnIndex,
  recomputePlayerFromHistory,
  shouldAskMissDecision,
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
  turnTitle: document.getElementById("turnTitle"),
  turnSubtitle: document.getElementById("turnSubtitle"),
  turnMeta: document.getElementById("turnMeta"),
  matchSummary: document.getElementById("matchSummary"),
  winModal: document.getElementById("winModal"),
  winPanel: document.querySelector("#winModal .win-modal"),
  winText: document.getElementById("winText"),
  winConfetti: document.getElementById("winConfetti"),
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
  toast: document.getElementById("toast"),
  reset: document.getElementById("reset"),
  resetAlt: document.getElementById("resetAlt"),
};

let pendingMissDecision = null;
let lastFocusedBeforeMissModal = null;
let pendingConfirmDecision = null;
let lastFocusedBeforeConfirmModal = null;
const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
const winConfettiColors = ["#2f7af8", "#16a34a", "#f59e0b", "#d04756", "#e7ecf3"];

function renderWinConfetti(){
  if(!els.winConfetti) return;
  els.winConfetti.innerHTML = "";
  if(prefersReducedMotion?.matches) return;

  Array.from({ length: 18 }, (_, index)=>index).forEach(index => {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${4 + Math.random() * 92}%`;
    piece.style.width = `${8 + Math.round(Math.random() * 5)}px`;
    piece.style.height = `${14 + Math.round(Math.random() * 12)}px`;
    piece.style.setProperty("--piece-color", winConfettiColors[index % winConfettiColors.length]);
    piece.style.setProperty("--fall-delay", `${(index % 6) * 0.05}s`);
    piece.style.setProperty("--fall-duration", `${1.15 + Math.random() * 0.75}s`);
    piece.style.setProperty("--drift", `${Math.round(Math.random() * 90 - 45)}px`);
    piece.style.setProperty("--spin", `${Math.round(Math.random() * 320 - 160)}deg`);
    els.winConfetti.appendChild(piece);
  });
}

function triggerWinCelebration(celebrate){
  if(!els.winPanel) return;
  els.winPanel.classList.remove("is-celebrating");
  if(els.winConfetti) els.winConfetti.innerHTML = "";
  if(!celebrate || prefersReducedMotion?.matches) return;

  renderWinConfetti();
  void els.winPanel.offsetWidth;
  els.winPanel.classList.add("is-celebrating");
}

function render(){
  renderTurn();
  renderMatchSummary();
  renderPlayers();
  renderControls();
  save();
}

function renderTurnMeta(chips = []){
  if(!els.turnMeta) return;
  els.turnMeta.innerHTML = chips.map(chip => `
    <span class="turn-hero__chip ${chip.tone ? `turn-hero__chip--${chip.tone}` : ""}">${escapeHtml(chip.label)}</span>
  `).join("");
}

function renderTurn(){
  if(state.ended){
    els.turnTitle.textContent = "Peli päättynyt";
    if(els.turnSubtitle) els.turnSubtitle.textContent = "Voit aloittaa uuden pelin samoilla pelaajilla tai tyhjentää tilanteen.";
    renderTurnMeta([]);
    return;
  }
  if(!state.players.length){
    els.turnTitle.textContent = "Ei pelaajia";
    if(els.turnSubtitle) els.turnSubtitle.textContent = "Lisää ensin pelaajat, jotta peli voi alkaa.";
    renderTurnMeta([]);
    return;
  }

  const p = currentPlayer();
  if(!p){
    els.turnTitle.textContent = "Ei aktiivista pelaajaa";
    if(els.turnSubtitle) els.turnSubtitle.textContent = "Peli tarvitsee vähintään yhden aktiivisen pelaajan.";
    renderTurnMeta([]);
    return;
  }

  const activePlayers = state.players.filter(player => player.active);
  const nextTurnIndex = getNextSoloTurnIndex(state.players, state.order, state.turnIndex);
  const nextPlayerId = state.order[nextTurnIndex];
  const nextPlayer = getPlayer(nextPlayerId);
  const nextLabel = activePlayers.length > 1 && nextPlayer
    ? `Seuraavana: ${nextPlayer.name}`
    : "Valmis heittämään";

  els.turnTitle.textContent = p.name;
  if(els.turnSubtitle) els.turnSubtitle.textContent = nextLabel;
  renderTurnMeta([
    { label: `Pisteet ${p.score ?? 0}`, tone: "score" },
    { label: `Hudit ${p.misses ?? 0}/3`, tone: "miss" },
    { label: `Voittoon ${Math.max(0, 50 - (p.score ?? 0))}` }
  ]);
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
  let missDecision = null;
  if(shouldAskMissDecision(p.misses, val)){
    const shouldContinue = await askMissDecision(p.name);
    missDecision = shouldContinue ? "continue" : "eliminate";
    if(shouldContinue){
      toast(`${p.name} jatkaa peliä`);
    } else {
      toast(`${p.name} tippui (3 hutia)`);
    }
  }
  Object.assign(p, applySoloThrowToPlayer(p, val, missDecision));

  if(p.active){
    const res = applyScoreRules(previousScore, val);
    if(res.bounced) toast(`Yli 50 → 25`);
    if(res.win){ state.ended = true; openWin(`${p.name} saavutti 50 pistettä!`, true); render(); return; }
  }
  if(shouldEndSoloGame(state.players)){ state.ended=true; openWin(`Kaikki tippuivat. Ei voittajaa.`, false); render(); return; }

  nextTurn(); render();
}
function undo(){
  const latest = getLatestThrow();
  if(!latest) return;

  latest.player.history.pop();
  recomputePlayerState(latest.player);
  state.turnIndex = getTurnIndexForParticipant(state.order, latest.player.id, state.turnIndex);
  state.ended=false;
  closeWin();
  toast("Peruttu viimeisin heitto");
  render();
}

/* Nollaus */
function newGameFresh(){ state = defaultState(); closeWin(); localStorage.setItem(LS_KEY, JSON.stringify(state)); render(); }
async function askReset(){
  const confirmed = await askConfirm({
    title: "Nollataanko peli?",
    text: "Tämä poistaa kaikki pelaajat ja pisteet.",
    confirmLabel: "Nollaa peli"
  });
  if(!confirmed) return;
  newGameFresh();
  toast("Peli nollattu");
}

function openWin(txt, celebrate = true){
  els.winText.textContent = txt;
  els.winModal?.removeAttribute("hidden");
  triggerWinCelebration(celebrate);
}
function closeWin(){
  els.winModal?.setAttribute("hidden","");
  els.winPanel?.classList.remove("is-celebrating");
  if(els.winConfetti) els.winConfetti.innerHTML = "";
}
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
function handleConfirmModalKeydown(event){
  if(!pendingConfirmDecision) return;
  if(event.key === "Escape"){
    event.preventDefault();
    els.confirmCancel?.click();
    return;
  }
  if(event.key !== "Tab") return;

  const focusables = [els.confirmCancel, els.confirmOk].filter(Boolean);
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
  if(!els.confirmModal || !els.confirmCancel || !els.confirmOk) return Promise.resolve(false);
  if(pendingConfirmDecision) return pendingConfirmDecision.promise;

  lastFocusedBeforeConfirmModal = document.activeElement;
  els.confirmTitle.textContent = title || "Vahvista toiminto";
  els.confirmText.textContent = text || "";
  els.confirmCancel.textContent = cancelLabel;
  els.confirmOk.textContent = confirmLabel;
  els.confirmModal.removeAttribute("hidden");
  els.confirmModal.addEventListener("keydown", handleConfirmModalKeydown);

  let resolveChoice;
  const promise = new Promise(resolve => {
    resolveChoice = resolve;
  });

  const onCancel = () => cleanup(false);
  const onConfirm = () => cleanup(true);
  const cleanup = (choice) => {
    els.confirmModal.setAttribute("hidden", "");
    els.confirmCancel.removeEventListener("click", onCancel);
    els.confirmOk.removeEventListener("click", onConfirm);
    els.confirmModal.removeEventListener("keydown", handleConfirmModalKeydown);
    pendingConfirmDecision = null;
    resolveChoice(choice);
    lastFocusedBeforeConfirmModal?.focus?.();
    lastFocusedBeforeConfirmModal = null;
  };

  els.confirmCancel.addEventListener("click", onCancel, { once:true });
  els.confirmOk.addEventListener("click", onConfirm, { once:true });
  pendingConfirmDecision = { promise };
  els.confirmCancel.focus();
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
els.winSame?.addEventListener("click", newGameSame);
els.winFresh?.addEventListener("click", newGameFresh);
els.winClose?.addEventListener("click", closeWin);

/* Nollausnapit */
[els.reset, els.resetAlt].forEach(b=>b?.addEventListener("click", askReset));

/* Heittopaneeli delegoituna */
const throwBar = document.querySelector(".throwbar");
if(throwBar && !throwBar.dataset.bound){
  throwBar.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-score]"); if(!btn) return;
    const n = Number(btn.dataset.score || 0);
    if(Number.isNaN(n)) return;
    applyThrow(n);
  });
  throwBar.dataset.bound="1";
}

render();
