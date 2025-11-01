/* team-app.js — Joukkuepeli (v2.3.1: tiimi luodaan ilman oletuspelaajia) */

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m => (
    { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]
  ));
}

const LS_TEAM_KEY = "molkky_team_v231";
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
      t.score ??= 0;
      t.active ??= true;
      t.players ??= []; // <— tärkeä: tyhjä lista sallittu
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

// Tiimi on "ready" jos sillä on vähintään 1 aktiivinen pelaaja
const teamReady = (t) => !!(t?.players?.some(p=>p.active) );
const teamsReadyCount = () => aliveTeams().filter(teamReady).length;

function currentTeam(){
  if(T.ended) return null;
  if(!T.order.length) return null;
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
  let idx = T.playerTurnIdx % team.players.length;
  for(let i=0;i<team.players.length;i++){
    const p = team.players[(idx+i)%team.players.length];
    if(p?.active){ T.playerTurnIdx = (idx+i)%team.players.length; return { team, player:p }; }
  }
  return { team, player:null };
}
function nextTurnTeam(){
  const team = currentTeam(); if(!team) return;
  if(team.players?.length){
    let steps=0;
    do{ T.playerTurnIdx = (T.playerTurnIdx+1)%team.players.length; steps++; }
    while(steps<=team.players.length && !team.players[T.playerTurnIdx]?.active);
  }
  let stepsT=0;
  do{ T.teamTurnIdx = (T.teamTurnIdx+1)%T.order.length; stepsT++; }
  while(stepsT<=T.order.length && !getTeam(T.order[T.teamTurnIdx])?.active);
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

function applyScoreRulesTeam(oldScore,gained){
  const next = (oldScore ?? 0) + (gained ?? 0);
  if(next === 50) return { score:50, win:true, reset25:false };
  if(next > 50)    return { score:25, win:false, reset25:true };
  return { score:next, win:false, reset25:false };
}

/* --------------------- DOM --------------------- */
const el = {
  grid: document.getElementById("teamsGrid"),
  empty: document.getElementById("emptyState"),
  teamName: document.getElementById("teamName"),
  addTeam: document.getElementById("addTeam"),
  shuffle: document.getElementById("shuffle"),
  shuffleAlt: document.getElementById("shuffleAlt"),
  undo: document.getElementById("undo"),
  undoAlt: document.getElementById("undoAlt"),
  free: document.getElementById("freeInput"),
  go: document.getElementById("submitFree"),
  turnTitle: document.getElementById("turnTitle"),
  winModal: document.getElementById("winModal"),
  winText: document.getElementById("winText"),
  winSame: document.getElementById("winSame"),
  winFresh: document.getElementById("winFresh"),
  winClose: document.getElementById("winClose"),
  toast: document.getElementById("toast"),
};

/* --------------------- RENDER --------------------- */
function trender(){
  trenderTurn(); trenderTeams(); trenderControls(); saveT();
}
function trenderTurn(){
  if(T.ended){ el.turnTitle.textContent = "Peli päättynyt"; return; }
  const { team, player } = currentPlayerTeamScoped();
  if(team && player) el.turnTitle.textContent = `Vuorossa: ${team.name} – ${player.name}`;
  else if(team && !team.players?.length) el.turnTitle.textContent = `Vuorossa: ${team.name} – lisää pelaajia tiimiin`;
  else if(team) el.turnTitle.textContent = `Vuorossa: ${team.name}`;
  else el.turnTitle.textContent = "Vuorossa: –";
}
function trenderTeams(){
  const grid = el.grid; if(!grid) return;
  grid.innerHTML="";
  if(!T.teams.length){ el.empty?.classList.remove("hidden"); return; }
  el.empty?.classList.add("hidden");

  T.teams.forEach(team=>{
    const ts = tstatsFromTeam(team);

    const playersHtml = (team.players ?? []).map(p=>{
      const ps = pstats(p);
      const labelId = `${team.id}:${p.id}`;
      return `
        <li class="${p.active ? "" : "muted"}" style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">
          <div style="display:flex;align-items:center;gap:.45rem;min-width:0">
            <span class="player-label" data-player-label="${labelId}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.name)}</span>
            <button class="btn small" data-edit-player data-team-id="${team.id}" data-player-id="${p.id}">Nimeä</button>
            <button class="btn small danger" data-remove-player data-team-id="${team.id}" data-player-id="${p.id}" title="Poista">🗑</button>
          </div>
          <span class="chips" style="flex:0 0 auto">
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
          ? `<ul class="list thin" style="list-style:none;margin:.6rem 0 .5rem;padding:0;display:flex;flex-direction:column;gap:.35rem">${playersHtml}</ul>`
          : `<p class="muted" style="margin:.5rem 0">Ei pelaajia. Lisää pelaajia tiimiin.</p>`}
        <div>
          <button class="btn small ok" data-add-player data-team-id="${team.id}">Lisää pelaaja</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}
function trenderControls(){
  const canShuffle = teamsReadyCount() >= 2 && !T.ended; // väh. 2 pelivalmista tiimiä
  const canUndo = T.teams.some(t=>t.players?.some(p=>p.history?.length)) && !T.ended;
  [el.shuffle, el.shuffleAlt].forEach(b=>b&&(b.disabled=!canShuffle));
  [el.undo, el.undoAlt].forEach(b=>b&&(b.disabled=!canUndo));
}

/* --------------------- ACTIONS --------------------- */
function addTeam(){
  const name = (el.teamName?.value ?? "").trim();
  if(!name) return ttoast("Anna tiimin nimi");
  const team = { id:tuid(), name, score:0, active:true, players:[] }; // <— EI oletuspelaajia
  T.teams.push(team);
  T.order = T.teams.map(t=>t.id);
  el.teamName.value = "";
  trender();
}

function addPlayerToTeam(teamId, name){
  const team = getTeam(teamId); if(!team) return;
  const nextNum = (team.players?.length ?? 0) + 1;
  const newP = {
    id: tuid(),
    name: (name || `Pelaaja ${nextNum}`).trim() || `Pelaaja ${nextNum}`,
    active: true, misses: 0, history: []
  };
  team.players = team.players || [];
  team.players.push(newP);
  if(!team.active) team.active = true;
  saveT(); trender();
}

function removePlayer(teamId, playerId){
  const team = getTeam(teamId); if(!team) return;
  const idx = team.players?.findIndex(p=>p.id===playerId);
  if(idx == null || idx < 0) return;

  team.players.splice(idx,1);

  if(team.players.length === 0){
    // pelaajia ei ole → tiimi ei ole "ready"; pidetään active:true
    // mutta seuraava heitto ei kohdistu tähän tiimiin (koska currentPlayerTeamScoped palauttaa player:null)
    T.playerTurnIdx = 0;
  } else {
    if(T.playerTurnIdx >= team.players.length){
      T.playerTurnIdx = team.players.length - 1;
      if(T.playerTurnIdx < 0) T.playerTurnIdx = 0;
    }
  }

  // Laske tiimin pisteet uudelleen
  const all = (team.players ?? []).flatMap(pl=>pl.history ?? []);
  let sc=0; all.forEach(h=>{ sc = applyScoreRulesTeam(sc, h.score).score; });
  team.score = sc;

  // Jos kaikki tiimit ovat ilman pelaajia → peli päättyy (ei voittajaa)
  if(aliveTeams().every(t => !teamReady(t))) T.ended = true;

  saveT(); trender();
}

function submitThrowTeam(n){
  if(T.ended) return;
  const { team, player } = currentPlayerTeamScoped();

  if(!team){ ttoast("Lisää ensin tiimejä"); return; }
  if(!player){ ttoast("Lisää pelaajia tiimiin"); return; }

  const val = Number(n)||0;
  const isMiss = val===0;
  if(isMiss){ player.misses=(player.misses||0)+1; } else { player.misses=0; }
  if(player.misses>=3){ player.active=false; ttoast(`${player.name} tippui (3 hutia)`); }
  player.history.push({ score:val, ts:Date.now() });

  if(!team.players.some(p=>p.active)) team.active=false;

  if(team.active){
    const res = applyScoreRulesTeam(team.score||0, val);
    team.score = res.score;
    if(res.reset25) ttoast(`Yli 50 → 25`);
    if(res.win){ T.ended = true; openWin(`Tiimi ${team.name} saavutti 50 pistettä!`); trender(); return; }
  }
  if(aliveTeams().every(t=>!teamReady(t))){ T.ended=true; openWin(`Ei pelivalmiita tiimejä. Ei voittajaa.`); trender(); return; }

  nextTurnTeam(); trender();
}

function undoTeam(){
  for(let ti=T.teams.length-1; ti>=0; ti--){
    const t = T.teams[ti];
    for(let pi=(t.players?.length??0)-1; pi>=0; pi--){
      const p = t.players[pi];
      if(p.history?.length){
        const last = p.history.pop();
        if(last.score===0){ p.misses=Math.max(0,(p.misses||0)-1); p.active=true; }
        const all = (t.players ?? []).flatMap(pl=>pl.history ?? []);
        let sc=0; all.forEach(h=>{ sc = applyScoreRulesTeam(sc, h.score).score; });
        t.score = sc;
        if(!t.active) t.active = true;
        T.ended=false; ttoast("Peruttu viimeisin heitto"); trender(); return;
      }
    }
  }
}

/* ---------- Pelaajien nimeäminen (in-place edit) ---------- */
function startInlineEdit(teamId, playerId){
  const labelSelector = `[data-player-label="${teamId}:${playerId}"]`;
  const labelEl = el.grid.querySelector(labelSelector);
  if(!labelEl) return;

  const team = getTeam(teamId);
  const player = team?.players?.find(p=>p.id===playerId);
  if(!player) return;

  const oldName = player.name;
  const input = document.createElement("input");
  input.type = "text";
  input.value = oldName;
  input.setAttribute("data-editing","1");
  input.style.minWidth = "8rem";
  input.style.maxWidth = "40vw";
  input.style.padding = ".35rem .5rem";
  input.style.border = "1px solid var(--border)";
  input.style.borderRadius = "10px";
  input.style.background = "#0c1424";
  input.style.color = "var(--text)";

  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const newName = (input.value || "").trim();
    player.name = newName || oldName || "Pelaaja";
    saveT();
    trender();
  };
  const cancel = () => { trender(); };

  input.addEventListener("keydown",(e)=>{
    if(e.key === "Enter"){ e.preventDefault(); commit(); }
    if(e.key === "Escape"){ e.preventDefault(); cancel(); }
  });
  input.addEventListener("blur", commit);
}

/* ---------- WIN, TOAST & UI ---------- */
function openWin(txt){ el.winText.textContent=txt; el.winModal?.removeAttribute("hidden"); }
function closeWin(){ el.winModal?.setAttribute("hidden",""); }
function newTeamSame(){
  T.teams.forEach(t=>{
    t.score=0; t.active=true;
    t.players.forEach(p=>{ p.active=true; p.misses=0; p.history=[]; });
  });
  T.teamTurnIdx=0; T.playerTurnIdx=0; T.ended=false; closeWin(); trender();
}
function newTeamFresh(){ T = defaultTeamState(); closeWin(); trender(); }
function ttoast(msg){ if(!el.toast) return; el.toast.textContent=msg; el.toast.classList.add("show"); setTimeout(()=>el.toast.classList.remove("show"),1400); }

/* ---------- Eventit ---------- */
el.addTeam?.addEventListener("click", addTeam);
[el.shuffle, el.shuffleAlt].forEach(b=>b?.addEventListener("click", ()=>{
  if(teamsReadyCount() < 2) return;
  const arr = [...T.teams.map(t=>t.id)];
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
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

/* Delegoitu heittopaneeli — EI tuplia */
const tPad = document.getElementById("throwPad");
if(tPad && !tPad.dataset.bound){
  tPad.addEventListener("click",(e)=>{
    const btn = e.target.closest("[data-score]"); if(!btn) return;
    const n = Number(btn.dataset.score || 0); if(Number.isNaN(n)) return;
    submitThrowTeam(n);
  });
  tPad.dataset.bound="1";
}

/* Delegoidut napit team-korteissa: nimeä, poista ja lisää pelaaja */
el.grid?.addEventListener("click",(e)=>{
  const editBtn = e.target.closest("[data-edit-player]");
  if(editBtn){
    startInlineEdit(editBtn.getAttribute("data-team-id"), editBtn.getAttribute("data-player-id"));
    return;
  }
  const delBtn = e.target.closest("[data-remove-player]");
  if(delBtn){
    removePlayer(delBtn.getAttribute("data-team-id"), delBtn.getAttribute("data-player-id"));
    return;
  }
  const addBtn = e.target.closest("[data-add-player]");
  if(addBtn){
    const teamId = addBtn.getAttribute("data-team-id");
    const team = getTeam(teamId);
    const defaultName = `Pelaaja ${(team?.players?.length ?? 0) + 1}`;
    const name = prompt("Uuden pelaajan nimi:", defaultName) ?? "";
    addPlayerToTeam(teamId, name);
  }
});

trender();
