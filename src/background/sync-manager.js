/**
 * Data Sync Manager Module
 *
 * Handles synchronization of browsing data to the backend API
 */

const SyncManager = (function () {
  'use strict';

  // VERSION MARKER - If you see this in console, new code is loaded!
  console.warn('🔄 SyncManager VERSION 2.0 - WITH FILTER LOGGING loaded!');

  const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
  const { IS_DEV_MODE } = self.ConfigModule || { IS_DEV_MODE: false };

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

  /**
   * Initialize sync manager
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
   * Sync browsing data to backend
   * @param {boolean} force - Force sync even if not authenticated
   * @returns {Promise<object>} Sync result
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
      let pageVisits = result.pageVisits || [];
      const tabAggregates = result.tabAggregates || [];

      // Filter out invalid URLs that should never be synced
      const invalidUrlPrefixes = [
        'moz-extension://',
        'chrome-extension://',
        'about:',
        'chrome://',
        'edge://',
        'view-source:',
      ];

      const originalCount = pageVisits.length;
      const filteredOutUrls = [];

      pageVisits = pageVisits.filter((visit) => {
        const url = visit.url || visit.visitUrl || '';
        const isInvalid = invalidUrlPrefixes.some((prefix) => url.startsWith(prefix));

        if (isInvalid) {
          filteredOutUrls.push(url);
        }

        return !isInvalid;
      });

      // Log filtered URLs (always, not just in dev mode - this is critical for debugging)
      if (filteredOutUrls.length > 0) {
        console.warn(`🧹 Filtered out ${filteredOutUrls.length} invalid URLs before sync:`);
        // Show first 5 URLs to avoid spam
        filteredOutUrls.slice(0, 5).forEach((url) => {
          console.warn(`   ❌ ${url}`);
        });
        if (filteredOutUrls.length > 5) {
          console.warn(`   ... and ${filteredOutUrls.length - 5} more`);
        }
      } else if (IS_DEV_MODE && originalCount > 0) {
        console.log('✅ All URLs are valid (no filtering needed)');
      }

      // Check if there's data to sync
      if (pageVisits.length === 0 && tabAggregates.length === 0) {
        if (IS_DEV_MODE) {
          console.log('ℹ️ No data to sync');
        }
        syncState.isSyncing = false;
        return { success: true, message: 'No data to sync', synced: 0 };
      }

      if (IS_DEV_MODE) {
        console.log(
          `📊 Syncing ${pageVisits.length} page visits and ${tabAggregates.length} tab aggregates`
        );
      }

      // Send data to backend
      const response = await self.ApiClient.post(
        '/data/sync',
        {
          anonymousClientId,
          pageVisits,
          tabAggregates,
        },
        { authenticated: true }
      );

      if (response.success) {
        // Update sync state
        syncState.lastSyncStatus = 'success';
        syncState.syncedDataCounts = {
          pageVisits: pageVisits.length,
          tabAggregates: tabAggregates.length,
        };

        // Only update lastSyncTime if we actually synced data
        if (pageVisits.length > 0 || tabAggregates.length > 0) {
          syncState.lastSyncTime = Date.now();
        }

        // Save sync state to storage
        await storage.set({
          lastSyncTime: syncState.lastSyncTime,
          lastSyncStatus: syncState.lastSyncStatus,
        });

        // Clear synced data from local storage after successful sync
        await storage.set({ pageVisits: [], tabAggregates: [] });

        if (IS_DEV_MODE) {
          console.log('✅ Data synced successfully:', response.data);
        }

        syncState.isSyncing = false;
        return {
          success: true,
          message: 'Data synced successfully',
          synced: pageVisits.length + tabAggregates.length,
          data: response.data, // This now includes page_visits_new and tab_aggregates_new
        };
      } else {
        syncState.lastSyncStatus = 'failed';
        await storage.set({ lastSyncStatus: 'failed' });

        // Always log sync failures (not just in dev mode - critical for debugging)
        console.error('❌ Sync failed:', response.error);

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

        syncState.isSyncing = false;
        return {
          success: false,
          error: response.error || 'Sync failed',
        };
      }
    } catch (error) {
      console.error('❌ Sync exception:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      syncState.lastSyncStatus = 'error';
      syncState.isSyncing = false;
      await storage.set({ lastSyncStatus: 'error' });

      return {
        success: false,
        error: error.message || 'Sync failed',
      };
    }
  }

  /**
   * Get current sync state
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
   */
  async function setupSyncAlarm() {
    try {
      // Create alarm that fires every 5 minutes
      await chrome.alarms.create('data-sync', {
        periodInMinutes: 5,
      });

      // Set up listener for sync alarm
      chrome.alarms.onAlarm.addListener(async (alarm) => {
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
      });

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
