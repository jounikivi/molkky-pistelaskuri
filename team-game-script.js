let players = [];
let vuoroIndex = 0;
let peliPaattynyt = false;

function addPlayer() {
  const nameInput = document.getElementById("playerName");
  const teamInput = document.getElementById("teamName");
  const name = nameInput.value.trim();
  const team = teamInput.value.trim();
  if (!name || !team) return;

  players.push({ name: name, team: team, score: 0, misses: 0 });
  nameInput.value = "";
  teamInput.value = "";

  vuorojarjestys = [...players];
  renderPlayers();
  paivitaVuoroNaytto();
}

function arvoAloittaja() {
  if (players.length < 2) {
    showNotification("Lisää vähintään kaksi pelaajaa.");
    return;
  }

  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }

  vuoroIndex = 0;
  renderPlayers();
  paivitaVuoroNaytto();
}

function lisaaPisteet() {
  const input = document.getElementById("vuorossaInput");
  const pisteetStr = input.value.trim();
  input.value = "";

  if (!/^([0-9]|1[0-2])$/.test(pisteetStr)) {
    showNotification("Syötä pisteet väliltä 0–12.");
    return;
  }

  const pisteet = parseInt(pisteetStr);
  const pelaaja = players[vuoroIndex];

  if (pisteet === 0) {
    pelaaja.misses += 1;

    if (pelaaja.misses >= 3) {
      const poista = confirm(`${pelaaja.name} (${pelaaja.team}) on heittänyt 3 kertaa peräkkäin ohi. Poistetaanko pelaaja pelistä?`);
      if (poista) {
        players.splice(vuoroIndex, 1);
        if (vuoroIndex >= players.length) vuoroIndex = 0;
        renderPlayers();
        paivitaVuoroNaytto();
        return;
      } else {
        pelaaja.misses = 0;
        showNotification(`${pelaaja.name} jatkaa peliä.`);
      }
    } else {
      showNotification(`${pelaaja.name} heitti ohi (${pelaaja.misses}/3)`);
    }

  } else {
    pelaaja.score += pisteet;
    pelaaja.misses = 0;

    if (pelaaja.score > 50) {
      pelaaja.score = 25;
      showNotification(`${pelaaja.name} ylitti 50 pistettä – palautus 25 pisteeseen.`);
    } else if (pelaaja.score === 50) {
      showNotification(`${pelaaja.name} voitti pelin! 🎉`);
      peliPaattynyt = true;
      return;
    }
  }

  vuoroIndex = (vuoroIndex + 1) % players.length;
  renderPlayers();
  paivitaVuoroNaytto();
}

function paivitaVuoroNaytto() {
  const vuorossa = players[vuoroIndex];
  document.getElementById("vuoroNaytto").textContent = `Vuorossa: ${vuorossa.name} (${vuorossa.team})`;
  document.getElementById("vuorossaPisteet").textContent = vuorossa.score;
}

function renderPlayers() {
  const container = document.getElementById("playerCards");
  container.innerHTML = "";

  players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "player-card";
    if (index === vuoroIndex) card.classList.add("vuorossa");

    card.innerHTML = `
      <h3>${player.name}</h3>
      <p>${player.score}p</p>
      <small>${player.team}</small>
    `;
    container.appendChild(card);
  });
}

function resetGame() {
  players = [];
  vuoroIndex = 0;
  peliPaattynyt = false;
  document.getElementById("playerCards").innerHTML = "";
  document.getElementById("vuoroNaytto").textContent = "Vuorossa: -";
  document.getElementById("vuorossaPisteet").textContent = "0";
  document.getElementById("vuorossaInput").value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("vuorossaNappi").addEventListener("click", lisaaPisteet);
});

function showNotification(message, duration = 3000) {
  const note = document.getElementById("notification");
  if (!note) return;
  note.textContent = message;
  note.classList.add("visible");
  setTimeout(() => {
    note.classList.remove("visible");
  }, duration);
}