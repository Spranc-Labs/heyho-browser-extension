/**
 * Aggregation Module for HeyHo Extension
 * 
 * Implements a two-tiered aggregation system that processes raw CoreEvents
 * into structured pageVisits and tabAggregates records.
 * 
 * This module runs periodically via chrome.alarms to batch process events
 * and maintain state across service worker restarts.
 */

const ALARM_NAME = 'aggregate';
const ALARM_INTERVAL_MINUTES = 5;
const ACTIVE_VISIT_STORAGE_KEY = 'activeVisit';

/**
 * Initializes the aggregation system
 * Sets up the periodic alarm for processing events
 */
async function initAggregator() {
  try {
    // Create the alarm if it doesn't exist
    const existingAlarm = await chrome.alarms.get(ALARM_NAME);
    if (!existingAlarm) {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: ALARM_INTERVAL_MINUTES,
        periodInMinutes: ALARM_INTERVAL_MINUTES
      });
      console.log(
        `Aggregator alarm created: ${ALARM_NAME} every ${ALARM_INTERVAL_MINUTES} minutes`
      );
    }

    // Set up alarm listener
    chrome.alarms.onAlarm.addListener(handleAlarm);
    
  } catch (error) {
    console.error('Failed to initialize aggregator:', error);
  }
}

/**
 * Handles alarm events - triggers the aggregation process
 * @param {chrome.alarms.Alarm} alarm - The alarm that triggered
 */
async function handleAlarm(alarm) {
  if (alarm.name === ALARM_NAME) {
    await processEvents();
  }
}

/**
 * Main aggregation function - processes all events in a single batch
 * This is the heart of the aggregation system
 */
async function processEvents() {
  const startTime = Date.now();
  
  try {
    console.log('Starting event aggregation process...');
    
    // Step 1: Get all events sorted by timestamp
    const { getAllEvents } = self.StorageModule;
    const events = await getAllEvents();
    
    if (events.length === 0) {
      console.log('No events to process');
      return;
    }
    
    console.log(`Processing ${events.length} events...`);
    
    // Step 2: Sort events chronologically
    events.sort((a, b) => a.timestamp - b.timestamp);
    
    // Step 3: Load current state
    const activeVisit = await getActiveVisit();
    
    // Step 4: Process events sequentially
    const operations = [];
    const processedEventIds = [];
    let currentActiveVisit = activeVisit;
    
    for (const event of events) {
      const result = processEvent(event, currentActiveVisit, operations);
      currentActiveVisit = result.activeVisit;
      processedEventIds.push(event.id);
    }
    
    // Step 5: Save new active visit state
    setActiveVisit(currentActiveVisit);
    
    // Step 6: Execute all operations in a single transaction
    if (operations.length > 0) {
      // Add delete operations for processed events
      for (const eventId of processedEventIds) {
        operations.push({
          type: 'delete',
          storeName: self.StorageModule.EVENTS_STORE,
          key: eventId
        });
      }
      
      const { executeTransaction } = self.StorageModule;
      await executeTransaction(operations);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Aggregation complete: processed ${events.length} events in ${duration}ms`);
    
  } catch (error) {
    console.error('Aggregation process failed:', error);
  }
}

/**
 * Processes a single event and updates the operations queue
 * @param {Object} event - The CoreEvent to process
 * @param {Object|null} activeVisit - Current active visit state
 * @param {Array} operations - Array to collect database operations
 * @returns {Object} - Updated active visit state
 */
function processEvent(event, activeVisit, operations) {
  const { type } = event;
  
  switch (type) {
  case 'CREATE':
    return processCreateEvent(event, activeVisit, operations);
    
  case 'ACTIVATE':
    return processActivateEvent(event, activeVisit, operations);
    
  case 'NAVIGATE':
    return processNavigateEvent(event, activeVisit, operations);
    
  case 'CLOSE':
    return processCloseEvent(event, activeVisit, operations);
    
  case 'HEARTBEAT':
    // Heartbeat events don't change aggregation state
    return { activeVisit };
    
  default:
    console.warn(`Unknown event type: ${type}`);
    return { activeVisit };
  }
}

/**
 * Processes CREATE events - creates new tab aggregate
 */
function processCreateEvent(event, activeVisit, operations) {
  const { tabId, url, timestamp } = event;
  
  // Create new tab aggregate
  const tabAggregate = {
    tabId,
    isOpen: true,
    createdAt: timestamp,
    closedAt: null,
    initialUrl: url,
    lastUrl: url,
    totalActiveSeconds: 0,
    navigationCount: 0,
    openedByTabId: null, // TODO: Extract from openerTabId if available
    openedTabs: []
  };
  
  operations.push({
    type: 'put',
    storeName: self.StorageModule.TAB_AGGREGATES_STORE,
    data: tabAggregate
  });
  
  return { activeVisit };
}

/**
 * Processes ACTIVATE events - ends previous visit and starts new one
 */
async function processActivateEvent(event, activeVisit, operations) {
  const { tabId, url, timestamp } = event;
  
  // End previous visit if there was one
  if (activeVisit) {
    await endPageVisit(activeVisit, timestamp, operations);
  }
  
  // Start new page visit
  const visitId = `pv_${timestamp}_${tabId}`;
  const pageVisit = {
    visitId,
    tabId,
    url,
    domain: extractDomain(url),
    startedAt: timestamp,
    endedAt: null,
    durationSeconds: null
  };
  
  operations.push({
    type: 'put',
    storeName: self.StorageModule.PAGE_VISITS_STORE,
    data: pageVisit
  });
  
  return { activeVisit: { tabId, visitId } };
}

/**
 * Processes NAVIGATE events - ends current visit and starts new one for same tab
 */
async function processNavigateEvent(event, activeVisit, operations) {
  const { tabId, url, timestamp } = event;
  
  // End current visit for this tab if it's the active tab
  if (activeVisit && activeVisit.tabId === tabId) {
    await endPageVisit(activeVisit, timestamp, operations);
  }
  
  // Start new page visit
  const visitId = `pv_${timestamp}_${tabId}`;
  const pageVisit = {
    visitId,
    tabId,
    url,
    domain: extractDomain(url),
    startedAt: timestamp,
    endedAt: null,
    durationSeconds: null
  };
  
  operations.push({
    type: 'put',
    storeName: self.StorageModule.PAGE_VISITS_STORE,
    data: pageVisit
  });
  
  // Update tab aggregate
  const tabAggregate = await getOrCreateTabAggregate(tabId, url, timestamp);
  tabAggregate.lastUrl = url;
  tabAggregate.navigationCount += 1;
  
  operations.push({
    type: 'put',
    storeName: self.StorageModule.TAB_AGGREGATES_STORE,
    data: tabAggregate
  });
  
  // Update active visit if this was the active tab
  const newActiveVisit = (activeVisit && activeVisit.tabId === tabId) 
    ? { tabId, visitId }
    : activeVisit;
    
  return { activeVisit: newActiveVisit };
}

/**
 * Processes CLOSE events - ends final visit and closes tab aggregate
 */
async function processCloseEvent(event, activeVisit, operations) {
  const { tabId, timestamp } = event;
  
  // End current visit for this tab if it's the active tab
  if (activeVisit && activeVisit.tabId === tabId) {
    await endPageVisit(activeVisit, timestamp, operations);
  }
  
  // Update tab aggregate to closed
  const tabAggregate = await getOrCreateTabAggregate(tabId, '', timestamp);
  tabAggregate.isOpen = false;
  tabAggregate.closedAt = timestamp;
  
  operations.push({
    type: 'put',
    storeName: self.StorageModule.TAB_AGGREGATES_STORE,
    data: tabAggregate
  });
  
  // Clear active visit if this was the active tab
  const newActiveVisit = (activeVisit && activeVisit.tabId === tabId) 
    ? null 
    : activeVisit;
    
  return { activeVisit: newActiveVisit };
}

/**
 * Ends a page visit by setting endedAt and calculating duration
 */
async function endPageVisit(activeVisit, endTimestamp, operations) {
  if (!activeVisit) {return;}
  
  const { visitId, tabId } = activeVisit;
  
  // We need to get the current page visit to calculate duration
  // For now, we'll assume the visit started at the timestamp in visitId
  const startTimestamp = parseInt(visitId.split('_')[1]);
  const durationSeconds = Math.round((endTimestamp - startTimestamp) / 1000);
  
  // Create updated page visit
  const pageVisit = {
    visitId,
    tabId,
    url: '', // We'll need to track this in state or look it up
    domain: '',
    startedAt: startTimestamp,
    endedAt: endTimestamp,
    durationSeconds: Math.max(0, durationSeconds)
  };
  
  operations.push({
    type: 'put',
    storeName: self.StorageModule.PAGE_VISITS_STORE,
    data: pageVisit
  });
  
  // Update tab aggregate's total active seconds
  const tabAggregate = await getOrCreateTabAggregate(tabId, '', endTimestamp);
  tabAggregate.totalActiveSeconds = (tabAggregate.totalActiveSeconds || 0) + 
    Math.max(0, durationSeconds);
  
  operations.push({
    type: 'put',
    storeName: self.StorageModule.TAB_AGGREGATES_STORE,
    data: tabAggregate
  });
}

/**
 * Gets existing tab aggregate or creates a minimal one
 */
async function getOrCreateTabAggregate(tabId, url, timestamp) {
  try {
    const { getTabAggregate } = self.StorageModule;
    const existing = await getTabAggregate(tabId);
    
    if (existing) {
      return existing;
    }
    
    // Create minimal tab aggregate if doesn't exist
    return {
      tabId,
      isOpen: true,
      createdAt: timestamp,
      closedAt: null,
      initialUrl: url,
      lastUrl: url,
      totalActiveSeconds: 0,
      navigationCount: 0,
      openedByTabId: null,
      openedTabs: []
    };
  } catch (error) {
    console.error('Error getting tab aggregate:', error);
    // Return minimal aggregate as fallback
    return {
      tabId,
      isOpen: true,
      createdAt: timestamp,
      closedAt: null,
      initialUrl: url,
      lastUrl: url,
      totalActiveSeconds: 0,
      navigationCount: 0,
      openedByTabId: null,
      openedTabs: []
    };
  }
}

/**
 * Gets the current active visit state from chrome.storage.local
 */
async function getActiveVisit() {
  try {
    const result = await chrome.storage.local.get(ACTIVE_VISIT_STORAGE_KEY);
    return result[ACTIVE_VISIT_STORAGE_KEY] || null;
  } catch (error) {
    console.error('Failed to get active visit:', error);
    return null;
  }
}

/**
 * Sets the current active visit state in chrome.storage.local
 */
function setActiveVisit(activeVisit) {
  try {
    if (activeVisit) {
      chrome.storage.local.set({ [ACTIVE_VISIT_STORAGE_KEY]: activeVisit });
    } else {
      chrome.storage.local.remove(ACTIVE_VISIT_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to set active visit:', error);
  }
}

/**
 * Extracts domain from URL using the existing events module logic
 */
function extractDomain(url) {
  try {
    if (!url) {return '';}
    
    // Handle special chrome URLs and about: URLs
    if (url.startsWith('chrome://') || url.startsWith('about:') || 
        url.startsWith('moz-extension://') || url.startsWith('chrome-extension://')) {
      return url.split('/')[2] || url;
    }
    
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url || '';
  }
}

/**
 * Manual trigger for processing events (for testing/debugging)
 */
async function triggerAggregation() {
  console.log('Manual aggregation trigger...');
  await processEvents();
}

// Export for browser environment
self.AggregatorModule = {
  initAggregator,
  processEvents,
  triggerAggregation
};