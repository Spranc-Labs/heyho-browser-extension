/**
 * Triage Module for HeyHo Extension
 *
 * Pre-storage filter to ensure only valuable and meaningful events are saved.
 * Reduces noise, improves performance, and enforces cost-control mindset.
 *
 * Uses shared INVALID_URL_PREFIXES from constants.js for consistent filtering
 * across modules (sync-manager.js also uses the same list).
 */

/**
 * Determines whether an event should be stored based on triage rules
 * @param {Object} eventObject - CoreEvent object from events.js
 * @param {string} eventObject.url - Event URL
 * @param {string} eventObject.domain - Extracted domain
 * @param {string} eventObject.type - Event type (CREATE, ACTIVATE, etc.)
 * @returns {boolean} - true if event should be stored, false if it should be discarded
 */
function shouldStoreEvent(eventObject) {
  // Get shared invalid URL prefixes from constants module
  const { INVALID_URL_PREFIXES } = self.Constants || { INVALID_URL_PREFIXES: [] };

  const url = eventObject.url || '';
  const domain = eventObject.domain || '';

  // Rule 1: Filter invalid URLs (extension pages, internal browser pages)
  // Check if URL matches any invalid patterns
  for (const prefix of INVALID_URL_PREFIXES) {
    if (url.startsWith(prefix)) {
      return false;
    }
  }

  // Rule 1a: Special case for 'newtab' domain
  // Some newtab pages may not have standard URL patterns
  if (domain && domain.includes('newtab')) {
    return false;
  }

  // Rule 2: Filter Events Without a URL/Domain
  // Exception: CLOSE and HEARTBEAT events are always considered valuable
  if (eventObject.type !== 'CLOSE' && eventObject.type !== 'HEARTBEAT') {
    if (!domain || domain === '' || domain === null || domain === undefined) {
      return false;
    }
  }

  // If no rules matched, the event is valuable and should be stored
  return true;
}

// Export for browser environment
if (typeof self !== 'undefined') {
  self.TriageModule = {
    shouldStoreEvent,
  };
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    shouldStoreEvent,
  };
}
