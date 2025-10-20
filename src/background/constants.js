/**
 * Shared Constants for Browser Extension
 *
 * Centralized constants used across multiple modules
 */

/**
 * URL prefixes that should never be tracked or synced
 * These represent browser internal pages and extension pages
 */
const INVALID_URL_PREFIXES = [
  'moz-extension://',
  'chrome-extension://',
  'about:',
  'chrome://',
  'edge://',
  'view-source:',
];

// Export for browser environment
if (typeof self !== 'undefined') {
  self.Constants = {
    INVALID_URL_PREFIXES,
  };
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INVALID_URL_PREFIXES,
  };
}
