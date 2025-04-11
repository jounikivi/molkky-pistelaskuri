
const players = [];
const teams = {};
let turnOrder = [];
let currentIndex = 0;

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
        teams[team] = {
            name: team,
            players: [],
            card: createTeamCard(team)
        };
    }

    teams[team].players.push(player);
    renderPlayer(player, teams[team].card);

    document.getElementById("playerName").value = "";
    document.getElementById("teamName").value = "";
}

function createTeamCard(teamName) {
    const container = document.getElementById("playerCards");

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

    const name = document.createElement("strong");
    name.textContent = player.name;

    const info = document.createElement("span");
    info.textContent = "0 pistettä, 0 hutia";

    const button = document.createElement("button");
    button.textContent = "+ Pisteet";
    button.onclick = () => addPoints(player.name);

    el.appendChild(name);
    el.appendChild(document.createElement("br"));
    el.appendChild(info);
    el.appendChild(document.createElement("br"));
    el.appendChild(button);

    playerList.appendChild(el);
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
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
    const el = teamCard.querySelector(`.team-player[data-name="${player.name}"] span`);
    if (el) {
        el.textContent = `${player.points} pistettä, ${player.misses} hutia`;
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
    Object.keys(teams).forEach(t => delete teams[t]);
    turnOrder = [];
    currentIndex = 0;
    document.getElementById("playerCards").innerHTML = "";
    document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
    document.getElementById("vuorossaPisteet").textContent = "0";
    document.getElementById("vuorossaInput").value = "";
}
