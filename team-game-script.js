
const players = [];
const teams = {};
let currentPlayerIndex = 0;

function addPlayer() {
    const nameInput = document.getElementById("playerName");
    const teamInput = document.getElementById("teamName");
    const name = nameInput.value.trim();
    const team = teamInput.value.trim();

    if (!name || !team) {
        alert("Syötä sekä pelaajan nimi että joukkueen nimi.");
        return;
    }

    const player = {
        name,
        team,
        points: 0,
        misses: 0
    };

    players.push(player);

    if (!teams[team]) {
        teams[team] = {
            name: team,
            players: [],
            container: createTeamCard(team)
        };
    }

    teams[team].players.push(player);
    renderPlayer(player, teams[team].container);

    nameInput.value = "";
    teamInput.value = "";

    if (players.length === 1) {
        setCurrentPlayer(players[0]);
    }
}

function createTeamCard(teamName) {
    const container = document.getElementById("teamCards");

    const card = document.createElement("div");
    card.className = "team-card";
    card.dataset.team = teamName;

    const header = document.createElement("h2");
    header.textContent = teamName + " (0 pistettä)";
    card.appendChild(header);

    const playerList = document.createElement("div");
    playerList.className = "team-player-list";
    card.appendChild(playerList);

    container.appendChild(card);
    return card;
}

function renderPlayer(player, teamCard) {
    const playerList = teamCard.querySelector(".team-player-list");

    const el = document.createElement("div");
    el.className = "team-player";
    el.dataset.name = player.name;

    const name = document.createElement("span");
    name.textContent = player.name;

    const info = document.createElement("span");
    info.textContent = "0 pistettä, 0 hutia";

    el.appendChild(name);
    el.appendChild(info);
    playerList.appendChild(el);
}

function setCurrentPlayer(player) {
    document.getElementById("vuoroNaytto").textContent = "Vuorossa: " + player.name;
    document.getElementById("vuorossaPisteet").textContent = player.points;
    document.getElementById("vuorossaInput").dataset.name = player.name;
}

function nextPlayer() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayer(players[currentPlayerIndex]);
}

function resetGame() {
    players.length = 0;
    Object.keys(teams).forEach(t => delete teams[t]);
    document.getElementById("teamCards").innerHTML = "";
    document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
    document.getElementById("vuorossaPisteet").textContent = "0";
    document.getElementById("vuorossaInput").value = "";
    document.getElementById("vuorossaInput").dataset.name = "";
    currentPlayerIndex = 0;
}

document.getElementById("vuorossaNappi").addEventListener("click", () => {
    const input = document.getElementById("vuorossaInput");
    const value = parseInt(input.value);
    const name = input.dataset.name;
    input.value = "";

    if (!name || isNaN(value) || value < 0 || value > 12) return;

    const player = players.find(p => p.name === name);
    if (!player) return;

    if (value === 0) {
        player.misses++;
    } else {
        player.points += value;
        player.misses = 0;
        if (player.points > 50) {
            player.points = 25;
        }
    }

    const team = teams[player.team];
    updatePlayerUI(player, team.container);
    updateTeamHeader(team);

    if (checkVictory(team)) return;

    nextPlayer();
});

function updatePlayerUI(player, teamCard) {
    const el = teamCard.querySelector(`.team-player[data-name="${player.name}"] span:last-child`);
    if (el) {
        el.textContent = `${player.points} pistettä, ${player.misses} hutia`;
    }
}

function updateTeamHeader(team) {
    const total = team.players.reduce((sum, p) => sum + p.points, 0);
    const h2 = team.container.querySelector("h2");
    if (h2) {
        h2.textContent = team.name + " (" + total + " pistettä)";
    }
}

function checkVictory(team) {
    const total = team.players.reduce((sum, p) => sum + p.points, 0);
    if (total === 50) {
        alert("Joukkue " + team.name + " voitti pelin!");
        return true;
    }
    return false;
}
