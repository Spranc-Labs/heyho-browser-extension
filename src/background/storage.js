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
async function initDB() {
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

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = { initDB, addEvent };
} else {
  // Browser environment - attach to global scope
  self.StorageModule = { initDB, addEvent };
}