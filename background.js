// background.js
// This is the service worker for the HeyHo Extension.
// It uses the browser.* namespace for cross-browser compatibility via the polyfill.

// Developer mode flag for logging
// In production builds, this would be set via build process or manifest
const IS_DEV_MODE = !('update_url' in chrome.runtime.getManifest());

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

// Set up daily cleanup alarm
async function setupCleanupAlarm() {
  try {
    // Create daily cleanup alarm that starts 24 hours after extension load
    // and repeats every 24 hours
    await browser.alarms.create('daily-cleanup', {
      delayInMinutes: 24 * 60,      // Start after 24 hours
      periodInMinutes: 24 * 60      // Repeat every 24 hours
    });
    
    if (IS_DEV_MODE) {
      console.log('Daily cleanup alarm created successfully');
    }
  } catch (error) {
    console.error('Failed to create cleanup alarm:', error);
  }
}

// Run initialization
initializeStorage();
setupCleanupAlarm();

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

/**
 * Performs cleanup of expired events from IndexedDB
 * Removes events older than 7 days (168 hours)
 */
async function performCleanup() {
  const startTime = Date.now();
  
  try {
    const { getExpiredEvents, deleteEvents } = self.StorageModule;
    
    if (IS_DEV_MODE) {
      console.log('🧹 Starting daily cleanup process...');
    }
    
    // Get expired events (older than 7 days)
    const expiredEventIds = await getExpiredEvents(168);
    
    if (expiredEventIds.length === 0) {
      if (IS_DEV_MODE) {
        console.log('✅ Cleanup complete: No expired events found');
      }
      return;
    }
    
    if (IS_DEV_MODE) {
      console.log(`📊 Found ${expiredEventIds.length} expired events to delete`);
    }
    
    // Delete expired events
    const deletedCount = await deleteEvents(expiredEventIds);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (IS_DEV_MODE) {
      console.log('✅ Cleanup complete:', {
        eventsScanned: expiredEventIds.length,
        eventsDeleted: deletedCount,
        durationMs: duration,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup process failed:', error);
    
    if (IS_DEV_MODE) {
      console.error('Cleanup error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Enhanced alarm listener with cleanup handling
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (IS_DEV_MODE) {
    console.log('⏰ Alarm fired:', alarm.name);
  }
  
  if (alarm.name === 'daily-cleanup') {
    await performCleanup();
  } else {
    if (IS_DEV_MODE) {
      console.log('Unknown alarm fired:', alarm);
    }
  }
});