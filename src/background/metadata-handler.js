/**
 * Metadata Handler Module
 *
 * Handles page metadata from content scripts and caches it for categorization.
 */

const MetadataHandler = (function () {
  'use strict';

  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };

  // Cache metadata for tabs (keyed by tabId)
  const metadataCache = new Map();

  // Cache cleanup interval (5 minutes)
  const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000;
  const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize metadata handler
   */
  function init() {
    if (IS_DEV_MODE) {
      console.log('[HeyHo] Initializing Metadata Handler...');
    }

    // Set up periodic cache cleanup
    setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);

    if (IS_DEV_MODE) {
      console.log('[HeyHo] Metadata Handler initialized');
    }
  }

  /**
   * Handle page metadata from content script
   * @param {Object} data - Metadata payload
   * @param {Object} tab - Browser tab object
   */
  function handlePageMetadata(data, tab) {
    if (!tab || !tab.id) {
      if (IS_DEV_MODE) {
        console.warn('[HeyHo] Received metadata without valid tab');
      }
      return;
    }

    // Store metadata with timestamp
    metadataCache.set(tab.id, {
      url: data.url,
      title: data.title,
      metadata: data.metadata,
      timestamp: Date.now(),
    });

    if (IS_DEV_MODE) {
      console.log(`[HeyHo] Cached metadata for tab ${tab.id}:`, {
        url: data.url,
        title: data.title,
        schemaType: data.metadata?.schemaType,
        ogType: data.metadata?.ogType,
        category: data.metadata?.category,
      });
    }
  }

  /**
   * Get cached metadata for a tab
   * @param {number} tabId - Tab ID
   * @returns {Object} Metadata object or empty object
   */
  function getMetadata(tabId) {
    const cached = metadataCache.get(tabId);

    if (!cached) {
      return {};
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > MAX_CACHE_AGE) {
      metadataCache.delete(tabId);
      return {};
    }

    return cached.metadata || {};
  }

  /**
   * Get cached title for a tab
   * @param {number} tabId - Tab ID
   * @returns {string} Page title or empty string
   */
  function getTitle(tabId) {
    const cached = metadataCache.get(tabId);
    return cached?.title || '';
  }

  /**
   * Clear metadata for a specific tab
   * @param {number} tabId - Tab ID
   */
  function clearMetadata(tabId) {
    metadataCache.delete(tabId);
  }

  /**
   * Clean up old cache entries
   */
  function cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [tabId, cached] of metadataCache.entries()) {
      if (now - cached.timestamp > MAX_CACHE_AGE) {
        metadataCache.delete(tabId);
        cleaned++;
      }
    }

    if (IS_DEV_MODE && cleaned > 0) {
      console.log(`[HeyHo] Cleaned up ${cleaned} old metadata cache entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  function getStats() {
    return {
      totalCached: metadataCache.size,
      tabIds: Array.from(metadataCache.keys()),
    };
  }

  // Public API
  return {
    init,
    handlePageMetadata,
    getMetadata,
    getTitle,
    clearMetadata,
    getStats,
  };
})();

// Export for browser environment
self.MetadataHandler = MetadataHandler;
