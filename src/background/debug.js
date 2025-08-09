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
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
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
    const { getAllEvents, getPageVisitsCount, getTabAggregatesCount } = self.StorageModule;
    
    // Get counts from each store
    const rawEvents = await getAllEvents();
    const pageVisitsCount = await getPageVisitsCount();
    const tabAggregatesCount = await getTabAggregatesCount();
    
    // Get last aggregation time from storage
    const result = await chrome.storage.local.get('lastAggregationTime');
    const lastAggregation = result.lastAggregationTime 
      ? new Date(result.lastAggregationTime).toLocaleString()
      : 'Never';

    const stats = {
      eventsCount: rawEvents.length,
      visitsCount: pageVisitsCount,
      tabsCount: tabAggregatesCount,
      lastAggregation
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
    const { processEvents } = self.AggregatorModule;
    
    // Get count before processing
    const { getAllEvents } = self.StorageModule;
    const eventsBefore = await getAllEvents();
    const eventsCountBefore = eventsBefore.length;
    
    // Run aggregation
    await processEvents();
    
    // Store aggregation time
    await chrome.storage.local.set({
      lastAggregationTime: Date.now()
    });
    
    sendResponse({ 
      success: true, 
      eventsProcessed: eventsCountBefore,
      message: 'Aggregation completed successfully'
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
 * Exports all aggregation data
 */
async function handleExportAllData(sendResponse) {
  try {
    const { getAllEvents } = self.StorageModule;
    
    // Get all data in parallel
    const [rawEvents, pageVisits, tabAggregates] = await Promise.all([
      getAllEvents(),
      getAllPageVisits(),
      getAllTabAggregates()
    ]);
    
    // Get system stats
    const result = await chrome.storage.local.get('lastAggregationTime');
    const stats = {
      lastAggregationTime: result.lastAggregationTime || null,
      exportedAt: Date.now()
    };
    
    sendResponse({
      success: true,
      data: {
        rawEvents,
        pageVisits,
        tabAggregates,
        stats
      }
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Gets all page visits from the database
 */
async function getAllPageVisits() {
  try {
    const { initDB, PAGE_VISITS_STORE } = self.StorageModule;
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PAGE_VISITS_STORE], 'readonly');
      const store = transaction.objectStore(PAGE_VISITS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get page visits: ${request.error}`));
      transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
    });
  } catch (error) {
    throw new Error(`Failed to get page visits: ${error.message}`);
  }
}

/**
 * Gets all tab aggregates from the database
 */
async function getAllTabAggregates() {
  try {
    const { initDB, TAB_AGGREGATES_STORE } = self.StorageModule;
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TAB_AGGREGATES_STORE], 'readonly');
      const store = transaction.objectStore(TAB_AGGREGATES_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get tab aggregates: ${request.error}`));
      transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
    });
  } catch (error) {
    throw new Error(`Failed to get tab aggregates: ${error.message}`);
  }
}

// Export for browser environment
self.DebugModule = {
  setupDebugMessageHandlers,
  getAllPageVisits,
  getAllTabAggregates
};