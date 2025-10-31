// js/sw-register.js — rekisteröi service worker ja hoida päivitys
const SW_PATH = "/service-worker.js"; // muuta jos hostaat alihakemistoon

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });

    // Päivitysten valvonta
    if (reg.waiting) {
      // Uusi SW on valmiina aktivoitavaksi — voit halutessasi näyttää "Päivitä" tostin
      reg.waiting.postMessage("SKIP_WAITING");
    }

    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          // Uusi versio asentui taustalla → päivitetään sivu jotta uudet tiedostot tulevat käyttöön
          // Voit vaihtaa tämän UI:ksi jos haluat kysyä käyttäjältä
          location.reload();
        }
      });
    });

    // Kun uusi SW on aktivoitu, ohjaa liikenne sille
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  } catch (err) {
    // Ei kriittinen
    console.debug("SW register failed", err);
  }
}

registerSW();
