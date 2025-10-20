/**
 * IndexedDB Storage Module for HeyHo Extension
 *
 * Handles all interactions with IndexedDB for storing CoreEvent objects.
 * This module provides database initialization and event storage functionality
 * for the browser extension's service worker environment.
 */

const DB_NAME = 'Heyho_EventsDB';
const DB_VERSION = 3;
const EVENTS_STORE = 'events';
const PAGE_VISITS_STORE = 'pageVisits';
const TAB_AGGREGATES_STORE = 'tabAggregates';

let dbInstance = null;

/**
 * Initializes the IndexedDB database
 * @returns {Promise<IDBDatabase>} Promise that resolves with the database instance
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Create events object store if it doesn't exist
      if (oldVersion < 1) {
        const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
        eventsStore.createIndex('timestamp_idx', 'timestamp', { unique: false });
        eventsStore.createIndex('domain_idx', 'domain', { unique: false });
      }

      // Create new object stores for aggregation system
      if (oldVersion < 2) {
        // Create pageVisits store
        const pageVisitsStore = db.createObjectStore(PAGE_VISITS_STORE, { keyPath: 'visitId' });
        pageVisitsStore.createIndex('tabId_idx', 'tabId', { unique: false });
        pageVisitsStore.createIndex('startedAt_idx', 'startedAt', { unique: false });
        pageVisitsStore.createIndex('domain_idx', 'domain', { unique: false });

        // Create tabAggregates store
        const tabAggregatesStore = db.createObjectStore(TAB_AGGREGATES_STORE, { keyPath: 'tabId' });
        tabAggregatesStore.createIndex('createdAt_idx', 'createdAt', { unique: false });
        tabAggregatesStore.createIndex('isOpen_idx', 'isOpen', { unique: false });
      }

      // Version 3: Add category index for categorization feature
      if (oldVersion < 3) {
        const transaction = event.target.transaction;
        const pageVisitsStore = transaction.objectStore(PAGE_VISITS_STORE);

        // Add category index for filtering by category
        if (!pageVisitsStore.indexNames.contains('category_idx')) {
          pageVisitsStore.createIndex('category_idx', 'category', { unique: false });
        }

        console.log('IndexedDB v3: Added category index to pageVisits store');
      }

      console.log('IndexedDB setup complete: created all stores with indexes');
    };
  });
}

/**
 * Adds a CoreEvent object to the database
 * @param {Object} eventObject - The CoreEvent object to store
 * @param {string} eventObject.id - Unique identifier for the event
 * @param {number} eventObject.timestamp - Timestamp in milliseconds
 * @param {string} eventObject.type - Event type (CREATE|ACTIVATE|NAVIGATE|HEARTBEAT|CLOSE)
 * @param {number} eventObject.tabId - Browser tab ID
 * @param {string} eventObject.url - Full URL of the tab
 * @param {string} eventObject.domain - Domain extracted from the URL
 * @returns {Promise<void>} Promise that resolves when the event is stored
 */
async function addEvent(eventObject) {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(EVENTS_STORE);

      const request = store.add(eventObject);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to add event: ${request.error}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
    });
  } catch (error) {
    throw new Error(`Failed to add event to database: ${error.message}`);
  }
}

/**
 * Retrieves events older than the specified age
 * @param {number} maxAgeHours - Maximum age in hours (default: 168 = 7 days)
 * @returns {Promise<Array>} - Array of expired event IDs
 */
async function getExpiredEvents(maxAgeHours = 168) {
  try {
    const db = await initDB();
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENTS_STORE], 'readonly');
      const store = transaction.objectStore(EVENTS_STORE);
      const index = store.index('timestamp_idx');
      const range = IDBKeyRange.upperBound(cutoffTime, false);

      const expiredIds = [];
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          expiredIds.push(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve(expiredIds);
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to query expired events: ${request.error}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
    });
  } catch (error) {
    throw new Error(`Failed to get expired events: ${error.message}`);
  }
}

/**
 * Deletes multiple events by their IDs
 * @param {Array<string>} eventIds - Array of event IDs to delete
 * @returns {Promise<number>} - Number of events successfully deleted
 */
async function deleteEvents(eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return 0;
  }

  try {
    const db = await initDB();
    const BATCH_SIZE = 200;
    let deletedCount = 0;

    // Process deletions in batches to avoid blocking
    for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
      const batch = eventIds.slice(i, i + BATCH_SIZE);
      const batchDeletedCount = await deleteBatch(db, batch);
      deletedCount += batchDeletedCount;
    }

    return deletedCount;
  } catch (error) {
    throw new Error(`Failed to delete events: ${error.message}`);
  }
}

/**
 * Deletes a batch of events by their IDs
 * @private
 * @param {IDBDatabase} db - Database instance
 * @param {Array<string>} eventIds - Array of event IDs to delete
 * @returns {Promise<number>} - Number of events successfully deleted in this batch
 */
function deleteBatch(db, eventIds) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EVENTS_STORE], 'readwrite');
    const store = transaction.objectStore(EVENTS_STORE);

    let deletedCount = 0;
    let completedOperations = 0;
    const totalOperations = eventIds.length;

    if (totalOperations === 0) {
      resolve(0);
      return;
    }

    eventIds.forEach((eventId) => {
      const deleteRequest = store.delete(eventId);

      deleteRequest.onsuccess = () => {
        // The result indicates whether the key existed and was deleted
        if (deleteRequest.result) {
          deletedCount++;
        }
        completedOperations++;

        if (completedOperations === totalOperations) {
          resolve(deletedCount);
        }
      };

      deleteRequest.onerror = () => {
        // Log error but continue with other deletions
        console.warn(`Failed to delete event ${eventId}:`, deleteRequest.error);
        completedOperations++;

        if (completedOperations === totalOperations) {
          resolve(deletedCount);
        }
      };
    });

    transaction.onerror = () => {
      reject(new Error(`Batch delete transaction failed: ${transaction.error}`));
    };
  });
}

/**
 * Clears all events from the events store
 * @returns {Promise<boolean>} - True if successful
 */
async function clearEvents() {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(EVENTS_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All events cleared from IndexedDB');
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear events: ${request.error}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
    });
  } catch (error) {
    console.error('Failed to clear events:', error);
    return false;
  }
}

/**
 * Gets all events from the events store, sorted by timestamp
 * @returns {Promise<Array>} - Array of all events
 */
async function getAllEvents() {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENTS_STORE], 'readonly');
      const store = transaction.objectStore(EVENTS_STORE);
      const index = store.index('timestamp_idx');

      const events = [];
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all events: ${request.error}`));
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
    });
  } catch (error) {
    throw new Error(`Failed to get all events: ${error.message}`);
  }
}

/**
 * Executes multiple operations in a single transaction
 * @param {Array} operations - Array of {type, data} operations
 * @returns {Promise<void>}
 */
async function executeTransaction(operations) {
  try {
    const db = await initDB();
    const stores = [EVENTS_STORE, PAGE_VISITS_STORE, TAB_AGGREGATES_STORE];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(stores, 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
      transaction.onabort = () => reject(new Error('Transaction was aborted'));

      // Execute all operations within the transaction
      for (const operation of operations) {
        const { type, storeName, data, key } = operation;
        const store = transaction.objectStore(storeName);

        switch (type) {
          case 'put':
            store.put(data);
            break;
          case 'delete':
            store.delete(key || data);
            break;
          default:
            throw new Error(`Unknown operation type: ${type}`);
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to execute transaction: ${error.message}`);
  }
}

/**
 * Gets count of page visits
 * @returns {Promise<number>} - Number of page visits
 */
async function getPageVisitsCount() {
  try {
    const { initDB } = self.StorageModule || { initDB };
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PAGE_VISITS_STORE], 'readonly');
      const store = transaction.objectStore(PAGE_VISITS_STORE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(new Error(`Failed to count page visits: ${request.error}`));
      transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
    });
  } catch (error) {
    throw new Error(`Failed to get page visits count: ${error.message}`);
  }
}

/**
 * Gets all tab aggregates for processing
 * @returns {Promise<Array>} - Array of all tab aggregates
 */
async function getTabAggregatesForProcessing() {
  try {
    const { initDB } = self.StorageModule || { initDB };
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
    throw new Error(`Failed to get tab aggregates for processing: ${error.message}`);
  }
}

/**
 * Gets count of tab aggregates
 * @returns {Promise<number>} - Number of tab aggregates
 */
async function getTabAggregatesCount() {
  try {
    const { initDB } = self.StorageModule || { initDB };
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TAB_AGGREGATES_STORE], 'readonly');
      const store = transaction.objectStore(TAB_AGGREGATES_STORE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(new Error(`Failed to count tab aggregates: ${request.error}`));
      transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
    });
  } catch (error) {
    throw new Error(`Failed to get tab aggregates count: ${error.message}`);
  }
}

/**
 * Reset the cached database instance (for testing purposes)
 * @private
 */
function __resetInstance() {
  dbInstance = null;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    initDB,
    addEvent,
    getExpiredEvents,
    deleteEvents,
    getAllEvents,
    executeTransaction,
    getPageVisitsCount,
    getTabAggregatesCount,
    getTabAggregatesForProcessing,
    EVENTS_STORE,
    PAGE_VISITS_STORE,
    TAB_AGGREGATES_STORE,
    __resetInstance,
  };
} else {
  // Browser environment - attach to global scope
  self.StorageModule = {
    initDB,
    addEvent,
    getExpiredEvents,
    deleteEvents,
    clearEvents,
    getAllEvents,
    executeTransaction,
    getPageVisitsCount,
    getTabAggregatesCount,
    getTabAggregatesForProcessing,
    EVENTS_STORE,
    PAGE_VISITS_STORE,
    TAB_AGGREGATES_STORE,
    __resetInstance,
  };
}
