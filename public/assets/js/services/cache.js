/**
 * @file Frontend cache and route refresh service.
 * @module assets/js/services/cache.js
 */

// -----------------------------------------------------------------------------
// Frontend cache and route refresh service.
// -----------------------------------------------------------------------------

function invalidateCache(...keys) {
  keys.forEach((key) => state.dataCache.delete(key));
}

function rerenderCurrentRoute() {
  state.dataCache.clear();
  return route();
}

async function cachedRequest(key, path) {
  if (!state.dataCache.has(key)) {
    state.dataCache.set(key, apiRequest(path));
  }
  return state.dataCache.get(key);
}

