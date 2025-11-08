/**
 * Metadata Handler Module
 *
 * Handles page metadata from content scripts and caches it for categorization.
 */

const MetadataHandler = (function () {
  'use strict';

  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };

  // Cache metadata by URL (not tabId) to avoid race conditions with SPA navigation
  const metadataCache = new Map();

  // Cache cleanup interval (1 hour)
  const CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000;
  const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

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
    if (!tab || !tab.id || !data.url) {
      if (IS_DEV_MODE) {
        console.warn('[HeyHo] Received metadata without valid tab or URL');
      }
      return;
    }

    // Store metadata by URL (not tabId) to avoid race conditions
    metadataCache.set(data.url, {
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
   * Get cached metadata for a URL
   * @param {string} url - Page URL
   * @returns {Object} Metadata object or empty object
   */
  function getMetadata(url) {
    const cached = metadataCache.get(url);

    if (!cached) {
      return {};
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > MAX_CACHE_AGE) {
      metadataCache.delete(url);
      return {};
    }

    return cached.metadata || {};
  }

  /**
   * Get cached title for a URL
   * @param {string} url - Page URL
   * @returns {string} Page title or empty string
   */
  function getTitle(url) {
    const cached = metadataCache.get(url);
    return cached?.title || '';
  }

  /**
   * Clear metadata for a specific URL
   * @param {string} url - Page URL
   */
  function clearMetadata(url) {
    metadataCache.delete(url);
  }

  /**
   * Clean up old cache entries
   */
  function cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [url, cached] of metadataCache.entries()) {
      if (now - cached.timestamp > MAX_CACHE_AGE) {
        metadataCache.delete(url);
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
      urls: Array.from(metadataCache.keys()),
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
