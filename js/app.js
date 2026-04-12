/* app.js — Yksilöpeli (v2.1.1: Nollaa peli -napit) */

import { createPlayerState, applyScoreRules } from "./rules.js";
import { canonName, getLatestHistoryEntry, sanitizeName, sortByTimestamp } from "./shared.js";

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
  if(!state.order.length) return;
  let steps=0;
  do{
    state.turnIndex = (state.turnIndex+1)%state.order.length; steps++;
  }while(steps<=state.order.length && !getPlayer(state.order[state.turnIndex])?.active);
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
  let score = 0;
  let misses = 0;
  let active = true;

  for(const h of sortByTimestamp(p.history)){
    const val = Number(h.score) || 0;
    if(val === 0){
      misses += 1;
      if(misses >= 3){
        if(h.missDecision === "continue"){
          misses = 0;
          continue;
        }
        active = false;
        misses = 3;
        break;
      }
      continue;
    }

    misses = 0;
    score = applyScoreRules(score, val).score;
  }

  p.score = score;
  p.misses = active ? misses : 3;
  p.active = active;
}

function getLatestThrow(){
  return getLatestHistoryEntry(state.players.map((player, index)=>({ player, index, history: player.history })));
}

const els = {
  playersGrid: document.getElementById("playersGrid"),
  emptyState: document.getElementById("emptyState"),
  playerName: document.getElementById("playerName"),
  addPlayer: document.getElementById("addPlayer"),
  shuffle: document.getElementById("shuffle"),
  shuffleAlt: document.getElementById("shuffleAlt"),
  undo: document.getElementById("undo"),
  undoAlt: document.getElementById("undoAlt"),
  freeInput: document.getElementById("freeInput"),
  submitFree: document.getElementById("submitFree"),
  turnTitle: document.getElementById("turnTitle"),
  winModal: document.getElementById("winModal"),
  winText: document.getElementById("winText"),
  winSame: document.getElementById("winSame"),
  winFresh: document.getElementById("winFresh"),
  winClose: document.getElementById("winClose"),
  toast: document.getElementById("toast"),
  reset: document.getElementById("reset"),
  resetAlt: document.getElementById("resetAlt"),
};

function render(){
  renderTurn();
  renderPlayers();
  renderControls();
  save();
}
function renderTurn(){
  if(state.ended){ els.turnTitle.textContent = "Peli päättynyt"; return; }
  const p = currentPlayer();
  els.turnTitle.textContent = p ? `Vuorossa: ${p.name}` : "Vuorossa: –";
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
  [els.shuffle,els.shuffleAlt].forEach(b=>b&&(b.disabled=!canShuf));
  [els.undo,els.undoAlt].forEach(b=>b&&(b.disabled=!canUndo));
}

function addPlayer(){
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
function applyThrow(n){
  if(state.ended) return;
  const p = currentPlayer(); if(!p) return;
  const val = Number(n)||0;
  const isMiss = val===0;
  let missDecision = null;
  if(isMiss){
    p.misses=(p.misses||0)+1;
    if(p.misses>=3){
      const shouldContinue = confirm(`${p.name} on heittänyt 3 hutia peräkkäin. Jatkaako pelaaja pelissä?`);
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
    p.misses=0;
  }
  p.history.push({ score:val, ts:Date.now(), missDecision });

  if(p.active){
    const res = applyScoreRules(p.score||0, val);
    if(res.bounced) toast(`Yli 50 → 25`);
    p.score = res.score;
    if(res.win){ state.ended = true; openWin(`${p.name} saavutti 50 pistettä!`); render(); return; }
  }
  if(state.players.every(x=>!x.active)){ state.ended=true; openWin(`Kaikki tippuivat. Ei voittajaa.`); render(); return; }

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
