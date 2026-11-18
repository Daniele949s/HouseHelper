/**
 * HouseHelper Service Worker Registration
 */

export function register(config) {
  if (!('serviceWorker' in navigator)) return;

  // Never register SW in development (including localhost) so dev bundles are never cached stale.
  // Actively unregister any previously installed dev SW and purge stale shell caches.
  if (process.env.NODE_ENV !== 'production') {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      caches.keys()
        .then((names) =>
          Promise.all(
            names
              .filter((name) => name.startsWith('househelper-shell-'))
              .map((name) => caches.delete(name))
          )
        )
        .catch(() => {});
    }
    return;
  }

  const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        if (config && config.onSuccess) {
          config.onSuccess(registration);
        }
      })
      .catch((error) => {
        console.warn('Error during service worker registration:', error);
      });
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
