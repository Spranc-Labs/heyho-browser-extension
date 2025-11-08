/**
 * Data Sync Manager Module
 *
 * Handles synchronization of browsing data to the backend API
 */

const SyncManager = (function () {
  'use strict';

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
   * Cleanup old synced records (older than 30 days)
   * Keeps unsynced records and recently synced records for display
   */
  async function cleanupOldSyncedRecords() {
    try {
      const result = await storage.get(['pageVisits', 'tabAggregates']);
      const allPageVisits = result.pageVisits || [];
      const allTabAggregates = result.tabAggregates || [];

      const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

      // Keep records that are:
      // 1. Not synced yet (synced !== true), OR
      // 2. Synced recently (syncedAt > cutoffTime)
      const pageVisits = allPageVisits.filter((v) => !v.synced || v.syncedAt > cutoffTime);

      const tabAggregates = allTabAggregates.filter((a) => !a.synced || a.syncedAt > cutoffTime);

      // Calculate what was removed
      const removedVisits = allPageVisits.length - pageVisits.length;
      const removedAggregates = allTabAggregates.length - tabAggregates.length;

      // Only update storage if something was removed
      if (removedVisits > 0 || removedAggregates > 0) {
        await storage.set({
          pageVisits,
          tabAggregates,
        });

        if (IS_DEV_MODE) {
          console.log(
            `🧹 Cleanup: Removed ${removedVisits} old page visits and ${removedAggregates} old tab aggregates`
          );
          console.log(
            `📊 Remaining: ${pageVisits.length} page visits, ${tabAggregates.length} tab aggregates`
          );
        }
      } else if (IS_DEV_MODE) {
        console.log('🧹 Cleanup: No old records to remove');
      }
    } catch (error) {
      console.error('Failed to cleanup old synced records:', error);
    }
  }

  /**
   * Mark records as failed when sync fails
   * @param {Array} failedVisitIds - IDs of page visits that failed to sync
   * @param {Array} failedAggregateTabIds - Tab IDs of aggregates that failed to sync
   */
  async function markRecordsAsFailed(failedVisitIds, failedAggregateTabIds) {
    try {
      const result = await storage.get(['pageVisits', 'tabAggregates']);
      const allPageVisits = result.pageVisits || [];
      const allTabAggregates = result.tabAggregates || [];

      // Create Sets for fast lookup
      const visitIdSet = new Set(failedVisitIds);
      const aggregateTabIdSet = new Set(failedAggregateTabIds);

      // Mark failed visits
      const updatedPageVisits = allPageVisits.map((visit) => {
        if (visitIdSet.has(visit.id) || visitIdSet.has(visit.visitId)) {
          return {
            ...visit,
            synced: false,
            syncStatus: 'failed',
          };
        }
        return visit;
      });

      // Mark failed aggregates
      const updatedTabAggregates = allTabAggregates.map((aggregate) => {
        if (aggregateTabIdSet.has(aggregate.tabId)) {
          return {
            ...aggregate,
            synced: false,
            syncStatus: 'failed',
          };
        }
        return aggregate;
      });

      // Save back to storage
      await storage.set({
        pageVisits: updatedPageVisits,
        tabAggregates: updatedTabAggregates,
      });

      if (IS_DEV_MODE) {
        console.log(
          `❌ Marked ${failedVisitIds.length} page visits and ${failedAggregateTabIds.length} tab aggregates as failed (will retry)`
        );
      }
    } catch (error) {
      console.error('Failed to mark records as failed:', error);
    }
  }

  /**
   * Send a single batch to backend
   * @param {Array} pageVisits - Page visits to sync (max 1000)
   * @param {Array} tabAggregates - Tab aggregates to sync (max 1000)
   * @param {string} anonymousClientId - Anonymous client ID
   * @returns {Promise<Object>} Result with success, visitIds, aggregateTabIds, data, error
   */
  async function sendBatch(pageVisits, tabAggregates, anonymousClientId) {
    try {
      // Extract IDs before sending
      const visitIds = pageVisits.map((v) => v.id || v.visitId);
      const aggregateTabIds = tabAggregates.map((a) => a.tabId);

      // Send to backend
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
        return {
          success: true,
          visitIds,
          aggregateTabIds,
          data: response.data,
        };
      } else {
        return {
          success: false,
          visitIds,
          aggregateTabIds,
          error: response.error || 'Batch sync failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        visitIds: pageVisits.map((v) => v.id || v.visitId),
        aggregateTabIds: tabAggregates.map((a) => a.tabId),
        error: error.message || 'Batch sync error',
      };
    }
  }

  /**
   * Sync data in batches (separate batching for visits and aggregates)
   * Sends pageVisits in chunks of 1000, then tabAggregates in chunks of 1000
   * @param {Array} pageVisits - All unsynced page visits
   * @param {Array} tabAggregates - All unsynced tab aggregates
   * @param {string} anonymousClientId - Anonymous client ID
   * @returns {Promise<Object>} Aggregate result from all batches
   */
  async function syncInBatches(pageVisits, tabAggregates, anonymousClientId) {
    const MAX_BATCH_SIZE = 1000;
    const results = {
      totalSynced: 0,
      totalFailed: 0,
      syncedVisitIds: [],
      syncedAggregateTabIds: [],
      failedVisitIds: [],
      failedAggregateTabIds: [],
      batchResults: [],
    };

    // === PHASE 1: Send pageVisits in batches ===
    const visitBatchCount = Math.ceil(pageVisits.length / MAX_BATCH_SIZE);

    if (visitBatchCount > 0 && IS_DEV_MODE) {
      console.log(`🔄 Splitting ${pageVisits.length} pageVisits into ${visitBatchCount} batch(es)`);
    }

    for (let i = 0; i < pageVisits.length; i += MAX_BATCH_SIZE) {
      const batchNum = Math.floor(i / MAX_BATCH_SIZE) + 1;
      const batch = pageVisits.slice(i, i + MAX_BATCH_SIZE);

      if (IS_DEV_MODE) {
        console.log(
          `📦 Sending pageVisits batch ${batchNum}/${visitBatchCount} (${batch.length} records)...`
        );
      }

      // Send batch with NO tab aggregates
      const result = await sendBatch(batch, [], anonymousClientId);

      if (result.success) {
        results.syncedVisitIds.push(...result.visitIds);
        results.totalSynced += batch.length;

        if (IS_DEV_MODE) {
          console.log(`  ✅ Batch ${batchNum}/${visitBatchCount} synced successfully`);
        }
      } else {
        results.failedVisitIds.push(...result.visitIds);
        results.totalFailed += batch.length;

        if (IS_DEV_MODE) {
          console.log(`  ❌ Batch ${batchNum}/${visitBatchCount} failed:`, result.error);
        }
      }

      results.batchResults.push({
        type: 'pageVisits',
        batchNum,
        totalBatches: visitBatchCount,
        count: batch.length,
        success: result.success,
        error: result.error,
      });
    }

    // === PHASE 2: Send tabAggregates in batches ===
    const aggregateBatchCount = Math.ceil(tabAggregates.length / MAX_BATCH_SIZE);

    if (aggregateBatchCount > 0 && IS_DEV_MODE) {
      console.log(
        `🔄 Splitting ${tabAggregates.length} tabAggregates into ${aggregateBatchCount} batch(es)`
      );
    }

    for (let i = 0; i < tabAggregates.length; i += MAX_BATCH_SIZE) {
      const batchNum = Math.floor(i / MAX_BATCH_SIZE) + 1;
      const batch = tabAggregates.slice(i, i + MAX_BATCH_SIZE);

      if (IS_DEV_MODE) {
        console.log(
          `📦 Sending tabAggregates batch ${batchNum}/${aggregateBatchCount} (${batch.length} records)...`
        );
      }

      // Send batch with NO page visits
      const result = await sendBatch([], batch, anonymousClientId);

      if (result.success) {
        results.syncedAggregateTabIds.push(...result.aggregateTabIds);
        results.totalSynced += batch.length;

        if (IS_DEV_MODE) {
          console.log(`  ✅ Batch ${batchNum}/${aggregateBatchCount} synced successfully`);
        }
      } else {
        results.failedAggregateTabIds.push(...result.aggregateTabIds);
        results.totalFailed += batch.length;

        if (IS_DEV_MODE) {
          console.log(`  ❌ Batch ${batchNum}/${aggregateBatchCount} failed:`, result.error);
        }
      }

      results.batchResults.push({
        type: 'tabAggregates',
        batchNum,
        totalBatches: aggregateBatchCount,
        count: batch.length,
        success: result.success,
        error: result.error,
      });
    }

    // Calculate overall success
    const totalBatches = visitBatchCount + aggregateBatchCount;
    const successfulBatches = results.batchResults.filter((b) => b.success).length;

    if (IS_DEV_MODE) {
      console.log(
        `✅ Batched sync complete: ${successfulBatches}/${totalBatches} batches successful`
      );
      console.log(`   Total synced: ${results.totalSynced}, Total failed: ${results.totalFailed}`);
    }

    return results;
  }

  /**
   * Mark records as synced after successful sync
   * @param {Array} syncedVisitIds - IDs of page visits that were synced
   * @param {Array} syncedAggregateTabIds - Tab IDs of aggregates that were synced
   */
  async function markRecordsAsSynced(syncedVisitIds, syncedAggregateTabIds) {
    try {
      const result = await storage.get(['pageVisits', 'tabAggregates']);
      const allPageVisits = result.pageVisits || [];
      const allTabAggregates = result.tabAggregates || [];

      // Create Sets for fast lookup
      const visitIdSet = new Set(syncedVisitIds);
      const aggregateTabIdSet = new Set(syncedAggregateTabIds);

      // Mark synced visits
      const updatedPageVisits = allPageVisits.map((visit) => {
        if (visitIdSet.has(visit.id) || visitIdSet.has(visit.visitId)) {
          return {
            ...visit,
            synced: true,
            syncedAt: Date.now(),
            syncStatus: 'synced',
          };
        }
        return visit;
      });

      // Mark synced aggregates
      const updatedTabAggregates = allTabAggregates.map((aggregate) => {
        if (aggregateTabIdSet.has(aggregate.tabId)) {
          return {
            ...aggregate,
            synced: true,
            syncedAt: Date.now(),
            syncStatus: 'synced',
          };
        }
        return aggregate;
      });

      // Save back to storage
      await storage.set({
        pageVisits: updatedPageVisits,
        tabAggregates: updatedTabAggregates,
      });

      if (IS_DEV_MODE) {
        console.log(
          `✅ Marked ${syncedVisitIds.length} page visits and ${syncedAggregateTabIds.length} tab aggregates as synced`
        );
      }
    } catch (error) {
      console.error('Failed to mark records as synced:', error);
    }
  }

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
      if (self.aggregator && self.aggregator.processEvents) {
        if (IS_DEV_MODE) {
          console.log('⚙️ Running aggregation before sync...');
        }
        await self.aggregator.processEvents();
      }

      // Cleanup old synced records before sync
      await cleanupOldSyncedRecords();

      // Get anonymous client ID
      const anonymousClientId = self.AnonymousIdModule
        ? await self.AnonymousIdModule.getAnonymousId()
        : null;

      // Get data to sync from storage
      const result = await storage.get(['pageVisits', 'tabAggregates']);
      const allPageVisits = result.pageVisits || [];
      const allTabAggregates = result.tabAggregates || [];

      // Filter to only get unsynced records or failed records
      const pageVisits = allPageVisits.filter((v) => !v.synced || v.syncStatus === 'failed');
      const tabAggregates = allTabAggregates.filter((a) => !a.synced || a.syncStatus === 'failed');

      if (IS_DEV_MODE) {
        console.log(
          `📊 Total records: ${allPageVisits.length} page visits, ${allTabAggregates.length} tab aggregates`
        );
        console.log(
          `🔄 Unsynced: ${pageVisits.length} page visits, ${tabAggregates.length} tab aggregates`
        );
      }

      // Check if there's data to sync
      if (pageVisits.length === 0 && tabAggregates.length === 0) {
        if (IS_DEV_MODE) {
          console.log('ℹ️ No unsynced data to sync');
        }
        syncState.isSyncing = false;
        return { success: true, message: 'No unsynced data to sync', synced: 0 };
      }

      if (IS_DEV_MODE) {
        console.log(
          `📊 Syncing ${pageVisits.length} page visits and ${tabAggregates.length} tab aggregates`
        );
      }

      // Sync data using batching (handles >1000 records automatically)
      const batchResults = await syncInBatches(pageVisits, tabAggregates, anonymousClientId);

      // Mark synced records
      if (batchResults.syncedVisitIds.length > 0 || batchResults.syncedAggregateTabIds.length > 0) {
        await markRecordsAsSynced(batchResults.syncedVisitIds, batchResults.syncedAggregateTabIds);
      }

      // Mark failed records
      if (batchResults.failedVisitIds.length > 0 || batchResults.failedAggregateTabIds.length > 0) {
        await markRecordsAsFailed(batchResults.failedVisitIds, batchResults.failedAggregateTabIds);
      }

      // Determine overall success
      const hasSuccesses = batchResults.totalSynced > 0;
      const hasFailures = batchResults.totalFailed > 0;
      const isCompleteSuccess = hasSuccesses && !hasFailures;
      const isPartialSuccess = hasSuccesses && hasFailures;
      const _isCompleteFailure = !hasSuccesses && hasFailures; // For future error handling

      if (isCompleteSuccess || isPartialSuccess) {
        // Update sync state
        syncState.lastSyncStatus = isCompleteSuccess ? 'success' : 'partial';
        syncState.syncedDataCounts = {
          pageVisits: batchResults.syncedVisitIds.length,
          tabAggregates: batchResults.syncedAggregateTabIds.length,
        };

        // Only update lastSyncTime if we actually synced data
        if (batchResults.totalSynced > 0) {
          syncState.lastSyncTime = Date.now();
        }

        // Save sync state to storage
        await storage.set({
          lastSyncTime: syncState.lastSyncTime,
          lastSyncStatus: syncState.lastSyncStatus,
        });

        if (IS_DEV_MODE) {
          console.log('✅ Data synced and marked. Keeping local copy for display (30 days).');
          console.log(
            `   Synced: ${batchResults.totalSynced}, Failed: ${batchResults.totalFailed}`
          );
        }

        syncState.isSyncing = false;
        return {
          success: true,
          message: isCompleteSuccess
            ? 'Data synced successfully'
            : `Partial sync: ${batchResults.totalSynced} succeeded, ${batchResults.totalFailed} failed`,
          synced: batchResults.totalSynced,
          failed: batchResults.totalFailed,
          batchResults: batchResults.batchResults,
        };
      } else {
        // Complete failure
        syncState.lastSyncStatus = 'failed';
        await storage.set({ lastSyncStatus: 'failed' });

        if (IS_DEV_MODE) {
          console.log('❌ Sync failed: All batches failed');
        }

        syncState.isSyncing = false;
        return {
          success: false,
          error: 'All sync batches failed',
          failed: batchResults.totalFailed,
          batchResults: batchResults.batchResults,
        };
      }
    } catch (error) {
      console.error('Sync error:', error);
      syncState.lastSyncStatus = 'error';
      syncState.isSyncing = false;
      await storage.set({ lastSyncStatus: 'error' });

      // Note: Individual batch failures are handled by syncInBatches()
      // This catch block only handles catastrophic errors before batching starts

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
