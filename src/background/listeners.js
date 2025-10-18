/**
 * Listeners Module for HeyHo Extension
 * 
 * Houses all the browser tab event listeners.
 */

/**
 * Ensure heartbeat is running when service worker wakes
 */
function ensureHeartbeat() {
  if (self.HeartbeatModule && self.HeartbeatModule.ensureRunning) {
    self.HeartbeatModule.ensureRunning();
  }
}

/**
 * Setup message listener for content script messages
 */
function setupMessageListener() {
  const { IS_DEV_MODE } = self.ConfigModule;

  browser.runtime.onMessage.addListener((message, sender) => {
    // Handle page metadata from content scripts
    if (message.type === 'PAGE_METADATA_EXTRACTED') {
      if (self.MetadataHandler) {
        self.MetadataHandler.handlePageMetadata(message.data, sender.tab);
      }
    }

    // Return false to indicate we won't send a response asynchronously
    return false;
  });

  if (IS_DEV_MODE) {
    console.log('[HeyHo] Message listener set up');
  }
}

/**
 * Sets up all tab event listeners
 */
function setupTabListeners() {
  const { createCoreEvent, logAndSaveEvent } = self.EventsModule;
  const { IS_DEV_MODE } = self.ConfigModule;

  // 1. Tab Created - When a new tab is created
  browser.tabs.onCreated.addListener(async (tab) => {
    if (IS_DEV_MODE) {console.log('🔄 Service worker woke up: Tab created');}
    ensureHeartbeat();
    const eventObject = await createCoreEvent('CREATE', tab.id, tab.url);
    logAndSaveEvent(eventObject);
  });

  // 2. Tab Activated - When user switches focus to a different tab
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    if (IS_DEV_MODE) {console.log('🔄 Service worker woke up: Tab activated');}
    ensureHeartbeat();
    try {
      // Get tab details to retrieve URL
      const tab = await browser.tabs.get(activeInfo.tabId);
      const eventObject = await createCoreEvent('ACTIVATE', activeInfo.tabId, tab.url);
      logAndSaveEvent(eventObject);
    } catch (error) {
      // Handle case where tab might be closed before we can get its details
      if (IS_DEV_MODE) {
        console.warn('Failed to get tab details for ACTIVATE event:', error);
      }
      const eventObject = await createCoreEvent('ACTIVATE', activeInfo.tabId, '');
      logAndSaveEvent(eventObject);
    }
  });

  // 3. Tab Updated - When tab properties change (filtered for URL changes only)
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    // Only log NAVIGATE events when URL actually changes
    if (changeInfo.url) {
      if (IS_DEV_MODE) {console.log('🔄 Service worker woke up: Tab navigated');}
      ensureHeartbeat();
      const eventObject = await createCoreEvent('NAVIGATE', tabId, changeInfo.url);
      logAndSaveEvent(eventObject);
    }
  });

  // 4. Tab Removed - When a tab is closed
  browser.tabs.onRemoved.addListener(async (tabId) => {
    if (IS_DEV_MODE) {console.log('🔄 Service worker woke up: Tab closed');}
    ensureHeartbeat();
    // URL information is not available for removed tabs, so we omit it
    const eventObject = await createCoreEvent('CLOSE', tabId, '');
    logAndSaveEvent(eventObject);
  });

  // Additional listeners to ensure service worker wakes up on browser activity

  // 5. Window Focus - When user switches back to browser
  browser.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== browser.windows.WINDOW_ID_NONE) {
      if (IS_DEV_MODE) {console.log('🔄 Service worker woke up: Window focused');}
      ensureHeartbeat();
      // Don't create an event for this, just wake up the service worker
    }
  });

  // 6. Window Created - When new browser window opens
  browser.windows.onCreated.addListener((_window) => {
    if (IS_DEV_MODE) {console.log('🔄 Service worker woke up: Window created');}
    ensureHeartbeat();
    // Don't create an event for this, just wake up the service worker
  });
}

// Export for browser environment
self.ListenersModule = {
  setupTabListeners,
  setupMessageListener
};