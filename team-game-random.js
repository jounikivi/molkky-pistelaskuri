
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
        teams[team] = [];
    }
    teams[team].push(player);

    const card = document.createElement("div");
    card.className = "player-card";
    card.dataset.name = name;
    card.innerHTML = `
        <strong>${name}</strong><br>
        <small>${team}</small><br>
        <p>0</p>
        <button onclick="addPoints('${name}')">+ Pisteet</button>
    `;
    document.getElementById("playerCards").appendChild(card);

    document.getElementById("playerName").value = "";
    document.getElementById("teamName").value = "";
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
    const value = parseInt(document.getElementById("vuorossaInput").value);
    const player = players.find(p => p.name === name);
    if (!player || isNaN(value) || value < 0 || value > 12) return;

    if (value === 0) {
        player.misses++;
    } else {
        player.points += value;
        player.misses = 0;
        if (player.points > 50) player.points = 25;
    }

    const teamPoints = teams[player.team].reduce((sum, p) => sum + p.points, 0);
    const el = document.querySelector(`.player-card[data-name="${player.name}"] p`);
    if (el) el.textContent = player.points;

    if (teamPoints === 50) {
        alert("Joukkue " + player.team + " voitti pelin!");
        return;
    }

    document.getElementById("vuorossaInput").value = "";
    currentIndex = (currentIndex + 1) % turnOrder.length;
    setCurrentPlayer(turnOrder[currentIndex]);
}

function resetGame() {
    players.length = 0;
    for (let t in teams) delete teams[t];
    turnOrder = [];
    currentIndex = 0;
    document.getElementById("playerCards").innerHTML = "";
    document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
    document.getElementById("vuorossaPisteet").textContent = "0";
    document.getElementById("vuorossaInput").value = "";
}
