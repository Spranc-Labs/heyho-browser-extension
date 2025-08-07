/**
 * Listeners Module for HeyHo Extension
 * 
 * Houses all the browser tab event listeners.
 */

/**
 * Sets up all tab event listeners
 */
function setupTabListeners() {
  const { createCoreEvent, logAndSaveEvent } = self.EventsModule;
  const { IS_DEV_MODE } = self.ConfigModule;

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
}

// Export for browser environment
self.ListenersModule = {
  setupTabListeners
};