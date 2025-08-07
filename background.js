// background.js
// This is the service worker for the HeyHo Extension.
// It uses the browser.* namespace for cross-browser compatibility via the polyfill.

// Developer mode flag for logging
const IS_DEV_MODE = true;

// Development logging buffer for first 10 events
const devLogBuffer = [];

console.log('🚀 HeyHo background script loaded and ready to track events!');
console.log('📝 Dev mode is enabled - you will see event logs and tables');

// Storage module is imported via manifest scripts array

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

// Initialize storage when background script loads
async function initializeStorage() {
  try {
    const { initDB } = self.StorageModule;
    await initDB();
    if (IS_DEV_MODE) {
      console.log('IndexedDB initialized successfully');
    }
  } catch (error) {
    console.error('Storage initialization failed:', error);
  }
}

// Run storage initialization
initializeStorage();

// Tab Event Listeners

// 1. Tab Created - When a new tab is created
browser.tabs.onCreated.addListener((tab) => {
  const eventObject = createCoreEvent('CREATE', tab.id, tab.url);
  logAndSaveEvent(eventObject);
});

// 2. Tab Activated - When user switches focus to a different tab
browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // Get tab details to retrieve URL
    const tab = await browser.tabs.get(activeInfo.tabId);
    const eventObject = createCoreEvent('ACTIVATE', activeInfo.tabId, tab.url);
    logAndSaveEvent(eventObject);
  } catch (error) {
    // Handle case where tab might be closed before we can get its details
    if (IS_DEV_MODE) {
      console.warn('Failed to get tab details for ACTIVATE event:', error);
    }
    const eventObject = createCoreEvent('ACTIVATE', activeInfo.tabId, '');
    logAndSaveEvent(eventObject);
  }
});

// 3. Tab Updated - When tab properties change (filtered for URL changes only)
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Only log NAVIGATE events when URL actually changes
  if (changeInfo.url) {
    const eventObject = createCoreEvent('NAVIGATE', tabId, changeInfo.url);
    logAndSaveEvent(eventObject);
  }
});

// 4. Tab Removed - When a tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
  // URL information is not available for removed tabs, so we omit it
  const eventObject = createCoreEvent('CLOSE', tabId, '');
  logAndSaveEvent(eventObject);
});

// Keep the alarm listener for future functionality
browser.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm fired!', alarm);
});