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
  // Rule 1: Filter Uninteresting Domains
  const blockedDomains = [
    'newtab',
    'about:newtab', 
    'about:blank',
    'chrome-extension',
    'moz-extension'
  ];
  
  const domain = eventObject.domain;
  
  // Check if domain matches any blocked patterns
  for (const blockedDomain of blockedDomains) {
    if (domain && domain.includes(blockedDomain)) {
      return false;
    }
  }
  
  // Rule 2: Filter Events Without a URL/Domain
  // Exception: CLOSE events are always considered valuable
  if (eventObject.type !== 'CLOSE') {
    if (!domain || domain === '' || domain === null || domain === undefined) {
      return false;
    }
  }
  
  // If no rules matched, the event is valuable and should be stored
  return true;
}

// Export for browser environment
self.TriageModule = {
  shouldStoreEvent
};