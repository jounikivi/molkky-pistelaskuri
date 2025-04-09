console.log("✅ Ladataan oikea script.js!");

let players = [];
let vuoroIndex = 0;
let vuorojarjestys = [];
let peliPaattynyt = false;

function showNotification(message, duration = 3000) {
  const note = document.getElementById("notification");
  if (!note) return;
  note.textContent = message;
  note.classList.add("visible");
  setTimeout(() => {
    note.classList.remove("visible");
  }, duration);
}

// function addPlayer() {
//   const nameInput = document.getElementById("playerName");
//   const name = nameInput.value.trim();
//   if (!name) return;

//   players.push({ name: name, score: 0, misses: 0 });
//   nameInput.value = "";
//   renderPlayers();
// }
function addPlayer() {
  const nameInput = document.getElementById("playerName");
  const name = nameInput.value.trim();
  if (!name) return;

  players.push({ name: name, score: 0, misses: 0 });
  nameInput.value = "";

  // Päivitetään vuorojärjestys ja näkymä heti
  vuorojarjestys = [...players];
  renderPlayers();
  paivitaVuoroNaytto();
}


function arvoAloittaja() {
  if (players.length < 2) {
    showNotification("Lisää vähintään kaksi pelaajaa.");
    return;
  }

  vuorojarjestys = [...players];
  for (let i = vuorojarjestys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vuorojarjestys[i], vuorojarjestys[j]] = [vuorojarjestys[j], vuorojarjestys[i]];
  }

  vuoroIndex = 0;
  peliPaattynyt = false;
  renderPlayers();
  paivitaVuoroNaytto();
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
    pelaaja.misses += 1;

    if (pelaaja.misses >= 3) {
      const poista = confirm(`${pelaaja.name} on heittänyt 3 kertaa peräkkäin ohi. Poistetaanko pelaaja pelistä?`);
      if (poista) {
        vuorojarjestys.splice(vuoroIndex, 1);
        if (vuorojarjestys.length === 0) {
          showNotification("Ei enää pelaajia jäljellä.");
          resetGame();
          return;
        }
        if (vuoroIndex >= vuorojarjestys.length) vuoroIndex = 0;
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
      showNotification(`${pelaaja.name} ylitti 50 pistettä – palautetaan 25:een.`);
    } else if (pelaaja.score === 50) {
      showNotification(`${pelaaja.name} voitti pelin! 🎉`);
      peliPaattynyt = true;
      return;
    } else {
      // Pelaaja sai pisteitä, mutta ei näytetä siitä erillistä ilmoitusta
    }
  }

  seuraavaVuoro();
}

function seuraavaVuoro() {
  vuoroIndex = (vuoroIndex + 1) % vuorojarjestys.length;
  renderPlayers();
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
      <button disabled>+ Pisteet</button>
    `;
    container.appendChild(card);
  });

  if (vuorojarjestys.length > 0) {
    const vuorossa = vuorojarjestys[vuoroIndex];
    document.getElementById("vuorossaPisteet").textContent = vuorossa.score;
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

function resetGame() {
  players = [];
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