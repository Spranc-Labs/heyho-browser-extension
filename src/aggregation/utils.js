/**
 * Utility functions for the aggregation system
 */

const UrlUtils = {
  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      // Remove 'www.' prefix if present
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      console.warn('Invalid URL:', url);
      return 'unknown';
    }
  },

  /**
   * Check if URL is valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if URL should be tracked
   */
  shouldTrackUrl(url) {
    if (!url || !this.isValidUrl(url)) {
      return false;
    }
    
    // Skip chrome:// and extension:// URLs
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('file://')) {
      return false;
    }
    
    return true;
  },

  /**
   * Normalize URL for comparison
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove hash and trailing slash
      urlObj.hash = '';
      let normalized = urlObj.toString();
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    } catch {
      return url;
    }
  }
};

// Export for browser environment
self.UrlUtils = UrlUtils;