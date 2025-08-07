/**
 * IndexedDB Storage Module for HeyHo Extension
 * 
 * Handles all interactions with IndexedDB for storing CoreEvent objects.
 * This module provides database initialization and event storage functionality
 * for the browser extension's service worker environment.
 */

const DB_NAME = 'Heyho_EventsDB';
const DB_VERSION = 1;
const STORE_NAME = 'events';

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
      
      // Create the events object store with 'id' as keyPath
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      
      // Create indexes for efficient querying
      store.createIndex('timestamp_idx', 'timestamp', { unique: false });
      store.createIndex('domain_idx', 'domain', { unique: false });
      
      console.log('IndexedDB setup complete: created events store with indexes');
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
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
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
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
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
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
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
 * Reset the cached database instance (for testing purposes)
 * @private
 */
function __resetInstance() {
  dbInstance = null;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = { initDB, addEvent, getExpiredEvents, deleteEvents, __resetInstance };
} else {
  // Browser environment - attach to global scope
  self.StorageModule = { initDB, addEvent, getExpiredEvents, deleteEvents, __resetInstance };
}