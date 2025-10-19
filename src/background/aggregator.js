/**
 * Aggregation Module for Browser Extension
 * 
 * Handles event aggregation with clean separation of concerns
 */

// Configuration
const AGGREGATION_CONFIG = {
  alarmName: 'aggregate',
  intervalMinutes: 5,
  batchSize: 10
};

// Module instances
let storage = null;
let processor = null;

/**
 * Initialize the aggregation system
 */
async function initAggregator() {
  try {
    // Initialize modules
    storage = new self.AggregationStorage();
    processor = new self.EventProcessor(storage);
    
    // Set up periodic processing
    await setupPeriodicProcessing();
    setupAlarmListener();
    
    console.log('Aggregation system initialized');
  } catch (error) {
    console.error('Failed to initialize aggregator:', error);
  }
}

/**
 * Set up periodic alarm for aggregation
 */
async function setupPeriodicProcessing() {
  const existingAlarm = await chrome.alarms.get(AGGREGATION_CONFIG.alarmName);
  
  if (!existingAlarm) {
    chrome.alarms.create(AGGREGATION_CONFIG.alarmName, {
      delayInMinutes: AGGREGATION_CONFIG.intervalMinutes,
      periodInMinutes: AGGREGATION_CONFIG.intervalMinutes
    });
    
    console.log(`Aggregation alarm created: every ${AGGREGATION_CONFIG.intervalMinutes} minutes`);
  }
}

/**
 * Set up alarm listener
 */
function setupAlarmListener() {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === AGGREGATION_CONFIG.alarmName) {
      await processEvents();
    }
  });
}

/**
 * Process all pending events
 */
async function processEvents() {
  if (!processor) {
    console.error('Processor not initialized');
    return { success: false, error: 'Not initialized' };
  }
  
  try {
    const result = await processor.processAllEvents();
    
    // Store aggregation timestamp for debug panel
    if (result.success) {
      const storage = (typeof browser !== 'undefined' ? 
        browser.storage.local : chrome.storage.local);
      await storage.set({
        lastAggregationTime: Date.now()
      });
      console.log('Aggregation completed and timestamp stored');
    }
    
    return result;
  } catch (error) {
    console.error('Error in processEvents:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add an event to the queue
 */
async function addEvent(event) {
  if (!storage) {
    console.error('Storage not initialized');
    return { success: false, error: 'Not initialized' };
  }
  
  try {
    // Add event ID and timestamp if missing
    if (!event.id) {
      event.id = `${event.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    
    // Store event
    await storage.addEvent(event);
    
    // Check if we should process batch
    const events = await storage.getEvents();
    if (events.length >= AGGREGATION_CONFIG.batchSize) {
      return await processEvents();
    }
    
    return { 
      success: true, 
      queued: true, 
      queueSize: events.length 
    };
  } catch (error) {
    console.error('Failed to add event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get aggregation statistics
 */
async function getStatistics() {
  if (!storage) {
    return { error: 'Not initialized' };
  }
  
  return await storage.getStatistics();
}

/**
 * Export all data
 */
async function exportData() {
  if (!storage) {
    return { error: 'Not initialized' };
  }
  
  return await storage.exportData();
}

/**
 * Clear all data
 */
async function clearAllData() {
  if (!storage) {
    return false;
  }
  
  return await storage.clearAll();
}

/**
 * Manual trigger for aggregation (for testing)
 */
async function triggerAggregation() {
  console.log('Manual aggregation triggered');
  return await processEvents();
}

// Export the aggregation API
self.aggregator = {
  init: initAggregator,
  processEvents,
  addEvent,
  getStatistics,
  exportData,
  clearAllData,
  triggerAggregation
};

// Auto-initialize if this is the main aggregator module
if (typeof self.aggregatorInitialized === 'undefined') {
  self.aggregatorInitialized = true;
  initAggregator();
}