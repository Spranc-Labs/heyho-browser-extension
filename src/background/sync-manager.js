/**
 * Data Sync Manager Module
 *
 * Handles synchronization of browsing data to the backend API
 */

const SyncManager = (function () {
  'use strict';

  const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };
  const { INVALID_URL_PREFIXES } = self.Constants || { INVALID_URL_PREFIXES: [] };

  // Sync state
  const syncState = {
    isSyncing: false,
    lastSyncTime: null,
    lastSyncStatus: null,
    syncedDataCounts: {
      pageVisits: 0,
      tabAggregates: 0,
    },
  };

  // Store alarm listener reference to prevent memory leaks
  let syncAlarmListener = null;

  /**
   * Initialize sync manager
   * @returns {Promise<void>}
   */
  async function init() {
    if (IS_DEV_MODE) {
      console.log('🔄 Initializing Sync Manager...');
    }

    // Load last sync time from storage
    const result = await storage.get(['lastSyncTime', 'lastSyncStatus']);
    if (result.lastSyncTime) {
      syncState.lastSyncTime = result.lastSyncTime;
      syncState.lastSyncStatus = result.lastSyncStatus || 'success';
    }

    if (IS_DEV_MODE) {
      const lastSyncStr = syncState.lastSyncTime
        ? new Date(syncState.lastSyncTime).toLocaleString()
        : 'Never';
      console.log('🔄 Sync Manager initialized. Last sync:', lastSyncStr);
    }
  }

  /**
   * Filter out invalid URLs from page visits
   * @param {Array} pageVisits - Array of page visit objects
   * @returns {{validVisits: Array, filteredUrls: Array}}
   * @private
   */
  function filterInvalidUrls(pageVisits) {
    return pageVisits.reduce(
      (acc, visit) => {
        const url = visit.url || visit.visitUrl || '';
        const isInvalid = INVALID_URL_PREFIXES.some((prefix) => url.startsWith(prefix));

        if (isInvalid) {
          acc.filteredUrls.push(url);
        } else {
          acc.validVisits.push(visit);
        }

        return acc;
      },
      { validVisits: [], filteredUrls: [] }
    );
  }

  /**
   * Handle successful sync
   * @param {Array} pageVisits - Synced page visits
   * @param {Array} tabAggregates - Synced tab aggregates
   * @param {Object} responseData - Backend response data
   * @returns {Promise<Object>} Success response object
   * @private
   */
  async function handleSyncSuccess(pageVisits, tabAggregates, responseData) {
    syncState.lastSyncStatus = 'success';
    syncState.syncedDataCounts = {
      pageVisits: pageVisits.length,
      tabAggregates: tabAggregates.length,
    };

    if (pageVisits.length > 0 || tabAggregates.length > 0) {
      syncState.lastSyncTime = Date.now();
    }

    await storage.set({
      lastSyncTime: syncState.lastSyncTime,
      lastSyncStatus: syncState.lastSyncStatus,
      pageVisits: [],
      tabAggregates: [],
    });

    if (IS_DEV_MODE) {
      console.log('✅ Data synced successfully:', responseData);
    }

    return {
      success: true,
      message: 'Data synced successfully',
      synced: pageVisits.length + tabAggregates.length,
      data: responseData,
    };
  }

  /**
   * Handle sync failure
   * @param {Array} pageVisits - Failed page visits
   * @param {string} errorMessage - Error message
   * @returns {Promise<Object>} Failure response object
   * @private
   */
  async function handleSyncFailure(pageVisits, errorMessage) {
    syncState.lastSyncStatus = 'failed';

    try {
      await storage.set({ lastSyncStatus: 'failed' });
    } catch (storageError) {
      console.error('Failed to save sync failure status:', storageError);
    }

    console.error('❌ Sync failed:', errorMessage);

    // Log sample of data that was rejected
    if (pageVisits.length > 0) {
      console.error('Sample of rejected page visits:');
      pageVisits.slice(0, 3).forEach((visit, idx) => {
        console.error(`  Visit ${idx + 1}:`, {
          url: visit.url || visit.visitUrl,
          domain: visit.domain,
          category: visit.category,
          visitedAt: visit.visitedAt || visit.visited_at,
        });
      });
      if (pageVisits.length > 3) {
        console.error(`  ... and ${pageVisits.length - 3} more visits`);
      }
    }

    return {
      success: false,
      error: errorMessage || 'Sync failed',
    };
  }

  /**
   * Sync browsing data to backend
   * @param {boolean} force - Force sync even if not authenticated
   * @returns {Promise<{success: boolean, message?: string, synced?: number, data?: object, error?: string}>}
   */
  async function syncToBackend(force = false) {
    // Check if user is authenticated
    if (!force && (!self.AuthManager || !self.AuthManager.isAuthenticated())) {
      if (IS_DEV_MODE) {
        console.log('⏭️ Skipping sync - user not authenticated');
      }
      return { success: false, error: 'Not authenticated' };
    }

    // Prevent concurrent syncs
    if (syncState.isSyncing) {
      if (IS_DEV_MODE) {
        console.log('⏭️ Skipping sync - already in progress');
      }
      return { success: false, error: 'Sync already in progress' };
    }

    syncState.isSyncing = true;

    try {
      if (IS_DEV_MODE) {
        console.log('🔄 Starting data sync to backend...');
      }

      // Trigger aggregation before sync to ensure all events are processed
      if (self.AggregatorModule && self.AggregatorModule.processEvents) {
        if (IS_DEV_MODE) {
          console.log('⚙️ Running aggregation before sync...');
        }
        await self.AggregatorModule.processEvents();
      }

      // Get anonymous client ID
      const anonymousClientId = self.AnonymousIdModule
        ? await self.AnonymousIdModule.getAnonymousId()
        : null;

      // Get data to sync from storage
      const result = await storage.get(['pageVisits', 'tabAggregates']);
      const tabAggregates = result.tabAggregates || [];

      // Filter out invalid URLs
      const { validVisits, filteredUrls } = filterInvalidUrls(result.pageVisits || []);

      // Log filtered URLs if any (dev mode only)
      if (IS_DEV_MODE && filteredUrls.length > 0) {
        console.warn(`🧹 Filtered out ${filteredUrls.length} invalid URLs before sync:`);
        filteredUrls.slice(0, 5).forEach((url) => {
          console.warn(`   ❌ ${url}`);
        });
        if (filteredUrls.length > 5) {
          console.warn(`   ... and ${filteredUrls.length - 5} more`);
        }
      }

      // Check if there's data to sync
      if (validVisits.length === 0 && tabAggregates.length === 0) {
        if (IS_DEV_MODE) {
          console.log('ℹ️ No data to sync');
        }
        return { success: true, message: 'No data to sync', synced: 0 };
      }

      if (IS_DEV_MODE) {
        console.log(
          `📊 Syncing ${validVisits.length} page visits and ${tabAggregates.length} tab aggregates`
        );
      }

      // Send data to backend
      const response = await self.ApiClient.post(
        '/data/sync',
        {
          anonymousClientId,
          pageVisits: validVisits,
          tabAggregates,
        },
        { authenticated: true }
      );

      if (response.success) {
        return await handleSyncSuccess(validVisits, tabAggregates, response.data);
      } else {
        return await handleSyncFailure(validVisits, response.error);
      }
    } catch (error) {
      console.error('❌ Sync exception:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      syncState.lastSyncStatus = 'error';

      try {
        await storage.set({ lastSyncStatus: 'error' });
      } catch (storageError) {
        console.error('Failed to save error status:', storageError);
      }

      return {
        success: false,
        error: error.message || 'Sync failed',
      };
    } finally {
      // Always reset syncing flag
      syncState.isSyncing = false;
    }
  }

  /**
   * Get current sync state
   * @returns {{isSyncing: boolean, lastSyncTime: number|null, lastSyncStatus: string|null, syncedDataCounts: object}}
   */
  function getSyncState() {
    return {
      isSyncing: syncState.isSyncing,
      lastSyncTime: syncState.lastSyncTime,
      lastSyncStatus: syncState.lastSyncStatus,
      syncedDataCounts: syncState.syncedDataCounts,
    };
  }

  /**
   * Setup periodic sync alarm
   * Syncs data every 5 minutes if authenticated
   * @returns {Promise<void>}
   */
  async function setupSyncAlarm() {
    try {
      // Remove existing listener if any to prevent memory leaks
      if (syncAlarmListener) {
        chrome.alarms.onAlarm.removeListener(syncAlarmListener);
      }

      // Create alarm that fires every 5 minutes
      await chrome.alarms.create('data-sync', {
        periodInMinutes: 5,
      });

      // Create and store listener reference
      syncAlarmListener = async (alarm) => {
        if (alarm.name === 'data-sync') {
          if (IS_DEV_MODE) {
            console.log('⏰ Sync alarm triggered');
          }

          // Only sync if authenticated
          if (self.AuthManager && self.AuthManager.isAuthenticated()) {
            await syncToBackend();
          } else if (IS_DEV_MODE) {
            console.log('⏭️ Skipping scheduled sync - not authenticated');
          }
        }
      };

      // Set up listener for sync alarm
      chrome.alarms.onAlarm.addListener(syncAlarmListener);

      if (IS_DEV_MODE) {
        console.log('✅ Data sync alarm configured (every 5 minutes)');
      }
    } catch (error) {
      console.error('Failed to setup sync alarm:', error);
    }
  }

  // Public API
  return {
    init,
    syncToBackend,
    getSyncState,
    setupSyncAlarm,
  };
})();

// Export for browser environment
self.SyncManager = SyncManager;
