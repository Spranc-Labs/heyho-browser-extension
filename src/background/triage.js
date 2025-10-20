/**
 * Triage Module for HeyHo Extension
 *
 * Pre-storage filter to ensure only valuable and meaningful events are saved.
 * Reduces noise, improves performance, and enforces cost-control mindset.
 */

/**
 * Determines whether an event should be stored based on triage rules
 * @param {Object} eventObject - CoreEvent object from events.js
 * @returns {boolean} - true if event should be stored, false if it should be discarded
 */
function shouldStoreEvent(eventObject) {
  // Rule 1: Filter Uninteresting URLs
  const blockedUrlPatterns = [
    'about:newtab',
    'about:blank',
    'chrome-extension://',
    'moz-extension://',
    'chrome://',
    'edge://',
    'view-source:',
  ];

  const url = eventObject.url || '';
  const domain = eventObject.domain || '';

  // Check if URL matches any blocked patterns
  for (const pattern of blockedUrlPatterns) {
    if (url.startsWith(pattern)) {
      return false;
    }
  }

  // Check if domain is 'newtab' (special case)
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
