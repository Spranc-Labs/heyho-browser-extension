/**
 * Sync Message Handlers Module
 *
 * Handles messages from the UI popup and coordinates with SyncManager.
 * Provides handlers for manual sync triggers and sync state queries.
 */

const SyncHandlers = (function () {
  'use strict';

  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };

  /**
   * Setup sync message handlers
   * Registers a message listener that handles sync-related actions from the UI
   * @returns {void}
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

    if (IS_DEV_MODE) {
      console.log('✅ Sync message handlers registered');
    }
  }

  /**
   * Handle sync action and route to appropriate handler
   * @param {Object} message - Message object with action and data
   * @param {Object} _sender - Message sender (unused but required by API)
   * @returns {Promise<Object>} Response object with success status
   * @private
   */
  function handleSyncAction(message, _sender) {
    const { action, data } = message;

    switch (action) {
      case 'syncNow':
        return handleSyncNow(data);

      case 'getSyncState':
        return Promise.resolve(handleGetSyncState());

      default:
        return Promise.resolve({
          success: false,
          error: 'Unknown sync action',
        });
    }
  }

  /**
   * Handle manual sync trigger from UI
   * @param {Object} data - Action data with optional force flag
   * @param {boolean} [data.force] - Force sync even if not authenticated
   * @returns {Promise<Object>} Sync result object
   * @private
   */
  async function handleSyncNow(data) {
    // Check if SyncManager is available
    if (!self.SyncManager) {
      console.error('❌ SyncManager not initialized');
      return {
        success: false,
        error: 'SyncManager not initialized',
      };
    }

    const { force = false } = data || {};

    if (IS_DEV_MODE) {
      console.log('📤 Manual sync triggered from UI');
    }

    const result = await self.SyncManager.syncToBackend(force);

    if (IS_DEV_MODE) {
      if (result.success) {
        console.log(`✅ Manual sync completed: ${result.synced || 0} items synced`);
      } else {
        console.log('❌ Manual sync failed:', result.error);
      }
    }

    return result;
  }

  /**
   * Handle get sync state request from UI
   * @returns {Object} Response object with sync state or error
   * @private
   */
  function handleGetSyncState() {
    // Check if SyncManager is available
    if (!self.SyncManager) {
      console.error('❌ SyncManager not initialized');
      return {
        success: false,
        error: 'SyncManager not initialized',
      };
    }

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
