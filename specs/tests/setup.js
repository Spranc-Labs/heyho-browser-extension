/**
 * Jest Test Setup
 * Sets up mocks for browser APIs and IndexedDB for testing environment
 */

// Import jest-chrome for browser API mocks
const chrome = require('jest-chrome');

// Set up global browser API mocks
global.chrome = chrome;
global.browser = chrome;

// Mock importScripts for service worker environment
global.importScripts = jest.fn();

// Mock self object for service worker context
global.self = global;

/**
 * IndexedDB Mock Implementation
 * Provides a simplified mock of IndexedDB API for testing
 */
class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 'pending';
    this.onsuccess = null;
    this.onerror = null;
  }

  _succeed(result) {
    this.result = result;
    this.readyState = 'done';
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  _fail(error) {
    this.error = error;
    this.readyState = 'done';
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class MockIDBTransaction {
  constructor(stores, mode) {
    this.objectStoreNames = stores;
    this.mode = mode;
    this.error = null;
    this.onerror = null;
    this._stores = new Map();
  }

  objectStore(name) {
    if (!this._stores.has(name)) {
      this._stores.set(name, new MockIDBObjectStore(name));
    }
    return this._stores.get(name);
  }

  _fail(error) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class MockIDBObjectStore {
  constructor(name) {
    this.name = name;
    this.keyPath = null;
    this._data = new Map();
    this._indexes = new Map();
  }

  add(value) {
    const request = new MockIDBRequest();
    
    // Simulate async operation
    setTimeout(() => {
      try {
        if (this.keyPath && value[this.keyPath]) {
          const key = value[this.keyPath];
          if (this._data.has(key)) {
            request._fail(new Error('Key already exists'));
          } else {
            this._data.set(key, value);
            request._succeed(key);
          }
        } else {
          request._fail(new Error('Invalid key'));
        }
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }

  createIndex(name, keyPath, options = {}) {
    this._indexes.set(name, { keyPath, options });
  }

  get indexNames() {
    return Array.from(this._indexes.keys());
  }
}

class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this._stores = new Map();
  }

  createObjectStore(name, options = {}) {
    const store = new MockIDBObjectStore(name);
    if (options.keyPath) {
      store.keyPath = options.keyPath;
    }
    this._stores.set(name, store);
    return store;
  }

  transaction(storeNames, mode = 'readonly') {
    const storeNamesArray = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = new MockIDBTransaction(storeNamesArray, mode);
    // Link the transaction to existing stores
    storeNamesArray.forEach(storeName => {
      if (this._stores.has(storeName)) {
        transaction._stores.set(storeName, this._stores.get(storeName));
      }
    });
    return transaction;
  }

  close() {
    // Mock implementation
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  constructor() {
    super();
    this.onupgradeneeded = null;
  }

  _triggerUpgrade(db) {
    if (this.onupgradeneeded) {
      this.onupgradeneeded({ target: { result: db }, currentTarget: { result: db } });
    }
  }
}

// Mock IndexedDB implementation
const mockIndexedDB = {
  open(name, version) {
    const request = new MockIDBOpenDBRequest();
    
    // Simulate async database opening
    setTimeout(() => {
      try {
        const db = new MockIDBDatabase(name, version);
        
        // Trigger upgrade if needed (simulate first-time creation)
        if (version && version > 0) {
          request._triggerUpgrade(db);
        }
        
        request._succeed(db);
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }
};

// Set up global IndexedDB mock
global.indexedDB = mockIndexedDB;
global.IDBKeyRange = {};

// Clean up mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  if (chrome.flush) {
    chrome.flush();
  }
});