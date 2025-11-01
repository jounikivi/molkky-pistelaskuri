/* team-app.js — Joukkuepeli UI (UI päivitetty: card__header + chips + eliminated) */

/* ---------------------
   PERSISTENCE & STATE
--------------------- */
const LS_TEAM_KEY = "molkky_team_v2";

const defaultTeamState = () => ({
  teams: [],          // [{ id, name, score, active, players:[{id,name,active,misses,history:[]}] }]
  order: [],          // team id order
  playerTurnIdx: 0,   // index of current player within current team (kierto pelaajien välillä)
  teamTurnIdx: 0,     // current team index
  ended: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

let tstate = loadT();

function loadT() {
  try {
    const raw = localStorage.getItem(LS_TEAM_KEY);
    if (!raw) return defaultTeamState();
    const data = JSON.parse(raw);
    data.teams ??= [];
    data.teams.forEach(t => {
      t.score ??= 0;
      t.active ??= true;
      t.players ??= [];
      t.players.forEach(p => {
        p.active ??= true;
        p.misses ??= 0;
        p.history ??= [];
      });
    });
    data.order ??= data.teams.map(t => t.id);
    data.playerTurnIdx ??= 0;
    data.teamTurnIdx ??= 0;
    data.ended ??= false;
    data.updatedAt ??= Date.now();
    data.createdAt ??= data.createdAt ?? Date.now();
    return data;
  } catch {
    return defaultTeamState();
  }
}

function saveT() {
  tstate.updatedAt = Date.now();
  localStorage.setItem(LS_TEAM_KEY, JSON.stringify(tstate));
}

/* ---------------------
   HELPERS
--------------------- */
const tuid = () => Math.random().toString(36).slice(2, 10);

function getTeam(id) {
  return tstate.teams.find(t => t.id === id);
}

function aliveTeams() {
  return tstate.teams.filter(t => t.active);
}

function currentTeam() {
  if (tstate.ended) return null;
  const alive = aliveTeams();
  if (!alive.length) return null;
  // varmistetaan teamTurnIdx viittaa elossa olevaan tiimiin
  let idx = tstate.teamTurnIdx % tstate.order.length;
  for (let i = 0; i < tstate.order.length; i++) {
    const id = tstate.order[(idx + i) % tstate.order.length];
    const t = getTeam(id);
    if (t?.active) {
      tstate.teamTurnIdx = (idx + i) % tstate.order.length;
      return t;
    }
  }
  return null;
}

function currentPlayerTeamScoped() {
  const team = currentTeam();
  if (!team) return { team: null, player: null };
  if (!team.players?.length) return { team, player: null };

  // hae seuraava elossa oleva pelaaja tiimistä aloittaen playerTurnIdx:stä
  let idx = tstate.playerTurnIdx % team.players.length;
  for (let i = 0; i < team.players.length; i++) {
    const p = team.players[(idx + i) % team.players.length];
    if (p.active) {
      tstate.playerTurnIdx = (idx + i) % team.players.length;
      return { team, player: p };
    }
  }
  return { team, player: null };
}

function nextTurnTeam() {
  // siirrä vuoro seuraavaan tiimiin, ja tiimin sisällä seuraavaan pelaajaan
  const team = currentTeam();
  if (!team) return;

  // siirrä tiimin sisäinen pelaaja eteenpäin
  if (team.players?.length) {
    let steps = 0;
    do {
      tstate.playerTurnIdx = (tstate.playerTurnIdx + 1) % team.players.length;
      steps++;
      if (team.players[tstate.playerTurnIdx]?.active) break;
    } while (steps <= team.players.length);
  }

  // siirrä tiimi eteenpäin (vain elossa olevat)
  let stepsT = 0;
  do {
    tstate.teamTurnIdx = (tstate.teamTurnIdx + 1) % tstate.order.length;
    stepsT++;
    const nextT = getTeam(tstate.order[tstate.teamTurnIdx]);
    if (nextT?.active) break;
  } while (stepsT <= tstate.order.length);
}

function tstatsFromTeam(t) {
  // Joukkueelle näytetään score + heittojen yhteismäärä (kaikki pelaajat)
  const all = (t.players ?? []).flatMap(p => p.history ?? []);
  const throws = all.length;
  const sum = all.reduce((a, h) => a + (Number(h.score) || 0), 0);
  const misses = all.reduce((a, h) => a + (h.score === 0 ? 1 : 0), 0);
  const avg = throws ? (sum / throws) : 0;
  const missPct = throws ? (100 * misses / throws) : 0;
  return { throws, avg, missPct };
}

function pstats(p) {
  const throws = p.history?.length ?? 0;
  const sum = (p.history ?? []).reduce((a, h) => a + (Number(h.score) || 0), 0);
  const misses = (p.history ?? []).reduce((a, h) => a + (h.score === 0 ? 1 : 0), 0);
  const avg = throws ? (sum / throws) : 0;
  const missPct = throws ? (100 * misses / throws) : 0;
  return { throws, avg, missPct };
}

function applyScoreRulesTeam(oldScore, gained) {
  const next = (oldScore ?? 0) + (gained ?? 0);
  if (next === 50) return { score: 50, win: true, reset25: false };
  if (next > 50)   return { score: 25, win: false, reset25: true };
  return { score: next, win: false, reset25: false };
}

/* ---------------------
   DOM NODES
--------------------- */
const tel = {
  teamsGrid:  document.getElementById("teamsGrid"),
  emptyState: document.getElementById("emptyState"),
  teamName:   document.getElementById("teamName"),
  addTeam:    document.getElementById("addTeam"),
  shuffle:    document.getElementById("shuffle"),
  shuffleAlt: document.getElementById("shuffleAlt"),
  undo:       document.getElementById("undo"),
  undoAlt:    document.getElementById("undoAlt"),
  newSame:    document.getElementById("newSame"),
  newFresh:   document.getElementById("newFresh"),
  freeInput:  document.getElementById("freeInput"),
  submitFree: document.getElementById("submitFree"),
  turnTitle:  document.getElementById("turnTitle"),
  winModal:   document.getElementById("winModal"),
  winText:    document.getElementById("winText"),
  winSame:    document.getElementById("winSame"),
  winFresh:   document.getElementById("winFresh"),
  winClose:   document.getElementById("winClose"),
  toast:      document.getElementById("toast")
};

/* ---------------------
   RENDER
--------------------- */
function trender() {
  trenderTurn();
  trenderTeams();
  trenderControls();
  saveT();
}

function trenderTurn() {
  if (!tel.turnTitle) return;
  if (tstate.ended) {
    tel.turnTitle.textContent = "Peli päättynyt";
    return;
  }
  const { team, player } = currentPlayerTeamScoped();
  if (team && player) {
    tel.turnTitle.textContent = `Vuorossa: ${team.name} – ${player.name}`;
  } else if (team) {
    tel.turnTitle.textContent = `Vuorossa: ${team.name}`;
  } else {
    tel.turnTitle.textContent = "Vuorossa: –";
  }
}

function trenderTeams() {
  const grid = tel.teamsGrid;
  if (!grid) return;
  grid.innerHTML = "";

  if (!tstate.teams.length) {
    tel.emptyState?.classList.remove("hidden");
    return;
  }
  tel.emptyState?.classList.add("hidden");

  tstate.teams.forEach(team => {
    const tstats = tstatsFromTeam(team);

    const card = document.createElement("article");
    card.className = "team-card";
    card.classList.toggle("card--eliminated", !team.active);
    card.dataset.eliminated = String(!team.active);

    // Pelaajalista
    const playersHtml = (team.players ?? []).map(p => {
      const ps = pstats(p);
      return `
        <li class="${p.active ? "" : "muted"}">
          <span>${escapeHtml(p.name)}</span>
          <span class="chips">
            <span class="chip chip--score">🥇 ${sumScoreFromHistory(p.history)}</span>
            <span class="chip">${ps.throws}</span>
            <span class="chip chip--miss">${Math.round(ps.missPct)}%</span>
          </span>
        </li>
      `;
    }).join("");

    card.innerHTML = `
      <div class="card__header">
        <div class="card__title">${escapeHtml(team.name)}</div>
        <div class="chips">
          <span class="chip chip--score">🥇 ${team.score ?? 0}</span>
          <span class="chip">${tstats.throws} heittoa</span>
          <span class="chip chip--avg">${tstats.avg.toFixed(1)}</span>
          <span class="chip chip--miss">${Math.round(tstats.missPct)}% huti</span>
        </div>
      </div>

      <div class="card__body">
        <div class="card__score">Pisteet: ${team.score ?? 0}</div>
        ${(team.players?.length)
          ? `<ul class="list thin">${playersHtml}</ul>`
          : `<p class="muted">Ei pelaajia.</p>`}
      </div>
    `;
    grid.appendChild(card);
  });
}

function trenderControls() {
  const canShuffle = tstate.teams.length >= 2 && aliveTeams().length >= 2 && !tstate.ended;
  const canUndo = tstate.teams.some(t => (t.players ?? []).some(p => p.history?.length)) && !tstate.ended;

  [tel.shuffle, tel.shuffleAlt].forEach(b => b && (b.disabled = !canShuffle));
  [tel.undo, tel.undoAlt].forEach(b => b && (b.disabled = !canUndo));
}

/* ---------------------
   TEAM ACTIONS
--------------------- */
function addTeam() {
  const name = (tel.teamName?.value ?? "").trim();
  if (!name) return ttoast("Anna tiimin nimi");
  const team = {
    id: tuid(),
    name,
    score: 0,
    active: true,
    players: []
  };
  tstate.teams.push(team);
  tstate.order = tstate.teams.map(t => t.id);
  tel.teamName.value = "";
  trender();
}

function submitThrowTeam(v) {
  if (tstate.ended) return;
  const { team, player } = currentPlayerTeamScoped();
  if (!team || !player) return;

  const scoreVal = Number(v);
  const isMiss = scoreVal === 0;

  if (isMiss) {
    player.misses = (player.misses ?? 0) + 1;
  } else {
    player.misses = 0;
  }

  if (player.misses >= 3) {
    player.active = false;
    ttoast(`${player.name} tippui (3 peräkkäistä hutia)`);
  }

  // Kirjaa pelaajalle
  player.history.push({ score: scoreVal, ts: Date.now() });

  // Jos pelaajia ei ole elossa tiimissä → tiimi inaktiivinen
  if (!team.players.some(p => p.active)) {
    team.active = false;
  }

  // Pisteet lisätään tiimille (Mölkyn joukkueversio)
  if (team.active) {
    const res = applyScoreRulesTeam(team.score ?? 0, scoreVal);
    team.score = res.score;

    if (res.win) {
      openWinT(`${team.name} saavutti 50 pistettä!`);
      tstate.ended = true;
      trender();
      return;
    }
    if (res.reset25) {
      ttoast(`${team.name} yli 50 → palautus 25 pisteeseen`);
    }
  }

  // Kaikki tiimit tipahtaneet?
  if (tstate.teams.every(t => !t.active)) {
    tstate.ended = true;
    openWinT(`Kaikki tiimit tippuivat. Ei voittajaa.`);
    trender();
    return;
  }

  nextTurnTeam();
  trender();
}

function undoTeam() {
  // Etsi viimeisin pelaaja, jolla historiaa (takaperin)
  for (let ti = tstate.teams.length - 1; ti >= 0; ti--) {
    const t = tstate.teams[ti];
    for (let pi = (t.players?.length ?? 0) - 1; pi >= 0; pi--) {
      const p = t.players[pi];
      if (p.history?.length) {
        const last = p.history.pop();
        if (last.score === 0) {
          p.misses = Math.max(0, (p.misses ?? 0) - 1);
        } else {
          // laske tiimin pisteet uudelleen kaikkien pelaajien historiasta
          const sumTeam = (t.players ?? []).flatMap(pl => pl.history ?? []);
          const newScore = sumTeam.reduce((acc, h) => {
            const r = applyScoreRulesTeam(acc, h.score);
            return r.score;
          }, 0);
          t.score = newScore;
        }
        // Palauta statuksia
        if (!p.active) p.active = true;
        if (!t.active) t.active = true;
        tstate.ended = false;
        ttoast("Peruttu viimeisin heitto");
        trender();
        return;
      }
    }
  }
}

function newTeamSame() {
  tstate.teams.forEach(t => {
    t.score = 0;
    t.active = true;
    t.players.forEach(p => {
      p.active = true; p.misses = 0; p.history = [];
    });
  });
  tstate.teamTurnIdx = 0;
  tstate.playerTurnIdx = 0;
  tstate.ended = false;
  closeWinT();
  trender();
}

function newTeamFresh() {
  tstate = defaultTeamState();
  closeWinT();
  trender();
}

/* ---------------------
   UTIL
--------------------- */
function sumScoreFromHistory(history) {
  return (history ?? []).reduce((a, h) => a + (Number(h.score) || 0), 0);
}

/* ---------------------
   WIN & TOAST
--------------------- */
function openWinT(text) {
  tel.winText && (tel.winText.textContent = text);
  tel.winModal?.removeAttribute("hidden");
}
function closeWinT() {
  tel.winModal?.setAttribute("hidden", "");
}
function ttoast(msg) {
  if (!tel.toast) return;
  tel.toast.textContent = msg;
  tel.toast.classList.add("show");
  setTimeout(() => tel.toast.classList.remove("show"), 1600);
}

/* ---------------------
   WIRE EVENTS
--------------------- */
tel.addTeam?.addEventListener("click", addTeam);
tel.shuffle?.addEventListener("click", shuffleTeams);
tel.shuffleAlt?.addEventListener("click", shuffleTeams);
tel.undo?.addEventListener("click", undoTeam);
tel.undoAlt?.addEventListener("click", undoTeam);
tel.newSame?.addEventListener("click", newTeamSame);
tel.newFresh?.addEventListener("click", newTeamFresh);
tel.winSame?.addEventListener("click", newTeamSame);
tel.winFresh?.addEventListener("click", newTeamFresh);
tel.winClose?.addEventListener("click", closeWinT);

tel.submitFree?.addEventListener("click", () => {
  const val = (tel.freeInput?.value ?? "").trim();
  if (!val) return;
  const n = Number(val);
  if (Number.isNaN(n) || n < 0 || n > 12) {
    ttoast("Syötä numero 0–12");
    return;
  }
  submitThrowTeam(n);
  tel.freeInput.value = "";
});

document.querySelectorAll(".quick-btn").forEach(b => {
  b.addEventListener("click", () => {
    const v = Number(b.dataset.score || 0);
    submitThrowTeam(v);
  });
});

document.querySelectorAll(".tb-key")?.forEach(b => {
  b.addEventListener("click", () => submitThrowTeam(Number(b.dataset.score||0)));
});

/* Shuffle (tiimit) */
function shuffleTeams() {
  if (tstate.teams.length < 2) return;
  const arr = [...tstate.teams.map(t => t.id)];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  tstate.order = arr;
  tstate.teamTurnIdx = 0;
  tstate.playerTurnIdx = 0;
  trender();
}

/* Ensipiirto */
trender();
