
console.log("✅ Ladataan team-script-structured.js!");

let players = [];
let teams = {};
let vuorojarjestys = [];
let vuoroIndex = 0;
let peliPaattynyt = false;
let teamColorIndex = 1;

function addTeam() {
  const teamInput = document.getElementById("newTeamName");
  const name = teamInput.value.trim();
  if (!name || teams[name]) return;

  const colorClass = "team-color-" + teamColorIndex;
  teamColorIndex = (teamColorIndex % 5) + 1;

  const card = createTeamCard(name, colorClass);
  teams[name] = {
    name: name,
    players: [],
    card: card,
    colorClass: colorClass
  };

  const select = document.getElementById("teamSelect");
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  select.appendChild(option);

  teamInput.value = "";
}

function createTeamCard(teamName, colorClass) {
  const container = document.getElementById("playerCards");
  const card = document.createElement("div");
  card.className = "team-card " + colorClass;
  card.dataset.team = teamName;

  const header = document.createElement("h2");
  header.textContent = teamName + " (0 pistettä)";
  card.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "player-grid";
  card.appendChild(grid);

  container.appendChild(card);
  return card;
}

function addPlayer() {
  const name = document.getElementById("playerName").value.trim();
  const team = document.getElementById("teamSelect").value;
  if (!name || !team || !teams[team]) return;

  const player = { name, team, score: 0, misses: 0 };
  players.push(player);
  teams[team].players.push(player);

  renderPlayer(player, teams[team].card);
  document.getElementById("playerName").value = "";
}

function renderPlayer(player, teamCard) {
  const grid = teamCard.querySelector(".player-grid");

  const card = document.createElement("div");
  card.className = "player-card";
  card.dataset.name = player.name;

  const name = document.createElement("strong");
  name.textContent = player.name;

  const score = document.createElement("p");
  score.textContent = "0";

  card.appendChild(name);
  card.appendChild(score);
  grid.appendChild(card);
}

function startGame() {
  if (players.length < 2) {
    showNotification("Lisää vähintään kaksi pelaajaa.");
    return;
  }

  vuorojarjestys = generateFairTurnOrder(players);
  vuoroIndex = 0;
  peliPaattynyt = false;
  paivitaVuoroNaytto();
}

function generateFairTurnOrder(list) {
  const shuffled = [...list];
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
      pelaaja.misses = 0;
      showNotification(`${pelaaja.name} on heittänyt 3 hutia. Hutit nollattu.`);
    } else {
      showNotification(`${pelaaja.name} heitti ohi (${pelaaja.misses}/3)`);
    }
  } else {
    pelaaja.score += pisteet;
    pelaaja.misses = 0;
    if (pelaaja.score > 50) {
      pelaaja.score = 25;
      showNotification(`${pelaaja.name} ylitti 50 pistettä – palautettiin 25:een.`);
    }
  }

  updatePlayerUI(pelaaja, teams[pelaaja.team].card);
  updateTeamHeader(pelaaja.team);

  if (checkVictory(pelaaja.team)) return;

  seuraavaVuoro();
}

function updatePlayerUI(player, teamCard) {
  const el = teamCard.querySelector(`.player-card[data-name="\${player.name}"] p`);
  if (el) el.textContent = player.score;
}

function updateTeamHeader(teamName) {
  const team = teams[teamName];
  const total = team.players.reduce((sum, p) => sum + p.score, 0);
  const h2 = team.card.querySelector("h2");
  if (h2) h2.textContent = team.name + " (" + total + " pistettä)";
}

function checkVictory(teamName) {
  const team = teams[teamName];
  const total = team.players.reduce((sum, p) => sum + p.score, 0);
  if (total === 50) {
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
  teamColorIndex = 1;
  document.getElementById("playerCards").innerHTML = "";
  document.getElementById("teamSelect").innerHTML = '<option value="">Valitse joukkue</option>';
  document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
  document.getElementById("vuorossaPisteet").textContent = "0";
  document.getElementById("vuorossaInput").value = "";
  showNotification("Peli on nollattu.");
}

document.getElementById("vuorossaNappi").addEventListener("click", () => {
  const name = document.getElementById("vuorossaInput").dataset.name;
  if (name) lisaaPisteetVuorossa();
});
