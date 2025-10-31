// team-app.js — Joukkue-UI: heittoloki + minitilastot + poistot + Voitto-modal (korjattu)
import { ThrowType, throwFromRawInput } from "./rules.js";
import {
  loadOrInit, getState, resetAll, canUndo, undoLastAction,
  addTeam, setSelectedTeam, addPlayerToSelectedTeam,
  shuffleOrder, getCurrent, applyThrowToCurrent,
  newGameSameRoster, removeTeam, removePlayer
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

function canShuffle(st){
  return st.teams.length >= 2 && st.teams.every(t => t.players.length >= 1);
}
function canThrowNow(){ return !!getCurrent(); }

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

/* ---- tilastot apurit ---- */
function statsForPlayer(logs, playerId){
  const rows = logs.filter(l => l.playerId === playerId);
  const throws = rows.length;
  const misses = rows.filter(l => l.type === ThrowType.MISS).length;
  const points = rows.reduce((s, r) => s + Math.max(0, r.points || 0), 0);
  const avg = throws ? (points / throws) : 0;
  const missPct = throws ? (misses / throws * 100) : 0;
  return { throws, misses, avg, missPct };
}

function renderLog(){
  const st = getState();
  const box = $("#throwLog");
  if (!box) return;
  const last = st.logs.slice(-10).reverse();
  if (!last.length){
    box.innerHTML = `<div class="muted">Ei heittoja vielä.</div>`;
    return;
  }
  box.innerHTML = last.map(e => {
    const v = (e.type === ThrowType.MISS) ? "huti" : `+${e.value}`;
    const ev = (e.events||[]).includes("WIN_50") ? " 🏆"
              : (e.events||[]).includes("BOUNCE_TO_25") ? " ↩︎25"
              : "";
    const t = new Date(e.ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    return `
      <div class="log-row">
        <div class="log-main"><strong>${e.teamName}</strong> – ${e.playerName}</div>
        <div class="log-val">${v}${ev}</div>
      </div>
      <div class="log-sub">klo ${t} • tiimin pisteet: ${e.teamScoreAfter}</div>
    `;
  }).join("");
}

/* ---- Voitto-modal (team) ---- */
let winShown = false;

function replaceAndBind(id, handler){
  const oldEl = document.getElementById(id);
  const newEl = oldEl.cloneNode(true);
  oldEl.replaceWith(newEl);
  newEl.addEventListener("click", handler);
  return newEl;
}

function openWinModalTeam(winnerTeamName){
  const bd  = document.getElementById("winModal");
  const txt = document.getElementById("winText");

  txt.textContent = `${winnerTeamName} saavutti 50 pistettä. Onneksi olkoon!`;
  document.getElementById("winSame").textContent = "Aloita uusi peli samalla kokoonpanolla";

  bd.hidden = false;

  replaceAndBind("winSame",  () => { newGameSameRoster(); bd.hidden = true; winShown = false; render(); });
  replaceAndBind("winFresh", () => { resetAll();          bd.hidden = true; winShown = false; render(); });
  replaceAndBind("winClose", () => { bd.hidden = true; });

  document.getElementById("winSame").focus();
}

function maybeShowWinTeam(){
  if (winShown) return;
  const st = getState();

  if (!st.ended) return;
  const winner = st.teams.find(t => t.score === 50);
  if (!winner) return;

  winShown = true;
  openWinModalTeam(winner.name);
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
          const stp = statsForPlayer(st.logs, p.id);
          return `
            <div class="meta player-row">
              <span>${activeMark} ${p.name}${miss}</span>
              <span class="stat-chips">
                <span class="chip" title="Heittoja">${stp.throws}</span>
                <span class="chip" title="Ka. pisteet/heitto">${stp.avg.toFixed(1)}</span>
                <span class="chip" title="Huti-%">${Math.round(stp.missPct)}%</span>
              </span>
              <button class="icon-btn danger" aria-label="Poista pelaaja" data-del-player="${pi}" data-team="${tIdx}">🗑</button>
            </div>`;
        }).join("");

    card.innerHTML = `
      <div class="card-top">
        <h3>${team.name}</h3>
        <button class="icon-btn" aria-label="Poista tiimi" data-del-team="${tIdx}">🗑</button>
      </div>
      <div class="score">${team.score}</div>
      ${playersHtml}
      <div class="inline-input">
        <input type="text" placeholder="Pelaajan nimi" id="pn-${tIdx}" />
        <button type="button" class="btn blue add-player-btn" data-team="${tIdx}">Lisää pelaaja</button>
      </div>
    `;

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
    inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter"){ e.preventDefault(); addBtn.click(); } });

    card.querySelectorAll('[data-del-player]').forEach(btn => {
      btn.addEventListener("click", () => {
        const pi   = parseInt(btn.getAttribute("data-del-player"), 10);
        const tIdx2 = parseInt(btn.getAttribute("data-team"), 10);
        const pName = team.players[pi]?.name || "pelaaja";
        if (!confirm(`Poistetaanko ${pName} tiimistä ${team.name}?`)) return;
        const ok = removePlayer(tIdx2, pi);
        if (!ok) { toast("Poisto epäonnistui."); return; }
        toast(`Pelaaja poistettu.`);
        render();
      });
    });

    const delTeamBtn = card.querySelector('[data-del-team]');
    delTeamBtn.addEventListener("click", () => {
      if (!confirm(`Poistetaanko tiimi ${team.name}?`)) return;
      const ok = removeTeam(tIdx);
      if (!ok) { toast("Poisto epäonnistui."); return; }
      toast(`Tiimi poistettu.`);
      render();
    });

    wrap.appendChild(card);
  });

  renderLog();
  updateControlsState();
  maybeShowWinTeam();
}

/* ---- heitot ---- */
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
      t = throwFromRawInput(value);
    }
    const res = applyThrowToCurrent(t.type, t.value);
    if (res?.error) toast(res.error);
    if (res?.events?.includes("BOUNCE_TO_25")) toast("Yli 50 → palautus 25:een (tiimi)");
    if (res?.events?.includes("WIN_50")) {
      toast("Tiimi voitti 50! 🎉");
      const stNow = getState();
      const w = stNow.teams.find(tt => tt.score === 50);
      if (w) { winShown = true; openWinModalTeam(w.name); }
    }
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

/* ---- hallinta ---- */
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

/* ---- init ---- */
document.addEventListener("DOMContentLoaded", () => {
  loadOrInit();
  $$(".quick-btn").forEach(btn => btn.addEventListener("click", () => onQuick(btn.dataset.score)));
  $("#submitFree")?.addEventListener("click", onFreeSubmit);
  $("#freeInput")?.addEventListener("keydown", (e) => { if (e.key==="Enter"){ e.preventDefault(); onFreeSubmit(); } });

  $("#addTeam")?.addEventListener("click", onAddTeam);
  $("#shuffle")?.addEventListener("click", onShuffle);
  $("#undo")?.addEventListener("click", onUndo);
  $("#newSame")?.addEventListener("click", onNewSame);
  $("#newFresh")?.addEventListener("click", onNewFresh);

  render();
});
