/**
 * Sync Message Handlers
 *
 * Handles messages from the UI and coordinates with SyncManager
 */

const SyncHandlers = (function () {
  'use strict';

  /**
   * Setup sync message handlers
   */
  function setupSyncMessageHandlers() {
    // Listen for messages from UI
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Only handle sync-related messages
      if (!message.action || !['syncNow', 'getSyncState'].includes(message.action)) {
        return false; // Let other handlers process this message
      }

      // Handle sync actions asynchronously
      handleSyncAction(message, sender)
        .then(sendResponse)
        .catch((error) => {
          console.error('Sync handler error:', error);
          sendResponse({
            success: false,
            error: error.message || 'An unexpected error occurred',
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    });

    if (self.ConfigModule?.IS_DEV_MODE) {
      console.log('✅ Sync message handlers registered');
    }
  }

  /**
   * Handle sync action
   */
  async function handleSyncAction(message, _sender) {
    const { action, data } = message;

    switch (action) {
      case 'syncNow':
        return await handleSyncNow(data);

      case 'getSyncState':
        return await handleGetSyncState();

      default:
        return {
          success: false,
          error: 'Unknown sync action',
        };
    }
  }

  /**
   * Handle manual sync trigger
   */
  async function handleSyncNow(data) {
    const { force = false } = data || {};

    if (self.ConfigModule?.IS_DEV_MODE) {
      console.log('📤 Manual sync triggered from UI');
    }

    const result = await self.SyncManager.syncToBackend(force);

    if (result.success && self.ConfigModule?.IS_DEV_MODE) {
      console.log(`✅ Manual sync completed: ${result.synced || 0} items synced`);
    } else if (!result.success && self.ConfigModule?.IS_DEV_MODE) {
      console.log('❌ Manual sync failed:', result.error);
    }

    return result;
  }

  /**
   * Handle get sync state
   */
  function handleGetSyncState() {
    const syncState = self.SyncManager.getSyncState();

    return {
      success: true,
      data: syncState,
    };
  }

  // Public API
  return {
    setupSyncMessageHandlers,
  };
})();

// Export for browser environment
self.SyncHandlers = SyncHandlers;
