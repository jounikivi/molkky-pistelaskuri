console.log("✅ Joukkuepeli ladattu");

let teams = [];
let players = [];
let currentPlayerIndex = 0;
let peliPaattynyt = false;

// Joukkueen lisääminen
function addTeam() {
  const input = document.getElementById("teamNameInput");
  const name = input.value.trim();
  if (!name) return;

  const newTeam = { name, members: [] };
  teams.push(newTeam);

  const playerName = prompt("Syötä pelaajan nimi:");
  if (playerName) {
    const player = {
      name: playerName,
      team: name,
      score: 0,
      misses: 0
    };
    players.push(player);
    newTeam.members.push(player);
  }

  input.value = "";
  renderPlayers();
  updateVuoro();
}

function startTeamGame() {
  if (players.length < 2) {
    showNotification("Tarvitset vähintään kaksi pelaajaa.");
    return;
  }

  shuffle(players);
  currentPlayerIndex = 0;
  peliPaattynyt = false;
  updateVuoro();
  renderPlayers();
  showNotification("Peli aloitettu!");
}

function lisaaPisteet() {
  if (peliPaattynyt || players.length === 0) return;

  const input = document.getElementById("pisteSyotto");
  const value = parseInt(input.value);

  if (isNaN(value) || value < 0 || value > 12) {
    showNotification("Syötä pisteet väliltä 0–12.");
    return;
  }

  const player = players[currentPlayerIndex];

  if (value === 0) {
    player.misses++;
    if (player.misses >= 3) {
      const poista = confirm(`${player.name} on heittänyt 3 ohi. Poistetaanko pelistä?`);
      if (poista) {
        players.splice(currentPlayerIndex, 1);
        showNotification(`${player.name} poistui pelistä.`);
        if (players.length === 0) {
          peliPaattynyt = true;
          showNotification("Ei pelaajia jäljellä.");
          return;
        }
        if (currentPlayerIndex >= players.length) currentPlayerIndex = 0;
      } else {
        player.misses = 0;
        showNotification(`${player.name} jatkaa peliä.`);
      }
    } else {
      showNotification(`${player.name} heitti ohi (${player.misses}/3)`);
    }
  } else {
    player.score += value;
    player.misses = 0;

    if (player.score > 50) {
      player.score = 25;
      showNotification(`${player.name} ylitti 50 pistettä – palautus 25 pisteeseen.`);
    } else if (player.score === 50) {
      showNotification(`${player.name} voitti pelin! 🎉`);
      peliPaattynyt = true;
      return;
    }
  }

  input.value = "";
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  updateVuoro();
  renderPlayers();
}

function updateVuoro() {
  const vuoroElem = document.getElementById("vuoroNaytto");
  const pisteElem = document.getElementById("vuoroPisteet");

  if (players.length === 0) {
    vuoroElem.textContent = "Vuorossa: -";
    pisteElem.textContent = "0";
    return;
  }

  const player = players[currentPlayerIndex];
  vuoroElem.textContent = `Vuorossa: ${player.name} (${player.team})`;
  pisteElem.textContent = player.score;
}

function renderPlayers() {
  const list = document.getElementById("teamList");
  if (!list) return;

  list.innerHTML = "";
  teams.forEach(team => {
    const container = document.createElement("div");
    container.className = "team-entry";
    const members = team.members.map(p =>
      `<li>${p.name} – ${p.score}p (${p.misses} hutia)</li>`).join("");
    container.innerHTML = `
      <h3>${team.name}</h3>
      <ul>${members}</ul>
    `;
    list.appendChild(container);
  });
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function showNotification(msg, duration = 3000) {
  const n = document.getElementById("notification");
  if (!n) return;
  n.textContent = msg;
  n.classList.add("visible");
  setTimeout(() => {
    n.classList.remove("visible");
  }, duration);
}