// Pelaajat tallennetaan tähän
let players = [];
let vuoroIndex = null;
let kierros = 0;

// Pelaajille kiinteät värit
const playerColors = [
  '#b2dfdb', '#bbdefb', '#ffcdd2',
  '#ffe0b2', '#d1c4e9', '#c8e6c9'
];

// Ladataan tallennettu peli
window.onload = () => {
  const saved = localStorage.getItem("molkky_players");
  const savedVuoro = localStorage.getItem("molkky_vuoro");
  const savedKierros = localStorage.getItem("molkky_kierros");

  if (saved) {
    players = JSON.parse(saved);
    vuoroIndex = savedVuoro !== null ? parseInt(savedVuoro) : null;
    kierros = savedKierros !== null ? parseInt(savedKierros) : 0;
    renderTable();
    renderCards();
    renderVuoro();
    renderVuorojarjestys();
  }
};

// Tallennus localStorageen
function saveGame() {
  localStorage.setItem("molkky_players", JSON.stringify(players));
  localStorage.setItem("molkky_vuoro", vuoroIndex);
  localStorage.setItem("molkky_kierros", kierros);
}

// Lisää pelaaja
function addPlayer() {
  const name = document.getElementById("playerName").value.trim();
  if (name) {
    players.push({ name, score: 0, misses: 0 });
    document.getElementById("playerName").value = "";
    renderTable();
    renderCards();
    renderVuorojarjestys();
    saveGame();
  }
}

// Arvo satunnainen aloittaja
function arvoAloittaja() {
  if (players.length === 0) return;
  vuoroIndex = Math.floor(Math.random() * players.length);
  kierros = 0;
  alert("Aloittaja arvottu: " + players[vuoroIndex].name);
  renderTable();
  renderCards();
  renderVuoro();
  renderVuorojarjestys();
  saveGame();
}

// Päivitä pelaajan pisteet
function updateScore(index, fromCard = false) {
  const inputId = fromCard ? `card-keilat-${index}` : `keilat-${index}`;
  const input = document.getElementById(inputId).value.trim();
  if (!input) return;

  const pins = input
    .split(',')
    .map(k => parseInt(k))
    .filter(k => !isNaN(k) && k >= 1 && k <= 12);

  let player = players[index];
  let points = 0;

  if (pins.length === 1) {
    points = pins[0];
  } else if (pins.length > 1) {
    points = pins.length;
  }

  if (pins.length === 0) {
    player.misses++;
    if (player.misses >= 3) {
      alert(`${player.name} on pudonnut pelistä!`);
      players.splice(index, 1);
      if (index === vuoroIndex && vuoroIndex >= players.length) {
        vuoroIndex = 0;
      }
    }
  } else {
    player.score += points;
    player.misses = 0;

    if (player.score > 50) {
      player.score = 25;
      alert(`${player.name} ylitti 50 pistettä, pudotetaan 25:een!`);
    } else if (player.score === 50) {
      alert(`${player.name} voitti pelin!`);
    }
  }

  // Vuoron vaihto
  if (players.length > 0) {
    vuoroIndex = (vuoroIndex + 1) % players.length;
    if (vuoroIndex === 0) {
      kierros++;
      naytaKierrosIlmoitus(kierros === 1 ? "Aloituskierros alkaa!" : `Kierros ${kierros} alkaa!`);
    }
  }

  renderTable();
  renderCards();
  renderVuoro();
  saveGame();
}

// Kierrosilmoitus (näytetään hetkeksi)
function naytaKierrosIlmoitus(teksti) {
  const ilmoitus = document.getElementById("kierrosIlmoitus");
  if (!ilmoitus) return;
  ilmoitus.innerText = "🔄 " + teksti;
  ilmoitus.style.display = "block";
  setTimeout(() => {
    ilmoitus.style.display = "none";
  }, 2500);
}

// Näytä nykyinen vuoro
function renderVuoro() {
  const vuoroElem = document.getElementById("vuoroNaytto");
  if (!vuoroElem) return;
  if (vuoroIndex !== null && players[vuoroIndex]) {
    vuoroElem.innerHTML = `Kierros ${kierros} – <strong>Vuorossa: ${players[vuoroIndex].name}</strong>`;
  } else {
    vuoroElem.innerHTML = "Peli ei ole vielä alkanut.";
  }
}

// Näytä vuorojärjestys
function renderVuorojarjestys() {
  // const container = document.getElementById("vuorojarjestys");
  // if (!container) return;
  // const lista = players.map((p, i) => `${i + 1}. ${p.name}`).join(", ");
  // container.innerText = players.length ? `Vuorojärjestys: ${lista}` : "";
}

// Taulukko (desktop)
function renderTable() {
  const tbody = document.querySelector("#scoreTable tbody");
  tbody.innerHTML = "";

  players.forEach((player, index) => {
    const row = document.createElement("tr");
    row.classList.add("player-row");
    if (index === vuoroIndex) row.classList.add("vuorossa");

    const color = playerColors[index % playerColors.length];
    row.style.backgroundColor = color;

    row.innerHTML = `
      <td>${player.name}</td>
      <td>${player.score}</td>
      <td><input type="text" id="keilat-${index}" placeholder="1-12, esim. 1,4,10"></td>
      <td><button onclick="updateScore(${index})">Lisää pisteet</button></td>
    `;

    tbody.appendChild(row);
  });
}

// Kortit (mobiili)
function renderCards() {
  const container = document.getElementById("playerCards");
  if (!container) return;
  container.innerHTML = "";

  players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "player-card";
    if (index === vuoroIndex) card.classList.add("vuorossa");

    const color = playerColors[index % playerColors.length];
    card.style.backgroundColor = color;

    card.innerHTML = `
      <h3>${player.name}</h3>
      <p>Pisteet: ${player.score}</p>
      <input type="text" id="card-keilat-${index}" placeholder="1-12, esim. 1,4,10">
      <button onclick="updateScore(${index}, true)">Lisää pisteet</button>
    `;

    container.appendChild(card);
  });
}

// Tyhjennä peli
function resetGame() {
  if (confirm("Haluatko varmasti nollata pelin?")) {
    players = [];
    vuoroIndex = null;
    kierros = 0;
    localStorage.clear();
    renderTable();
    renderCards();
    renderVuoro();
    renderVuorojarjestys();
  }
}
