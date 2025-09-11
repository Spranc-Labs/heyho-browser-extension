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
    const { getAllEvents } = self.StorageModule;
    
    // Get raw events from IndexedDB
    const rawEvents = await getAllEvents();
    
    // Get aggregated data from browser.storage.local
    const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
    const [pageVisitsResult, tabAggregatesResult, lastAggregationResult] = await Promise.all([
      storage.get('pageVisits'),
      storage.get('tabAggregates'),
      storage.get('lastAggregationTime')
    ]);
    
    const pageVisits = pageVisitsResult.pageVisits || [];
    const tabAggregates = tabAggregatesResult.tabAggregates || [];
    const lastAggregation = lastAggregationResult.lastAggregationTime 
      ? new Date(lastAggregationResult.lastAggregationTime).toLocaleString()
      : 'Never';

    const stats = {
      eventsCount: rawEvents.length,
      visitsCount: pageVisits.length,
      tabsCount: tabAggregates.length,
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
    // Use the refactored aggregator module
    const { triggerAggregation } = self.aggregator;
    
    // Get count before processing
    const { getAllEvents } = self.StorageModule;
    const eventsBefore = await getAllEvents();
    const eventsCountBefore = eventsBefore.length;
    
    // Run aggregation
    const result = await triggerAggregation();
    
    // Store aggregation time
    const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
    await storage.set({
      lastAggregationTime: Date.now()
    });
    
    sendResponse({ 
      success: result?.success || true, 
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
    const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
    const result = await storage.get('lastAggregationTime');
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
 * Gets all page visits from the aggregation storage
 */
async function getAllPageVisits() {
  try {
    console.log('🔍 DEBUG: Getting page visits from chrome.storage.local...');
    // Get from browser.storage.local where aggregation saves them
    const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
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
    const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
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

// Export for browser environment
self.DebugModule = {
  setupDebugMessageHandlers,
  getAllPageVisits,
  getAllTabAggregates
};