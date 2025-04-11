
const players = [];
const teams = {};
let turnOrder = [];
let currentIndex = 0;
let teamColorIndex = 1;

function addPlayer() {
    const name = document.getElementById("playerName").value.trim();
    const team = document.getElementById("teamName").value.trim();
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
        const colorClass = `team-color-${teamColorIndex}`;
        teamColorIndex = (teamColorIndex % 5) + 1;

        const teamCard = createTeamCard(team, colorClass);
        teams[team] = {
            name: team,
            players: [],
            card: teamCard,
            colorClass: colorClass
        };
    }

    teams[team].players.push(player);
    renderPlayer(player, teams[team].card);

    document.getElementById("playerName").value = "";
    document.getElementById("teamName").value = "";
}

function createTeamCard(teamName, colorClass) {
    const container = document.getElementById("playerCards");

    const card = document.createElement("div");
    card.className = `team-card ${colorClass}`;
    card.dataset.team = teamName;

    const header = document.createElement("h2");
    header.textContent = teamName + " (0 pistettä)";
    card.appendChild(header);

    const playerGrid = document.createElement("div");
    playerGrid.className = "pelaajakortit";
    card.appendChild(playerGrid);

    container.appendChild(card);
    return card;
}

function renderPlayer(player, teamCard) {
    const playerGrid = teamCard.querySelector(".pelaajakortit");

    const card = document.createElement("div");
    card.className = "player-card";
    card.dataset.name = player.name;

    const name = document.createElement("strong");
    name.textContent = player.name;

    const score = document.createElement("p");
    score.textContent = "0";

    card.appendChild(name);
    card.appendChild(score);
    playerGrid.appendChild(card);
}

function startGame() {
    if (players.length < 2) {
        alert("Lisää vähintään kaksi pelaajaa.");
        return;
    }

    turnOrder = generateFairTurnOrder(players);
    currentIndex = 0;
    setCurrentPlayer(turnOrder[0]);
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

function setCurrentPlayer(player) {
    document.getElementById("vuoroNaytto").textContent = "Vuorossa: " + player.name;
    document.getElementById("vuorossaPisteet").textContent = player.points;
    document.getElementById("vuorossaInput").dataset.name = player.name;
}

function addPoints(name) {
    const input = document.getElementById("vuorossaInput");
    const value = parseInt(input.value);
    const player = players.find(p => p.name === name);
    if (!player || isNaN(value) || value < 0 || value > 12) return;

    if (value === 0) {
        player.misses++;
    } else {
        player.points += value;
        player.misses = 0;
        if (player.points > 50) player.points = 25;
    }

    const team = teams[player.team];
    updatePlayerUI(player, team.card);
    updateTeamHeader(team);

    if (checkVictory(team)) return;

    input.value = "";
    currentIndex = (currentIndex + 1) % turnOrder.length;
    setCurrentPlayer(turnOrder[currentIndex]);
}

function updatePlayerUI(player, teamCard) {
    const el = teamCard.querySelector(`.player-card[data-name="\${player.name}"] p`);
    if (el) {
        el.textContent = player.points;
    }
}

function updateTeamHeader(team) {
    const total = team.players.reduce((sum, p) => sum + p.points, 0);
    const h2 = team.card.querySelector("h2");
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

function resetGame() {
    players.length = 0;
    for (let key in teams) delete teams[key];
    turnOrder = [];
    currentIndex = 0;
    teamColorIndex = 1;
    document.getElementById("playerCards").innerHTML = "";
    document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
    document.getElementById("vuorossaPisteet").textContent = "0";
    document.getElementById("vuorossaInput").value = "";
}

document.getElementById("vuorossaNappi").addEventListener("click", () => {
    const name = document.getElementById("vuorossaInput").dataset.name;
    if (name) addPoints(name);
});
