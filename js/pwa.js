const supportsServiceWorker = "serviceWorker" in navigator;
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const canRegisterServiceWorker = supportsServiceWorker && (window.location.protocol === "https:" || isLocalhost);
const installButton = document.getElementById("installAppButton");
const installStatus = document.getElementById("installAppStatus");
let deferredInstallPrompt = null;

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallUi(message) {
  if (!installButton || !installStatus) return;

  if (isStandaloneMode()) {
    installButton.hidden = true;
    installButton.disabled = true;
    installStatus.textContent = message || "Sovellus on jo asennettu tälle laitteelle.";
    return;
  }

  installButton.hidden = false;

  if (!canRegisterServiceWorker) {
    installButton.disabled = true;
    installStatus.textContent = "Asennus toimii vain localhost-, 127.0.0.1- tai https-osoitteesta.";
    return;
  }

  if (deferredInstallPrompt) {
    installButton.disabled = false;
    installStatus.textContent = message || "Voit lisätä sovelluksen aloitusnäyttöön tai avata sen omassa ikkunassaan.";
    return;
  }

  installButton.disabled = true;
  installStatus.textContent = message || "Asennuspainike aktivoituu, kun Brave tarjoaa sovelluksen asennusta. Jos nappi pysyy harmaana, lataa sivu kerran uudelleen.";
}

if (canRegisterServiceWorker) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      registration.update().catch(() => {});
    } catch (error) {
      console.warn("PWA-rekisterointi ei onnistunut.", error);
    }
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallUi();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallUi("Sovellus on nyt asennettu. Voit avata sen kuten muutkin laitteesi sovellukset.");
});

installButton?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    updateInstallUi();
    return;
  }

  installButton.disabled = true;
  await deferredInstallPrompt.prompt();

  try {
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;

    if (choice?.outcome === "accepted") {
      updateInstallUi("Asennus hyväksytty. Sovellus on nyt saatavilla omana appinaan.");
      return;
    }

    updateInstallUi("Asennus peruttiin. Voit yrittää uudelleen, kun selain tarjoaa asennusta uudestaan.");
  } catch (error) {
    console.warn("Sovelluksen asennus ei onnistunut.", error);
    updateInstallUi("Asennus ei onnistunut. Kokeile ladata sivu uudelleen ja yrita sitten uudestaan.");
  }
});

updateInstallUi();
