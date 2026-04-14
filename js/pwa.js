const supportsServiceWorker = "serviceWorker" in navigator;
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const canRegisterServiceWorker = supportsServiceWorker && (window.location.protocol === "https:" || isLocalhost);

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
