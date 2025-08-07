/**
 * Events Module for HeyHo Extension
 * 
 * Handles creation and saving of tracking events.
 */

/**
 * Helper function to extract domain from URL
 * Handles invalid URLs gracefully (e.g., about:blank, chrome://, etc.)
 * @param {string} url - The URL to extract domain from
 * @returns {string} - The domain or the original URL if extraction fails
 */
function getDomain(url) {
  try {
    if (!url) {return '';}
    
    // Handle special chrome URLs and about: URLs
    if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('moz-extension://') || url.startsWith('chrome-extension://')) {
      return url.split('/')[2] || url;
    }
    
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // Return a safe fallback for invalid URLs
    const { IS_DEV_MODE } = self.ConfigModule;
    if (IS_DEV_MODE) {
      console.warn('Failed to extract domain from URL:', url, error);
    }
    return url || '';
  }
}

/**
 * Creates a CoreEvent object with unique ID and current timestamp
 * @param {string} type - Event type (CREATE, ACTIVATE, NAVIGATE, CLOSE)
 * @param {number} tabId - Tab ID from browser
 * @param {string} url - Tab URL (optional for CLOSE events)
 * @returns {Object} - CoreEvent object
 */
function createCoreEvent(type, tabId, url = '') {
  const timestamp = Date.now();
  return {
    id: `evt_${timestamp}_${tabId}`,
    timestamp,
    type,
    tabId,
    url,
    domain: getDomain(url)
  };
}

/**
 * Logs CoreEvent to console and saves to IndexedDB
 * Also handles dev mode logging with buffer
 * @param {Object} eventObject - CoreEvent to log and save
 */
async function logAndSaveEvent(eventObject) {
  const { IS_DEV_MODE, devLogBuffer } = self.ConfigModule;
  
  // Dev mode logging
  if (IS_DEV_MODE) {
    console.log(`CoreEvent ${eventObject.type}:`, eventObject);
    
    // Add to dev buffer and log table for first 10 events
    devLogBuffer.push(eventObject);
    if (devLogBuffer.length <= 10) {
      console.table(devLogBuffer);
    }
  }
  
  // Save to IndexedDB
  try {
    const { addEvent } = self.StorageModule;
    await addEvent(eventObject);
  } catch (error) {
    console.error('Failed to save CoreEvent to IndexedDB:', error);
  }
}

// Export for browser environment
self.EventsModule = {
  createCoreEvent,
  logAndSaveEvent
};