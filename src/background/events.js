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
    if (!url) {
      return '';
    }

    // Handle special chrome URLs and about: URLs
    if (
      url.startsWith('chrome://') ||
      url.startsWith('about:') ||
      url.startsWith('moz-extension://') ||
      url.startsWith('chrome-extension://')
    ) {
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
 * @param {string} type - Event type (CREATE, ACTIVATE, NAVIGATE, CLOSE, HEARTBEAT)
 * @param {number} tabId - Tab ID from browser
 * @param {string} url - Tab URL (optional for CLOSE and HEARTBEAT events)
 * @param {Object} options - Additional options
 * @param {Object} options.heartbeatData - Heartbeat-specific data
 * @param {Object} options.pageMetadata - Page metadata from MetadataHandler
 * @param {string} options.pageTitle - Page title
 * @returns {Promise<Object>} - CoreEvent object with anonymous client ID
 */
async function createCoreEvent(type, tabId, url = '', options = {}) {
  const timestamp = Date.now();
  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };

  // Get anonymous client ID if module is available
  let anonymousClientId = null;
  if (self.AnonymousIdModule && self.AnonymousIdModule.getOrCreateAnonymousId) {
    anonymousClientId = await self.AnonymousIdModule.getOrCreateAnonymousId();
  }

  const event = {
    id: `evt_${timestamp}_${tabId}`,
    timestamp,
    type,
    tabId,
    url,
    domain: getDomain(url),
  };

  // Add anonymous client ID if available
  if (anonymousClientId) {
    event.anonymousClientId = anonymousClientId;
  }

  // Add metadata for special event types like HEARTBEAT
  if (type === 'HEARTBEAT' && options.heartbeatData) {
    Object.assign(event, options.heartbeatData);
  }

  // CRITICAL: Store page metadata and title in the event
  // This ensures metadata is available when events are processed later
  // (even if the MetadataHandler cache expires)
  if (options.pageMetadata) {
    event.pageMetadata = options.pageMetadata;
  }

  if (options.pageTitle) {
    event.pageTitle = options.pageTitle;
  }

  // Log warning if metadata is missing for page events
  if (IS_DEV_MODE && ['CREATE', 'ACTIVATE', 'NAVIGATE'].includes(type)) {
    if (!options.pageMetadata || Object.keys(options.pageMetadata).length === 0) {
      console.warn(
        `⚠️ [Events] ${type} event for ${url} has no metadata. This will result in unclassified visit!`
      );
    }
  }

  return event;
}

/**
 * Logs CoreEvent to console and saves to IndexedDB
 * Also handles dev mode logging with buffer
 * @param {Object} eventObject - CoreEvent to log and save
 */
async function logAndSaveEvent(eventObject) {
  // Apply triage filtering - exit early if event should not be stored
  const { shouldStoreEvent } = self.TriageModule;
  if (!shouldStoreEvent(eventObject)) {
    return;
  }

  const { IS_DEV_MODE, devLogBuffer } = self.ConfigModule;

  // Dev mode logging
  if (IS_DEV_MODE) {
    console.log(`CoreEvent ${eventObject.type}:`, eventObject);

    // Add to dev buffer and log table for first 10 events
    devLogBuffer.push(eventObject);
    if (devLogBuffer.length <= 10) {
      // eslint-disable-next-line no-console
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
  logAndSaveEvent,
};
