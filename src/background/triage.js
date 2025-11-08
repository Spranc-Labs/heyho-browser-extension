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
  // Rule 1: Filter Non-HTTP URLs
  // Only track http:// and https:// URLs to avoid backend validation errors
  // Exception: CLOSE events are always tracked (they don't require a URL)
  if (eventObject.type !== 'CLOSE' && eventObject.url) {
    const excludedPrefixes = [
      'chrome://',
      'about:',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'edge://',
      'view-source:',
      'file://',
      'data:',
      'blob:',
    ];

    const shouldTrack = !excludedPrefixes.some((prefix) => eventObject.url.startsWith(prefix));

    if (!shouldTrack) {
      return false;
    }
  }

  // Rule 2: Filter Uninteresting Domains (legacy check, redundant with Rule 1)
  const blockedDomains = [
    'newtab',
    'about:newtab',
    'about:blank',
    'chrome-extension',
    'moz-extension',
  ];

  const domain = eventObject.domain;

  // Check if domain matches any blocked patterns
  for (const blockedDomain of blockedDomains) {
    if (domain && domain.includes(blockedDomain)) {
      return false;
    }
  }

  // Rule 3: Filter Events Without a URL/Domain
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
