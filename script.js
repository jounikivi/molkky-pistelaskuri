// =========================================================
// MÖLKKY – YKSILÖPELI script.js  (päivitetty: 30.10.2025)
// Sisältää: pikanapit (0–12), heittotapa-kytkin (yksi keila / useita),
// tiukempi syötteen validointi ja nykyinen sääntölogiikka.
// =========================================================

let players = [];
let vuoroIndex = 0;
let vuorojarjestys = [];
let peliPaattynyt = false;

/* -----------------------------
   Ilmoitukset
------------------------------*/
function showNotification(message, duration = 3000) {
  const note = document.getElementById("notification");
  if (!note) return;
  note.textContent = message;
  note.classList.add("visible");
  setTimeout(() => {
    note.classList.remove("visible");
  }, duration);
}

/* -----------------------------
   Pelaajien hallinta
------------------------------*/
function addPlayer() {
  const nameInput = document.getElementById("playerName");
  const name = nameInput.value.trim();
  if (!name) return;

  players.push({ name: name, score: 0, misses: 0 });
  nameInput.value = "";

  // Päivitetään vuorojärjestys ja näkymä heti
  vuorojarjestys = [...players];
  renderPlayers();
  paivitaVuoroNaytto();

  // Näytetään viimeksi lisätty pelaaja ennen aloittajaa
  if (vuorojarjestys.length > 0) {
    const viimeisin = vuorojarjestys[vuorojarjestys.length - 1];
    const vuoroN = document.getElementById("vuoroNaytto");
    const piste = document.getElementById("vuorossaPisteet");
    if (vuoroN) vuoroN.textContent = "Lisätty: " + viimeisin.name;
    if (piste) piste.textContent = viimeisin.score;
  }
}

function arvoAloittaja() {
  if (players.length < 2) {
    showNotification("Lisää vähintään kaksi pelaajaa.");
    return;
  }

  vuorojarjestys = [...players];
  // Fisher–Yates
  for (let i = vuorojarjestys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vuorojarjestys[i], vuorojarjestys[j]] = [vuorojarjestys[j], vuorojarjestys[i]];
  }

  vuoroIndex = 0;
  peliPaattynyt = false;
  renderPlayers();
  paivitaVuoroNaytto();
}

/* -----------------------------
   Heiton käsittely
------------------------------*/
function lisaaPisteetVuorossa() {
  if (peliPaattynyt) {
    showNotification("Peli on jo päättynyt.");
    return;
  }

  const inputEl = document.getElementById("vuorossaInput");
  const raw = (inputEl?.value ?? "").trim();
  if (inputEl) inputEl.value = "";

  const pisteet = Number(raw);
  if (!Number.isInteger(pisteet) || pisteet < 0 || pisteet > 12) {
    showNotification("Syötä pisteet väliltä 0–12 (0 = huti).");
    return;
  }

  const pelaaja = vuorojarjestys[vuoroIndex];
  if (!pelaaja) {
    showNotification("Lisää pelaajat ja arvo aloittaja.");
    return;
  }

  if (pisteet === 0) {
    // Huti
    pelaaja.misses += 1;

    if (pelaaja.misses >= 3) {
      const poista = confirm(`${pelaaja.name} on heittänyt 3 kertaa peräkkäin ohi. Poistetaanko pelaaja pelistä?`);
      if (poista) {
        vuorojarjestys.splice(vuoroIndex, 1);
        if (vuorojarjestys.length === 0) {
          showNotification("Ei enää pelaajia jäljellä.");
          resetGame();
          return;
        }
        if (vuoroIndex >= vuorojarjestys.length) vuoroIndex = 0;
        renderPlayers();
        paivitaVuoroNaytto();
        return;
      } else {
        pelaaja.misses = 0;
        showNotification(`${pelaaja.name} jatkaa peliä.`);
      }
    } else {
      showNotification(`${pelaaja.name} heitti ohi (${pelaaja.misses}/3)`);
    }
  } else {
    // Osuma
    pelaaja.score += pisteet;
    pelaaja.misses = 0;

    if (pelaaja.score > 50) {
      pelaaja.score = 25;
      showNotification(`${pelaaja.name} ylitti 50 pistettä – palautetaan 25:een.`);
    } else if (pelaaja.score === 50) {
      showNotification(`${pelaaja.name} voitti pelin! 🎉`);
      peliPaattynyt = true;
      renderPlayers();
      paivitaVuoroNaytto();
      return;
    }
  }

  seuraavaVuoro();
}

function seuraavaVuoro() {
  if (!vuorojarjestys.length) return;
  vuoroIndex = (vuoroIndex + 1) % vuorojarjestys.length;
  renderPlayers();
  paivitaVuoroNaytto();
}

/* -----------------------------
   UI-päivitykset
------------------------------*/
function paivitaVuoroNaytto() {
  const vuorossa = vuorojarjestys[vuoroIndex];
  const naytto = document.getElementById("vuoroNaytto");
  const piste = document.getElementById("vuorossaPisteet");
  if (!vuorossa) {
    if (naytto) naytto.textContent = "Vuorossa: -";
    if (piste) piste.textContent = "0";
    return;
  }
  if (naytto) naytto.textContent = "Vuorossa: " + vuorossa.name;
  if (piste) piste.textContent = vuorossa.score;
}

function renderPlayers() {
  const container = document.getElementById("playerCards");
  if (!container) return;
  container.innerHTML = "";

  vuorojarjestys.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "player-card";
    card.dataset.name = player.name;
    card.style.backgroundColor = getColor(index);

    card.innerHTML = `
      <h3>${player.name}</h3>
      <p>${player.score}</p>
      <button disabled>+ Pisteet</button>
    `;
    container.appendChild(card);
  });

  if (vuorojarjestys.length > 0) {
    const vuorossa = vuorojarjestys[vuoroIndex];
    const piste = document.getElementById("vuorossaPisteet");
    if (piste) piste.textContent = vuorossa.score;
    scrollaaVuorossaKortti();
  }
}

function getColor(index) {
  const colors = ["#00796b", "#2196f3", "#f44336", "#ff9800", "#9c27b0", "#4caf50"];
  return colors[index % colors.length];
}

function scrollaaVuorossaKortti() {
  const cards = document.querySelectorAll(".player-card");
  if (!cards.length) return;
  const vuorossa = vuorojarjestys[vuoroIndex];
  cards.forEach(card => {
    if (card.dataset.name === vuorossa?.name) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function resetGame() {
  players = [];
  vuorojarjestys = [];
  vuoroIndex = 0;
  peliPaattynyt = false;

  const pc = document.getElementById("playerCards");
  if (pc) pc.innerHTML = "";

  const vn = document.getElementById("vuoroNaytto");
  const vp = document.getElementById("vuorossaPisteet");
  const vi = document.getElementById("vuorossaInput");
  if (vn) vn.textContent = "Vuorossa: -";
  if (vp) vp.textContent = "0";
  if (vi) vi.value = "";

  showNotification("Peli on nollattu.");
}

/* -----------------------------
   Pikanapit ja heittotapa
------------------------------*/
function setScoreAndSubmit(value) {
  const input = document.getElementById("vuorossaInput");
  if (!input) return;
  input.value = String(value);
  lisaaPisteetVuorossa();
}

function toggleThrowMode(isSingle) {
  const gridSingle = document.getElementById("grid-single");
  const gridMulti = document.getElementById("grid-multi");
  if (gridSingle && gridMulti) {
    gridSingle.classList.toggle("hidden", !isSingle);
    gridMulti.classList.toggle("hidden", isSingle);
  }
}

/* -----------------------------
   Tapahtumankuuntelijat
------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  // Päänapit
  const nappi = document.getElementById("vuorossaNappi");
  if (nappi) nappi.addEventListener("click", lisaaPisteetVuorossa);
  const addBtn = document.getElementById("addPlayerBtn");
  if (addBtn) addBtn.addEventListener("click", addPlayer);

  // Heittotavan kytkin (radio)
  const modeSingle = document.getElementById("mode-single");
  const modeMulti  = document.getElementById("mode-multi");
  if (modeSingle && modeMulti) {
    modeSingle.addEventListener("change", () => toggleThrowMode(true));
    modeMulti.addEventListener("change", () => toggleThrowMode(false));
    // aloitusarvo
    toggleThrowMode(true);
  }

  // Pikanapit (0–12)
  document.querySelectorAll(".quick-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const val = parseInt(e.currentTarget.dataset.score, 10);
      if (Number.isInteger(val) && val >= 0 && val <= 12) {
        setScoreAndSubmit(val);
      }
    });
  });
});
