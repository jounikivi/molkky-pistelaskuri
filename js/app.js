/* Mölkky – Yksinpeli (v2.0.1)
   - Pisteet kirjataan vain vuorossa olevalle pelaajalle
   - 3 hutia -> pelaaja passivoidaan
   - 50 ylitys -> 25
   - Tarkka undo (viimeinen heitto)
   - Tallennus localStorageen
*/

(() => {
  const STORAGE_KEY = "molkky_solo_state";
  const LINEUP_KEY  = "molkky_solo_lineup";

  /** ---------- State ---------- */
  let players = [];     // [{ id, name, score, throws, missCount, active, winner, history:[] }]
  let currentIndex = 0; // vuorossa olevan pelaajan indeksi
  let turn = 1;         // vuoronumero (näytetään vain tiedoksi)

  /** ---------- DOM ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const turnEl = $("#turnIndicator");
  const currentNameEl = $("#currentPlayerName");
  const playersContainer = $("#playersContainer");
  const manualInput = $("#manualInput");
  const toastEl = $("#toast");

  /** ---------- Utils ---------- */
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toastEl.hidden = true), 2200);
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ players, currentIndex, turn })
    );
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const s = JSON.parse(raw);
      players = s.players || [];
      currentIndex = s.currentIndex ?? 0;
      turn = s.turn ?? 1;
      // pientä saneerausta
      players.forEach(p => {
        p.history = p.history || [];
        if (typeof p.active === "undefined") p.active = true;
        if (typeof p.missCount !== "number") p.missCount = 0;
        if (typeof p.throws !== "number") p.throws = 0;
        if (typeof p.score !== "number") p.score = 0;
      });
      return true;
    } catch {
      return false;
    }
  }

  function saveLineup() {
    const names = players.map(p => p.name);
    localStorage.setItem(LINEUP_KEY, JSON.stringify(names));
  }

  function loadLineup() {
    const raw = localStorage.getItem(LINEUP_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  /** ---------- Core game ---------- */
  function addPlayer(name) {
    const n = (name || "").trim();
    if (!n) return;
    players.push({
      id: uid(),
      name: n,
      score: 0,
      throws: 0,
      missCount: 0,
      active: true,
      winner: false,
      history: []
    });
    if (players.length === 1) currentIndex = 0;
    saveLineup();
    saveState();
    render();
  }

  function resetPlayers(names = []) {
    players = names.map(n => ({
      id: uid(),
      name: n,
      score: 0,
      throws: 0,
      missCount: 0,
      active: true,
      winner: false,
      history: []
    }));
    currentIndex = 0;
    turn = 1;
    saveLineup();
    saveState();
    render();
  }

  function randomizeOrder() {
    if (players.length <= 1) return;
    players = players
      .map(p => [Math.random(), p])
      .sort((a, b) => a[0] - b[0])
      .map(([, p]) => p);
    currentIndex = 0;
    turn = 1;
    saveState();
    render();
  }

  function advanceTurn() {
    if (players.length === 0) return;

    let next = currentIndex;
    let cycled = 0;
    do {
      next = (next + 1) % players.length;
      cycled++;
      // jos kaikki passivoitu, jää nykyiseen
      if (cycled > players.length + 1) {
        return;
      }
    } while (players[next].active === false);

    currentIndex = next;
    // kasvatetaan vuoroa, kun kierros nollautuu takaisin nollaan
    if (currentIndex === 0) turn++;
  }

  function addPointsToCurrentPlayer(points) {
    const p = players[currentIndex];
    if (!p) return;

    // talteen undo:lle
    p.history.push({
      beforeScore: p.score,
      beforeMiss: p.missCount,
      beforeThrows: p.throws,
      beforeActive: p.active,
      beforeWinner: p.winner,
      points
    });

    p.throws++;

    if (points === 0) {
      p.missCount++;
      if (p.missCount >= 3) {
        p.active = false; // kolmas huti -> ulos
        showToast(`${p.name} kolmas huti – ulkona`);
      }
    } else {
      p.missCount = 0; // osuma nollaa hutin laskurin

      let s = p.score + points;
      if (s > 50) {
        s = 25; // yli -> 25
        showToast(`${p.name} ylitti 50 → 25`);
      }
      p.score = s;
      if (p.score === 50) {
        p.active = false;
        p.winner = true;
        showToast(`${p.name} voitti!`);
      }
    }

    // jos peliä on vielä, vaihda vuoro
    const stillActive = players.some(pl => pl.active);
    if (stillActive) {
      advanceTurn();
    }

    saveState();
    render();
  }

  function undoLast() {
    if (!players.length) return;

    // etsi edellisestä taaksepäin se pelaaja, jolla on historiaa
    let idx = (currentIndex - 1 + players.length) % players.length;
    for (let i = 0; i < players.length; i++) {
      const p = players[idx];
      if (p.history && p.history.length) {
        const last = p.history.pop();
        p.score = last.beforeScore;
        p.missCount = last.beforeMiss;
        p.throws = last.beforeThrows;
        p.active = last.beforeActive;
        p.winner = last.beforeWinner;

        // undo palauttaa vuoron tekijälleen
        currentIndex = idx;
        saveState();
        render();
        return;
      }
      idx = (idx - 1 + players.length) % players.length;
    }
  }

  /** ---------- Render ---------- */
  function percent(n, d) {
    if (!d) return "0%";
    return `${Math.round((n / d) * 1000) / 10}%`;
  }

  function render() {
    // Vuoro-indikaattori
    turnEl.textContent = turn;
    const cp = players[currentIndex];
    currentNameEl.textContent = cp ? cp.name : "–";

    // Pelaajakortit
    playersContainer.innerHTML = "";
    players.forEach((p, i) => {
      const el = document.createElement("article");
      el.className = "player-card";
      if (i === currentIndex) el.classList.add("active");
      if (p.active === false) el.classList.add("inactive");
      if (p.winner) el.classList.add("winner");

      const missRate = percent(p.missCount, Math.max(1, p.throws));
      const throwText = `${p.throws} heittoa ${missRate} huti`;

      el.innerHTML = `
        <div class="row between center">
          <div class="h5">${escapeHtml(p.name)}</div>
          <div class="pill ${p.active ? "" : "pill--muted"}">
            ${p.winner ? "Voittaja" : (p.active ? "Aktiivinen" : "Ulkona")}
          </div>
        </div>

        <div class="small muted mt-s">🥇 ${throwText}</div>
        <div class="h4 mt">Pisteet: ${p.score}</div>
      `;

      playersContainer.appendChild(el);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /** ---------- Init & Events ---------- */
  function bindEvents() {
    // 1–12 napit
    $$("[data-score]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = parseInt(btn.dataset.score, 10);
        if (Number.isFinite(v)) addPointsToCurrentPlayer(v);
      });
    });

    // Huti
    const missBtn = $("#missBtn");
    missBtn?.addEventListener("click", () => addPointsToCurrentPlayer(0));

    // Manuaalinen lisää
    $("#manualAddBtn")?.addEventListener("click", () => {
      const v = parseInt(manualInput.value, 10);
      if (!Number.isFinite(v) || v < 0 || v > 12) return;
      addPointsToCurrentPlayer(v);
      manualInput.value = "";
      manualInput.blur();
    });

    // Alapalkin keypad
    $$("[data-keypad]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = parseInt(btn.dataset.keypad, 10);
        if (Number.isFinite(v)) addPointsToCurrentPlayer(v);
      });
    });

    // Undo
    $$("[data-action='undo']").forEach(btn => {
      btn.addEventListener("click", undoLast);
    });

    // Pelaajien lisääminen
    $("#addPlayerBtn")?.addEventListener("click", () => {
      const name = $("#addPlayerName").value;
      addPlayer(name);
      $("#addPlayerName").value = "";
    });

    // Arvo järjestys
    $("#randomizeBtn")?.addEventListener("click", randomizeOrder);

    // Sama kokoonpano
    $("#sameLineupBtn")?.addEventListener("click", () => {
      const names = loadLineup();
      if (!names.length) {
        showToast("Ei aiempaa kokoonpanoa");
        return;
      }
      resetPlayers(names);
      showToast("Sama kokoonpano ladattu");
    });

    // Uudet pelaajat (tyhjennä)
    $("#newPlayersBtn")?.addEventListener("click", () => {
      resetPlayers([]);
      showToast("Peli nollattu");
    });

    // Enter lisää pelaajan nimen
    $("#addPlayerName")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        $("#addPlayerBtn").click();
      }
    });
  }

  function boot() {
    const restored = loadState();
    if (!restored) {
      // yritä aloittaa viimeisestä kokoonpanosta
      const names = loadLineup();
      resetPlayers(names);
    }
    bindEvents();
    render();
  }

  // Käynnistä
  document.addEventListener("DOMContentLoaded", boot);
})();
