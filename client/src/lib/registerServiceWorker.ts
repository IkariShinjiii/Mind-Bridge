interface Env {
  production: boolean;
  navigator: Pick<Navigator, "webdriver"> & { serviceWorker?: Pick<ServiceWorkerContainer, "register"> };
  window: Pick<Window, "addEventListener">;
  document: Pick<Document, "readyState">;
}

/**
 * Registers the service worker (public/sw.js) that lets the app open when the connection is poor and be installed on a
 * phone. Production only, so development and the e2e tests never run behind a cache; automated browsers skip it too.
 * The app code is loaded after the page, so `load` may already have fired: register right away in that case.
 * The environment is a parameter only so the tests can run without a browser.
 */
export function registerServiceWorker(
  env: Env = { production: import.meta.env.PROD, navigator, window, document },
): void {
  const { serviceWorker } = env.navigator;
  if (!env.production || !serviceWorker || env.navigator.webdriver) return;
  const register = () => {
    serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("Service worker not registered", error);
    });
  };
  if (env.document.readyState === "complete") register();
  else env.window.addEventListener("load", register);
}
