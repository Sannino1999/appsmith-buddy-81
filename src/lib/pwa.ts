let registrationPromise: Promise<ServiceWorkerRegistration | undefined> | undefined;

export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!window.isSecureContext && window.location.hostname !== "localhost") return;

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        void registration.update();
        return registration;
      })
      .catch((error) => {
        console.error("PWA service worker registration failed", error);
        return undefined;
      });
  }

  return registrationPromise;
}
