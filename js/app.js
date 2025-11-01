/* app.js — Yksilöpeli UI + logiikka (UI päivitetty: card__header + chips + eliminated) */

/* ---------------------
   PERSISTENCE & STATE
--------------------- */
const LS_KEY = "molkky_solo_v2";

const defaultState = () => ({
  players: [],          // [{ id, name, score, active, misses, history: [ {score, ts} ] }]
  order: [],            // array of player ids (heittojärjestys)
  turnIndex: 0,         // index into order
  ended: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  history: []           // game-level history if tarvitaan
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    // suojaus: pakota kentät
    data.players ??= [];
    data.players.forEach(p => {
      p.score ??= 0;
      p.active ??= true;
      p.misses ??= 0;
      p.history ??= [];
    });
    data.order ??= data.players.map(p => p.id);
    data.turnIndex ??= 0;
    data.ended ??= false;
    data.updatedAt ??= Date.now();
    data.createdAt ??= data.createdAt ?? Date.now();
    data.history ??= data.history ?? [];
    return data;
  } catch {
    return defaultState();
  }
}

function save() {
  state.updatedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

/* ---------------------
   HELPERS
--------------------- */
const uid = () => Math.random().toString(36).slice(2, 10);

function currentPlayer() {
  if (state.ended) return null;
  const aliveOrder = state.order.filter(id => getPlayer(id)?.active);
  if (!aliveOrder.length) return null;
  // varmistetaan turnIndex kohdistuu elossa olevaan
  let idx = state.turnIndex % state.order.length;
  for (let i = 0; i < state.order.length; i++) {
    const id = state.order[(idx + i) % state.order.length];
    const p = getPlayer(id);
    if (p && p.active) {
      state.turnIndex = (idx + i) % state.order.length;
      return p;
    }
  }
  return null;
}

function nextTurn() {
  if (state.ended) return;
  let steps = 0;
  do {
    state.turnIndex = (state.turnIndex + 1) % state.order.length;
    steps++;
    const np = getPlayer(state.order[state.turnIndex]);
    if (np?.active) break;
  } while (steps <= state.order.length);
}

function getPlayer(id) {
  return state.players.find(p => p.id === id);
}

function statsFromPlayer(p) {
  // Heitot & keskiarvo & huti% turvallisesti
  const throws = p.history?.length ?? 0;
  const sum = (p.history ?? []).reduce((acc, h) => acc + (Number(h.score) || 0), 0);
  const misses = (p.history ?? []).reduce((acc, h) => acc + (h.score === 0 ? 1 : 0), 0);
  const avg = throws ? (sum / throws) : 0;
  const missPct = throws ? (100 * misses / throws) : 0;

  return {
    throws,
    avg,
    missPct
  };
}

/* ---------------------
   SCORE RULES
--------------------- */
function applyScoreRules(oldScore, gained) {
  const next = (oldScore ?? 0) + (gained ?? 0);
  if (next === 50) return { score: 50, win: true, reset25: false };
  if (next > 50)   return { score: 25, win: false, reset25: true };
  return { score: next, win: false, reset25: false };
}

/* ---------------------
   DOM NODES
--------------------- */
const els = {
  playersGrid: document.getElementById("playersGrid"),
  emptyState:  document.getElementById("emptyState"),
  playerName:  document.getElementById("playerName"),
  addPlayer:   document.getElementById("addPlayer"),
  shuffle:     document.getElementById("shuffle"),
  undo:        document.getElementById("undo"),
  newSame:     document.getElementById("newSame"),
  newFresh:    document.getElementById("newFresh"),
  freeInput:   document.getElementById("freeInput"),
  submitFree:  document.getElementById("submitFree"),
  turnTitle:   document.getElementById("turnTitle"),
  // alt controls (sticky bar)
  shuffleAlt:  document.getElementById("shuffleAlt"),
  undoAlt:     document.getElementById("undoAlt"),
  winModal:    document.getElementById("winModal"),
  winText:     document.getElementById("winText"),
  winSame:     document.getElementById("winSame"),
  winFresh:    document.getElementById("winFresh"),
  winClose:    document.getElementById("winClose"),
  toast:       document.getElementById("toast")
};

/* ---------------------
   RENDER (UI päivitykset)
--------------------- */
function render() {
  renderTurn();
  renderPlayers();
  renderControls();
  save();
}

function renderTurn() {
  if (!els.turnTitle) return;
  if (state.ended) {
    els.turnTitle.textContent = "Peli päättynyt";
    return;
  }
  const p = currentPlayer();
  els.turnTitle.textContent = p ? `Vuorossa: ${p.name}` : "Vuorossa: –";
}

function renderPlayers() {
  const grid = els.playersGrid;
  if (!grid) return;
  grid.innerHTML = "";

  if (!state.players.length) {
    els.emptyState?.classList.remove("hidden");
    return;
  }
  els.emptyState?.classList.add("hidden");

  state.players.forEach(p => {
    const card = document.createElement("article");
    card.className = "player-card";
    card.classList.toggle("card--eliminated", !p.active);
    card.dataset.eliminated = String(!p.active);

    const stats = statsFromPlayer(p);

    card.innerHTML = `
      <div class="card__header">
        <div class="card__title">${escapeHtml(p.name)}</div>
        <div class="chips">
          <span class="chip chip--score">🥇 ${p.score ?? 0}</span>
          <span class="chip">${stats.throws} heittoa</span>
          <span class="chip chip--avg">${stats.avg.toFixed(1)}</span>
          <span class="chip chip--miss">${Math.round(stats.missPct)}% huti</span>
        </div>
      </div>
      <div class="card__body">
        <div class="card__score">Pisteet: ${p.score ?? 0}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderControls() {
  const canShuffle = state.players.length >= 2 && state.order.length >= 2 && !state.ended;
  const canUndo = state.players.some(p => p.history?.length) && !state.ended;

  [els.shuffle, els.shuffleAlt].forEach(b => b && (b.disabled = !canShuffle));
  [els.undo, els.undoAlt].forEach(b => b && (b.disabled = !canUndo));
}

/* ---------------------
   GAME ACTIONS
--------------------- */
function addPlayer() {
  const name = (els.playerName?.value ?? "").trim();
  if (!name) return toast("Anna nimi");
  const p = {
    id: uid(),
    name,
    score: 0,
    active: true,
    misses: 0,        // peräkkäiset hutit
    history: []       // [{ score, ts }]
  };
  state.players.push(p);
  state.order = state.players.map(pl => pl.id);
  els.playerName.value = "";
  render();
}

function shuffleOrder() {
  if (state.players.length < 2) return;
  const arr = [...state.players.map(p => p.id)];
  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  state.order = arr;
  state.turnIndex = 0;
  render();
}

function submitThrowValue(v) {
  if (state.ended) return;
  const p = currentPlayer();
  if (!p) return;

  const scoreVal = Number(v);
  const isMiss = scoreVal === 0;

  if (isMiss) {
    p.misses = (p.misses ?? 0) + 1;
  } else {
    p.misses = 0;
  }

  // tippuminen
  if (p.misses >= 3) {
    p.active = false;
  }

  // lisää historiaan (pelaajakohtainen)
  p.history.push({ score: scoreVal, ts: Date.now() });

  // pisteet vain jos ei tippunut juuri nyt hutien takia
  if (p.active) {
    const res = applyScoreRules(p.score ?? 0, scoreVal);
    p.score = res.score;

    if (res.win) {
      openWin(`${p.name} saavutti 50 pistettä!`);
      state.ended = true;
      render();
      return;
    }
    if (res.reset25) {
      toast(`${p.name} yli 50 → palautus 25 pisteeseen`);
    }
  } else {
    toast(`${p.name} tippui 3 peräkkäisen hutin jälkeen`);
  }

  // Tarkista: jos kaikki tippuneet → peli ohi
  if (state.players.every(pl => !pl.active)) {
    state.ended = true;
    openWin(`Kaikki tippuivat. Ei voittajaa.`);
    render();
    return;
  }

  nextTurn();
  render();
}

function undo() {
  // Perutaan viimeisin heitto siltä pelaajalta, joka heitti viimeksi.
  // Etsitään viimeisin p, jolla historya
  const lastWithThrow = [...state.players].reverse().find(pl => pl.history?.length);
  if (!lastWithThrow) return;

  const last = lastWithThrow.history.pop();
  // Palauta missit (jos 0)
  if (last.score === 0) {
    lastWithThrow.misses = Math.max(0, (lastWithThrow.misses ?? 0) - 1);
  } else {
    // jos oli pisteitä, yritetään palauttaa aiempi piste
    // lasketaan pisteet koko historiasta uudestaan varman päälle
    const recalc = (lastWithThrow.history ?? []).reduce((acc, h) => {
      const r = applyScoreRules(acc, h.score);
      return r.score;
    }, 0);
    lastWithThrow.score = recalc;
    // jos pelaaja oli tiputettu, palauta aktiiviseksi jos on historiaa jäljellä ja missit < 3
    if (lastWithThrow.misses >= 3) {
      lastWithThrow.active = true;
    }
  }
  state.ended = false;
  toast("Peruttu viimeisin heitto");
  render();
}

function newGameSame() {
  // sama kokoonpano, reset pisteet/missit/historiat
  state.players.forEach(p => {
    p.score = 0;
    p.misses = 0;
    p.active = true;
    p.history = [];
  });
  state.turnIndex = 0;
  state.ended = false;
  closeWin();
  render();
}

function newGameFresh() {
  state = defaultState();
  closeWin();
  render();
}

/* ---------------------
   WIN MODAL & TOAST
--------------------- */
function openWin(text) {
  els.winText && (els.winText.textContent = text);
  els.winModal?.removeAttribute("hidden");
}
function closeWin() {
  els.winModal?.setAttribute("hidden", "");
}
function toast(msg) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 1600);
}

/* ---------------------
   WIRE EVENTS
--------------------- */
els.addPlayer?.addEventListener("click", addPlayer);
els.shuffle?.addEventListener("click", shuffleOrder);
els.shuffleAlt?.addEventListener("click", shuffleOrder);
els.undo?.addEventListener("click", undo);
els.undoAlt?.addEventListener("click", undo);
els.newSame?.addEventListener("click", newGameSame);
els.newFresh?.addEventListener("click", newGameFresh);
els.winSame?.addEventListener("click", newGameSame);
els.winFresh?.addEventListener("click", newGameFresh);
els.winClose?.addEventListener("click", closeWin);

els.submitFree?.addEventListener("click", () => {
  const val = (els.freeInput?.value ?? "").trim();
  if (!val) return;
  const n = Number(val);
  if (Number.isNaN(n) || n < 0 || n > 12) {
    toast("Syötä numero 0–12");
    return;
  }
  submitThrowValue(n);
  els.freeInput.value = "";
});

// Yläruudukon nopeat napit
document.querySelectorAll(".quick-btn").forEach(b => {
  b.addEventListener("click", () => {
    const v = Number(b.dataset.score || 0);
    submitThrowValue(v);
  });
});

// Sticky throwbar napit peilataan HTML-sivun modulissa (game.html),
// mutta varmistetaan fallback:
document.querySelectorAll(".tb-key")?.forEach(b => {
  b.addEventListener("click", () => submitThrowValue(Number(b.dataset.score||0)));
});

// Ensipiirto
render();
