// team-app.js — Joukkue-UI: pelaajan lisäys kortin sisällä
import { ThrowType, throwFromRawInput } from "./rules.js";
import {
  loadOrInit, getState, resetAll, canUndo, undoLastAction,
  addTeam, setSelectedTeam, addPlayerToSelectedTeam,
  shuffleOrder, getCurrent, applyThrowToCurrent,
  newGameSameRoster
} from "./teamState.js";

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

function toast(msg, ms=2300){
  const el = $("#toast"); if(!el) return;
  el.textContent = msg; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), ms);
}

function colorFor(i){
  const palette = ["#00796b","#2196f3","#f44336","#ff9800","#9c27b0","#4caf50","#8d6e63","#00bcd4"];
  return palette[i % palette.length];
}

// ----------- Gating -----------
function canShuffle(st){
  return st.teams.length >= 2 && st.teams.every(t => t.players.length >= 1);
}
function canThrowNow(){
  return !!getCurrent(); // current löytyy vasta arvonnan jälkeen
}
function updateControlsState(){
  const st = getState();

  $("#emptyState").style.display = st.teams.length === 0 ? "block" : "none";
  $("#shuffle").toggleAttribute("disabled", !canShuffle(st));

  const throwing = canThrowNow();
  $$(".quick-btn").forEach(b => b.toggleAttribute("disabled", !throwing));
  $("#freeInput").toggleAttribute("disabled", !throwing);
  $("#submitFree").toggleAttribute("disabled", !throwing);

  $("#undo")?.toggleAttribute("disabled", !canUndo());
}

function render(){
  const st = getState();
  const cur = getCurrent();

  $("#turnTitle").textContent = cur?.team && cur?.player
    ? `Vuorossa: ${cur.team.name} – ${cur.player.name}`
    : "Vuorossa: –";

  const wrap = $("#teamsGrid");
  wrap.innerHTML = "";

  const order = st.teamOrder.length ? st.teamOrder : st.teams.map((_, i)=>i);
  order.forEach((tIdx, iInOrder) => {
    const team = st.teams[tIdx];
    const card = document.createElement("div");
    card.className = "player-card";
    card.style.backgroundColor = colorFor(iInOrder);
    if (!team.active) card.classList.add("inactive");
    if (team.score === 50) card.classList.add("winner");

    const playersHtml = (team.players.length === 0)
      ? `<div class="meta">Ei pelaajia</div>`
      : team.players.map((p, pi) => {
          const activeMark = (cur && cur.teamIdx===tIdx && cur.playerIdx===pi) ? "🔵" : (p.active ? "🟢" : "⚫");
          const miss = p.active ? ` · Hutit: ${p.misses}/3` : " · Poistunut";
          return `<div class="meta">${activeMark} ${p.name}${miss}</div>`;
        }).join("");

    // kortin sisäinen syöte + nappi (täysleveä mobiilissa, vierekkäin leveämmällä)
    card.innerHTML = `
      <h3>${team.name}</h3>
      <div class="score">${team.score}</div>
      ${playersHtml}
      <div class="inline-input">
        <input type="text" placeholder="Pelaajan nimi" id="pn-${tIdx}" />
        <button type="button" class="btn blue add-player-btn" data-team="${tIdx}">Lisää pelaaja</button>
      </div>
    `;

    // kiinnitä kortin sisäisen napin toiminta
    const addBtn  = card.querySelector(".add-player-btn");
    const inputEl = card.querySelector(`#pn-${tIdx}`);
    addBtn.addEventListener("click", () => {
      const name = (inputEl?.value || "").trim();
      if (!name){ toast("Anna pelaajan nimi."); return; }
      setSelectedTeam(tIdx);
      const res = addPlayerToSelectedTeam(name);
      if (!res.ok){ toast(res.error); return; }
      inputEl.value = "";
      render();
    });

    wrap.appendChild(card);
  });

  updateControlsState();
}

// ----------- Heitot -----------
function onQuick(value){
  if (!canThrowNow()){
    toast("Heitto ei ole käytössä vielä. Lisää tiimit & pelaajat ja arvo aloitusjärjestys.");
    return;
  }
  try{
    let t;
    if (/^\d{1,2}$/.test(value)) {
      const n = parseInt(value, 10);
      t = n === 0 ? { type: ThrowType.MISS, value: 0 }
                  : { type: ThrowType.SINGLE_PIN, value: n };
    } else {
      t = throwFromRawInput(value); // S# / M#
    }
    const res = applyThrowToCurrent(t.type, t.value);
    if (res?.error) toast(res.error);
    if (res?.events?.includes("BOUNCE_TO_25")) toast("Yli 50 → palautus 25:een (tiimi)");
    if (res?.events?.includes("WIN_50")) toast("Tiimi voitti 50! 🎉");
    if (res?.events?.some(e => e.startsWith("MISS_"))) toast("Huti.");
    if (res?.events?.includes("ELIMINATED_3_MISSES")) toast("Pelaaja tippui (3 hutia).");
    render();
  }catch{
    toast("Virheellinen syöte.");
  }
}
function onFreeSubmit(){
  const raw = $("#freeInput").value.trim().toUpperCase();
  if (!raw){ toast("Syötä 0–12."); return; }
  $("#freeInput").value = "";
  onQuick(raw);
}

// ----------- Hallinta -----------
function onAddTeam(){
  const name = $("#teamName").value.trim();
  if (!name){ toast("Anna tiimin nimi."); return; }
  const ok = addTeam(name);
  if (!ok){ toast("Tiimin nimi on jo käytössä tai tyhjä."); return; }
  $("#teamName").value = "";
  render();
}
function onShuffle(){
  const st = getState();
  if (!canShuffle(st)){ toast("Tarvitset vähintään 2 tiimiä ja 1 pelaajan per tiimi."); return; }
  try{
    const first = shuffleOrder();
    toast(`Aloittaa: ${first.team.name} – ${first.player.name}`);
    render();
  }catch(e){
    toast(e.message || "Arvonta epäonnistui.");
  }
}
function onUndo(){
  if (!canUndo()) return;
  const ok = undoLastAction();
  if (ok){ toast("Peruttu viimeisin."); render(); }
}
function onNewSame(){
  newGameSameRoster();
  toast("Uusi peli – kokoonpano säilytettiin. Arvo aloitusjärjestys.");
  render();
}
function onNewFresh(){
  resetAll();
  toast("Uusi peli – uudet joukkueet. Lisää tiimit ja pelaajat.");
  render();
}

// ----------- Init -----------
document.addEventListener("DOMContentLoaded", () => {
  loadOrInit();

  // Heittonapit
  $$(".quick-btn").forEach(btn => btn.addEventListener("click", () => onQuick(btn.dataset.score)));
  $("#submitFree")?.addEventListener("click", onFreeSubmit);
  $("#freeInput")?.addEventListener("keydown", (e) => { if (e.key==="Enter"){ e.preventDefault(); onFreeSubmit(); } });

  // Hallinta
  $("#addTeam")?.addEventListener("click", onAddTeam);
  $("#shuffle")?.addEventListener("click", onShuffle);
  $("#undo")?.addEventListener("click", onUndo);
  $("#newSame")?.addEventListener("click", onNewSame);
  $("#newFresh")?.addEventListener("click", onNewFresh);

  render();
});
