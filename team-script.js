// Mölkky-joukkuetilan logiikka
const teamNameInput = document.getElementById("teamNameInput");
const addTeamBtn = document.getElementById("addTeamBtn");
const startGameBtn = document.getElementById("startGameBtn");
const resetGameBtn = document.getElementById("resetGameBtn");
const submitScoreBtn = document.getElementById("submitScoreBtn");
const scoreInput = document.getElementById("scoreInput");
const currentTurnDisplay = document.getElementById("currentTurn");
const teamsContainer = document.getElementById("teamsContainer");
const notification = document.getElementById("notification");

function showNotification(message) {
  notification.textContent = message;
  notification.classList.remove("hidden");
  setTimeout(() => notification.classList.add("hidden"), 3000);
}

let teams = [];
let turnOrder = [];
let turnIndex = 0;
let gameStarted = false;

addTeamBtn.onclick = () => {
  const name = teamNameInput.value.trim();
  if (!name) return showNotification("Anna joukkueen nimi.");
  const team = {
    name,
    players: [],
    score: 0,
    misses: {},
  };
  teams.push(team);
  teamNameInput.value = "";
  renderTeams();
};

function renderTeams() {
  teamsContainer.innerHTML = "";
  teams.forEach((team, index) => {
    const card = document.createElement("div");
    card.className = `team-card team-color-${index % 4}`;
    card.innerHTML = `
      <h3>${team.name} (Pisteet: ${team.score})</h3>
      <ul class="player-list">
        ${team.players.map(p => `<li>${p}</li>`).join("")}
      </ul>
      <label for="player-${index}">Pelaajan nimi</label>
      <input type="text" id="player-${index}" placeholder="Pelaajan nimi" />
      <button class="add-player-btn" onclick="addPlayer(${index})">Lisää pelaaja</button>
    `;
    teamsContainer.appendChild(card);
  });
}

window.addPlayer = (teamIndex) => {
  const input = document.getElementById(`player-${teamIndex}`);
  const name = input.value.trim();
  if (!name) return;
  teams[teamIndex].players.push(name);
  input.value = "";
  renderTeams();
};

startGameBtn.onclick = () => {
  if (teams.length < 2 || !teams.every(t => t.players.length > 0)) {
    showNotification("Tarvitset vähintään kaksi joukkuetta ja pelaajat jokaiseen.");
    return;
  }
  let allPlayers = [];
  teams.forEach((team, tIdx) => {
    team.players.forEach(player => {
      allPlayers.push({ teamIdx: tIdx, player });
    });
  });
  let valid = false;
  while (!valid) {
    turnOrder = [...allPlayers].sort(() => Math.random() - 0.5);
    valid = true;
    for (let i = 1; i < turnOrder.length; i++) {
      if (turnOrder[i].teamIdx === turnOrder[i - 1].teamIdx) {
        valid = false;
        break;
      }
    }
  }
  turnIndex = 0;
  gameStarted = true;
  updateCurrentTurn();
};

submitScoreBtn.onclick = () => {
  if (!gameStarted) return;
  const input = parseInt(scoreInput.value);
  if (isNaN(input) || input < 0 || input > 12) {
    showNotification("Syötä pisteet väliltä 0–12.");
    return;
  }
  const turn = turnOrder[turnIndex % turnOrder.length];
  const team = teams[turn.teamIdx];
  const player = turn.player;

  if (!team.misses[player]) team.misses[player] = 0;

  if (input === 0) {
    team.misses[player]++;
    if (team.misses[player] >= 3) {
      const drop = confirm(`${player} on heittänyt 3 hutia. Poistetaanko pelaaja pelistä?`);
      if (drop) {
        turnOrder = turnOrder.filter(p => !(p.player === player && p.teamIdx === turn.teamIdx));
        showNotification(`${player} poistui pelistä.`);
        if (turnOrder.length === 0) {
          showNotification("Kaikki pelaajat pudonneet. Peli päättyy.");
          gameStarted = false;
          return;
        }
      } else {
        team.misses[player] = 0;
        showNotification(`${player} jatkaa pelissä.`);
      }
    }
  } else {
    team.misses[player] = 0;
    team.score += input;
    if (team.score > 50) {
      team.score = 25;
      showNotification(`${team.name} ylitti 50 pistettä! Pisteet palautettiin 25:een.`);
    } else if (team.score === 50) {
      showNotification(`${team.name} voittaa pelin!`);
      gameStarted = false;
      return;
    }
  }

  turnIndex++;
  updateCurrentTurn();
  renderTeams();
  scoreInput.value = "";
};

resetGameBtn.onclick = () => {
  if (!confirm("Haluatko varmasti nollata pelin?")) return;
  teams = [];
  turnOrder = [];
  turnIndex = 0;
  gameStarted = false;
  teamsContainer.innerHTML = "";
  currentTurnDisplay.textContent = "-";
  scoreInput.value = "";
};

function updateCurrentTurn() {
  if (turnOrder.length > 0 && gameStarted) {
    const { player, teamIdx } = turnOrder[turnIndex % turnOrder.length];
    currentTurnDisplay.textContent = `${player} (${teams[teamIdx].name})`;
  } else {
    currentTurnDisplay.textContent = "-";
  }
}
