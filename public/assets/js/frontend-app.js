/**
 * @file Lightweight bootstrap for the modular MedExplain AI frontend.
 * @module assets/js/frontend-app
 */

// -----------------------------------------------------------------------------
// Frontend Bootstrap
// -----------------------------------------------------------------------------

const frontendModules = [
  "/assets/js/api/client.js",
  "/assets/js/router/routes.js",
  "/assets/js/router/router.js",
  "/assets/js/state/appState.js",
  "/assets/js/utils/dom.js",
  "/assets/js/components/shell.js",
  "/assets/js/components/forms.js",
  "/assets/js/services/cache.js",
  "/assets/js/pages/recovery.js",
  "/assets/js/pages/home.js",
  "/assets/js/pages/reports.js",
  "/assets/js/pages/doctors.js",
  "/assets/js/pages/legal.js",
  "/assets/js/pages/subscription.js",
  "/assets/js/pages/workspaces.js"
];

/**
 * Loads a classic script in order so legacy global functions keep their existing behavior.
 * @param {string} src Asset URL for the module script.
 * @returns {Promise<void>} Resolves when the script has loaded.
 */
function loadFrontendModule(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.defer = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load frontend module: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Bootstraps MedExplain AI after every frontend module is available.
 * @returns {Promise<void>} Resolves after the first route render completes.
 */
async function bootstrapFrontend() {
  for (const modulePath of frontendModules) {
    await loadFrontendModule(modulePath);
  }
  startFrontendApp();
}

bootstrapFrontend().catch((error) => {
  console.error(error);
  document.body.innerHTML = '<main class="page-main"><section class="error-state"><div class="state-content"><h1>MedExplain AI could not start.</h1><p class="muted">Please refresh the page. If this continues, contact support.</p></div></section></main>';
});
