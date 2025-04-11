
console.log("✅ Ladataan team-script.js (joukkueversio)!");

let players = [];
let teams = {};
let vuorojarjestys = [];
let vuoroIndex = 0;
let peliPaattynyt = false;

function addPlayer() {
  const nameInput = document.getElementById("playerName");
  const teamInput = document.getElementById("teamName");
  const name = nameInput.value.trim();
  const team = teamInput.value.trim();
  if (!name || !team) return;

  const player = { name, team, score: 0, misses: 0 };
  players.push(player);

  if (!teams[team]) {
    teams[team] = [];
  }
  teams[team].push(player);

  nameInput.value = "";
  teamInput.value = "";

  if (players.length < 2) {
  vuorojarjestys = [...players];
} else {
  vuorojarjestys = generateFairTurnOrder(players);
}
  renderPlayers();
  paivitaVuoroNaytto();
}

function generateFairTurnOrder(players) {
  const shuffled = [...players];
  let valid = false;

  while (!valid) {
    shuffleArray(shuffled);
    valid = true;
    for (let i = 0; i < shuffled.length - 1; i++) {
      if (shuffled[i].team === shuffled[i + 1].team) {
        valid = false;
        break;
      }
    }
  }

  return shuffled;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function lisaaPisteetVuorossa() {
  if (peliPaattynyt) {
    showNotification("Peli on jo päättynyt.");
    return;
  }

  const input = document.getElementById("vuorossaInput");
  const pisteetStr = input.value.trim();
  input.value = "";

  if (!/^([0-9]|1[0-2])$/.test(pisteetStr)) {
    showNotification("Syötä pisteet väliltä 0–12 (0 = huti).");
    return;
  }

  const pisteet = parseInt(pisteetStr);
  const pelaaja = vuorojarjestys[vuoroIndex];

  if (pisteet === 0) {
    pelaaja.misses++;
    if (pelaaja.misses >= 3) {
      showNotification(`${pelaaja.name} on heittänyt 3 hutia. Nollataan hudit.`);
      pelaaja.misses = 0;
    } else {
      showNotification(`${pelaaja.name} heitti ohi (${pelaaja.misses}/3)`);
    }
  } else {
    pelaaja.score += pisteet;
    pelaaja.misses = 0;

    if (pelaaja.score > 50) {
      pelaaja.score = 25;
      showNotification(`${pelaaja.name} ylitti 50 pistettä – palautetaan 25:een.`);
    }
  }

  renderPlayers();
  if (checkTeamVictory(pelaaja.team)) return;

  seuraavaVuoro();
}

function checkTeamVictory(teamName) {
  const teamPlayers = teams[teamName];
  const yhteispisteet = teamPlayers.reduce((sum, p) => sum + p.score, 0);
  if (yhteispisteet === 50) {
    showNotification(`🎉 Joukkue ${teamName} voitti pelin yhteispisteillä 50!`);
    peliPaattynyt = true;
    return true;
  }
  return false;
}

function seuraavaVuoro() {
  vuoroIndex = (vuoroIndex + 1) % vuorojarjestys.length;
  paivitaVuoroNaytto();
}

function paivitaVuoroNaytto() {
  const vuorossa = vuorojarjestys[vuoroIndex];
  document.getElementById("vuoroNaytto").textContent = "Vuorossa: " + vuorossa.name;
  document.getElementById("vuorossaPisteet").textContent = vuorossa.score;
}

function renderPlayers() {
  const container = document.getElementById("playerCards");
  container.innerHTML = "";

  vuorojarjestys.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "player-card";
    card.dataset.name = player.name;
    card.style.backgroundColor = getColor(index);

    card.innerHTML = `
      <h3>${player.name}</h3>
      <p>${player.score}</p>
      <small>${player.team}</small>
    `;
    container.appendChild(card);
  });

  if (vuorojarjestys.length > 0) {
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
    if (card.dataset.name === vuorossa.name) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function showNotification(message, duration = 3000) {
  const note = document.getElementById("notification");
  if (!note) return;
  note.textContent = message;
  note.classList.add("visible");
  setTimeout(() => {
    note.classList.remove("visible");
  }, duration);
}

function resetGame() {
  players = [];
  teams = {};
  vuorojarjestys = [];
  vuoroIndex = 0;
  peliPaattynyt = false;
  document.getElementById("playerCards").innerHTML = "";
  document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
  document.getElementById("vuorossaPisteet").textContent = "0";
  document.getElementById("vuorossaInput").value = "";
  showNotification("Peli on nollattu.");
}

document.addEventListener("DOMContentLoaded", () => {
  const nappi = document.getElementById("vuorossaNappi");
  if (nappi) {
    nappi.addEventListener("click", lisaaPisteetVuorossa);
  }
});
