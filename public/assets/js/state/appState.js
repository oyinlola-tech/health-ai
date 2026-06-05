/**
 * @file Shared frontend state.
 * @module assets/js/state/appState.js
 */

// -----------------------------------------------------------------------------
// Shared frontend state.
// -----------------------------------------------------------------------------

const state = {
  path: normalizePath(location.pathname),
  dataCache: new Map()
};

