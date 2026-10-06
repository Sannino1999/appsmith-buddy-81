let registrationPromise: Promise<ServiceWorkerRegistration | undefined> | undefined;

export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => {
        console.error("PWA service worker registration failed", error);
        return undefined;
      });
  }
}
