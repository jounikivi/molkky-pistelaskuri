let players = [];
let vuorojarjestys = [];
let currentTurn = null;

function addPlayer() {
  const name = document.getElementById("playerName").value.trim();
  const team = document.getElementById("teamName").value.trim();
  if (!name || !team) return;

  players.push({ name, team, score: 0, misses: 0 });
  vuorojarjestys = [...players];
  renderTeams();
  paivitaVuoroNaytto();
  document.getElementById("playerName").value = "";
  document.getElementById("teamName").value = "";
}

function arvoAloittaja() {
  if (vuorojarjestys.length === 0) return;
  const index = Math.floor(Math.random() * vuorojarjestys.length);
  currentTurn = vuorojarjestys[index];
  showNotification(`Aloittaja arvottu: ${currentTurn.name}`);
  paivitaVuoroNaytto();
  renderTeams();
}

function resetGame() {
  players = [];
  vuorojarjestys = [];
  currentTurn = null;
  document.getElementById("playerCards").innerHTML = "";
  document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
  document.getElementById("vuorossaPisteet").textContent = "0";
  document.getElementById("vuorossaInput").value = "";
}

function paivitaVuoroNaytto() {
  if (!currentTurn) return;
  document.getElementById("vuoroNaytto").textContent = `Vuorossa: ${currentTurn.name} (${currentTurn.team})`;
  document.getElementById("vuorossaPisteet").textContent = currentTurn.score;
}

document.getElementById("vuorossaNappi").addEventListener("click", () => {
  const input = document.getElementById("vuorossaInput").value.trim();
  if (!currentTurn) return;

  let piste = parseInt(input);
  if (isNaN(piste) || piste < 0 || piste > 12) {
    showNotification("Syötä pisteet välillä 0–12");
    return;
  }

  if (piste === 0) {
    currentTurn.misses = (currentTurn.misses || 0) + 1;
    if (currentTurn.misses >= 3) {
      const jatka = confirm(`${currentTurn.name} heitti ohi 3 kertaa. Poistetaanko pelistä?`);
      if (!jatka) {
        currentTurn.misses = 0;
      } else {
        players = players.filter(p => p !== currentTurn);
        vuorojarjestys = players;
      }
    } else {
      showNotification(`${currentTurn.name} heitti ohi (${currentTurn.misses}/3)`);
    }
  } else {
    currentTurn.score += piste;
    currentTurn.misses = 0;

    const currentTeam = players.filter(p => p.team === currentTurn.team);
    const teamScore = currentTeam.reduce((sum, p) => sum + p.score, 0);

    if (teamScore > 50) {
      currentTeam.forEach(p => p.score = 0);
      currentTeam[0].score = 25;
      showNotification(`${currentTurn.team} ylitti 50 pistettä – palautus 25 pisteeseen.`);
    } else if (teamScore === 50) {
      showNotification(`${currentTurn.team} voitti pelin! 🎉`);
      return;
    }
  }

  vuorojarjestys.push(vuorojarjestys.shift());
  currentTurn = vuorojarjestys[0];
  paivitaVuoroNaytto();
  renderTeams();
  document.getElementById("vuorossaInput").value = "";
});

function renderTeams() {
  const container = document.getElementById("playerCards");
  container.innerHTML = "";

  const teams = {};

  players.forEach(player => {
    if (!teams[player.team]) {
      teams[player.team] = {
        name: player.team,
        players: [],
        totalScore: 0
      };
    }
    teams[player.team].players.push(player);
    teams[player.team].totalScore += player.score;
  });

  Object.values(teams).forEach(team => {
    const card = document.createElement("div");
    card.className = "joukkuekortti";
    card.style.backgroundColor = getTeamColor(team.name); // 💡 tärkeä värihaku

    card.innerHTML = `
      <h3>${team.name}</h3>
      <div class="joukkue-pisteet">${team.totalScore} pistettä</div>
      <div class="pelaajalista">
        ${team.players.map(p => `
          <div class="pelaaja-item"${p === currentTurn ? ' style="font-weight:bold;"' : ''}>
            ${p.name} (${p.score})
          </div>
        `).join("")}
      </div>
    `;

    container.appendChild(card);
  });
}

function getTeamColor(teamName) {
  const colors = ["#00695c", "#1976d2", "#f57c00", "#7b1fa2", "#c2185b"];
  const hash = [...teamName].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function showNotification(message) {
  const notif = document.getElementById("notification");
  notif.textContent = message;
  notif.classList.remove("hidden");
  notif.classList.add("visible");

  setTimeout(() => {
    notif.classList.remove("visible");
    notif.classList.add("hidden");
  }, 3000);
}