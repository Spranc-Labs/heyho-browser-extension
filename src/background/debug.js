/**
 * Debug Module for HeyHo Extension
 *
 * Handles debug panel requests and data export functionality
 */

/**
 * Sets up message listeners for debug panel communication
 */
function setupDebugMessageHandlers() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only handle debug-specific actions
    const debugActions = [
      'getDebugStats',
      'triggerAggregation',
      'getRawEvents',
      'exportData',
      'exportAllData',
      'runMigration',
      'checkModules',
      'clearOldData',
    ];

    if (!request.action || !debugActions.includes(request.action)) {
      return false; // Let other handlers process this message
    }

    handleDebugMessage(request, sender, sendResponse);
    return true; // Keep message channel open for async responses
  });
}

/**
 * Handles messages from the debug popup
 */
async function handleDebugMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'getDebugStats':
        await handleGetDebugStats(sendResponse);
        break;

      case 'triggerAggregation':
        await handleTriggerAggregation(sendResponse);
        break;

      case 'getRawEvents':
        await handleGetRawEvents(sendResponse);
        break;

      case 'exportData':
        await handleExportData(request.dataType, sendResponse);
        break;

      case 'exportAllData':
        await handleExportAllData(sendResponse);
        break;

      case 'runMigration':
        await handleRunMigration(sendResponse);
        break;

      case 'checkModules':
        await handleCheckModules(sendResponse);
        break;

      case 'clearOldData':
        await handleClearOldData(sendResponse);
        break;

      default:
        // This should never happen since we filter actions in the listener
        console.error('Unexpected debug action:', request.action);
        sendResponse({ success: false, error: 'Unexpected action' });
    }
  } catch (error) {
    console.error('Debug message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Gets current system statistics
 */
async function handleGetDebugStats(sendResponse) {
  try {
    const { getAllEvents, getSyncedPageVisitsCount } = self.StorageModule;

    // Get raw events from IndexedDB
    const rawEvents = await getAllEvents();

    // Get aggregated data from browser.storage.local
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const [
      pageVisitsResult,
      tabAggregatesResult,
      lastAggregationResult,
      totalSyncedPageVisitsResult,
      totalSyncedTabAggregatesResult,
    ] = await Promise.all([
      storage.get('pageVisits'),
      storage.get('tabAggregates'),
      storage.get('lastAggregationTime'),
      storage.get('totalSyncedPageVisits'),
      storage.get('totalSyncedTabAggregates'),
    ]);

    const pageVisits = pageVisitsResult.pageVisits || [];
    const tabAggregates = tabAggregatesResult.tabAggregates || [];
    const totalSyncedPageVisits = totalSyncedPageVisitsResult.totalSyncedPageVisits || 0;
    const totalSyncedTabAggregates = totalSyncedTabAggregatesResult.totalSyncedTabAggregates || 0;

    // Get synced page visits count from IndexedDB
    const syncedCount = await getSyncedPageVisitsCount();

    const lastAggregation = lastAggregationResult.lastAggregationTime
      ? new Date(lastAggregationResult.lastAggregationTime).toLocaleString()
      : 'Never';

    const stats = {
      eventsCount: rawEvents.length,
      visitsCount: totalSyncedPageVisits + pageVisits.length, // Total = synced + pending
      tabsCount: totalSyncedTabAggregates + tabAggregates.length, // Total = synced + pending
      pendingVisits: pageVisits.length,
      pendingTabs: tabAggregates.length,
      totalSyncedPageVisits,
      totalSyncedTabAggregates,
      syncedPageVisitsInDB: syncedCount,
      lastAggregation,
    };

    sendResponse({ success: true, stats });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Triggers manual aggregation process
 */
async function handleTriggerAggregation(sendResponse) {
  try {
    // Use the refactored aggregator module
    const { triggerAggregation } = self.aggregator;

    // Get count before processing
    const { getAllEvents } = self.StorageModule;
    const eventsBefore = await getAllEvents();
    const eventsCountBefore = eventsBefore.length;

    // Run aggregation
    const result = await triggerAggregation();

    // Store aggregation time
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    await storage.set({
      lastAggregationTime: Date.now(),
    });

    sendResponse({
      success: result?.success || true,
      eventsProcessed: eventsCountBefore,
      message: 'Aggregation completed successfully',
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Gets all raw events for debugging
 */
async function handleGetRawEvents(sendResponse) {
  try {
    const { getAllEvents } = self.StorageModule;
    const events = await getAllEvents();

    sendResponse({ success: true, data: events });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Exports specific data type
 */
async function handleExportData(dataType, sendResponse) {
  try {
    let data = [];

    switch (dataType) {
      case 'pageVisits':
        data = await getAllPageVisits();
        break;
      case 'tabAggregates':
        data = await getAllTabAggregates();
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    sendResponse({ success: true, data });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Check module loading status
 */
function handleCheckModules(sendResponse) {
  try {
    const moduleStatus = {
      StorageModule: !!self.StorageModule,
      AnonymousIdModule: !!self.AnonymousIdModule,
      EventsModule: !!self.EventsModule,
      aggregator: !!self.aggregator,
    };

    if (self.AnonymousIdModule) {
      moduleStatus.AnonymousIdMethods = Object.keys(self.AnonymousIdModule);
    }

    console.log('🔍 Module Status:', moduleStatus);
    sendResponse({ success: true, modules: moduleStatus });
  } catch (error) {
    console.error('❌ Module check failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Manually run anonymous client ID migration
 */
async function handleRunMigration(sendResponse) {
  try {
    console.log('🔍 DEBUG: Checking AnonymousIdModule availability...');
    console.log('🔍 DEBUG: self.AnonymousIdModule exists:', !!self.AnonymousIdModule);

    if (self.AnonymousIdModule) {
      console.log('🔍 DEBUG: Available methods:', Object.keys(self.AnonymousIdModule));
    }

    if (!self.AnonymousIdModule || !self.AnonymousIdModule.migrateExistingData) {
      const errorMsg = !self.AnonymousIdModule
        ? 'AnonymousIdModule not found'
        : 'migrateExistingData method not found';
      console.error('❌', errorMsg);
      sendResponse({ success: false, error: `Anonymous ID module not available: ${errorMsg}` });
      return;
    }

    console.log('🔄 Starting manual migration...');
    await self.AnonymousIdModule.migrateExistingData();
    console.log('✅ Manual migration completed');

    sendResponse({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Exports all aggregation data
 */
async function handleExportAllData(sendResponse) {
  try {
    const { getAllEvents } = self.StorageModule;

    // Check if migration has been run
    let migrationStatus = 'unknown';
    if (self.AnonymousIdModule && self.AnonymousIdModule.isMigrationCompleted) {
      migrationStatus = (await self.AnonymousIdModule.isMigrationCompleted())
        ? 'completed'
        : 'pending';
    }

    console.log(`🔍 DEBUG: Migration status: ${migrationStatus}`);

    // Get all data in parallel
    const [rawEvents, pageVisits, tabAggregates] = await Promise.all([
      getAllEvents(),
      getAllPageVisits(),
      getAllTabAggregates(),
    ]);

    // Get system stats
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const result = await storage.get('lastAggregationTime');
    const stats = {
      lastAggregationTime: result.lastAggregationTime || null,
      exportedAt: Date.now(),
    };

    sendResponse({
      success: true,
      data: {
        rawEvents,
        pageVisits,
        tabAggregates,
        stats,
      },
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Gets all page visits from the aggregation storage
 */
async function getAllPageVisits() {
  try {
    console.log('🔍 DEBUG: Getting page visits from chrome.storage.local...');
    // Get from browser.storage.local where aggregation saves them
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const result = await storage.get('pageVisits');
    const pageVisits = result.pageVisits || [];
    console.log(`🔍 DEBUG: Found ${pageVisits.length} page visits in storage`);

    if (pageVisits.length > 0) {
      console.log('🔍 DEBUG: Sample page visit:', pageVisits[0]);
    }

    return pageVisits;
  } catch (error) {
    console.error('❌ DEBUG: Error getting page visits:', error);
    throw new Error(`Failed to get page visits: ${error.message}`);
  }
}

/**
 * Gets all tab aggregates from the aggregation storage
 */
async function getAllTabAggregates() {
  try {
    console.log('🔍 DEBUG: Getting tab aggregates from chrome.storage.local...');
    // Get from browser.storage.local where aggregation saves them
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const result = await storage.get('tabAggregates');
    const tabAggregates = result.tabAggregates || [];
    console.log(`🔍 DEBUG: Found ${tabAggregates.length} tab aggregates in storage`);

    if (tabAggregates.length > 0) {
      console.log('🔍 DEBUG: Sample tab aggregate:', tabAggregates[0]);
    }

    return tabAggregates;
  } catch (error) {
    console.error('❌ DEBUG: Error getting tab aggregates:', error);
    throw new Error(`Failed to get tab aggregates: ${error.message}`);
  }
}

/**
 * Clear old aggregated data (for testing metadata fixes)
 */
async function handleClearOldData(sendResponse) {
  try {
    console.log('🧹 Clearing old aggregated data...');

    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;

    // Clear aggregated page visits and tab aggregates
    await storage.remove(['pageVisits', 'tabAggregates']);

    // Also clear events from IndexedDB for a fresh start
    if (self.StorageModule && self.StorageModule.clearEvents) {
      await self.StorageModule.clearEvents();
    }

    console.log('✅ Old data cleared! New browsing will use metadata fixes.');
    console.log('💡 Browse some pages and trigger aggregation to test.');

    sendResponse({
      success: true,
      message: 'Old data cleared successfully. Browse new pages to test metadata extraction.',
    });
  } catch (error) {
    console.error('❌ Failed to clear old data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Export for browser environment
self.DebugModule = {
  setupDebugMessageHandlers,
  getAllPageVisits,
  getAllTabAggregates,
};
