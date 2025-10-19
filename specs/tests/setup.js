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
    this.oncomplete = null;
    this.onabort = null;
    this._stores = new Map();
    this._completed = false;
    
    // Auto-complete transaction after a short delay (simulate real behavior)
    setTimeout(() => {
      if (!this._completed && this.oncomplete) {
        this._completed = true;
        this.oncomplete({ target: this });
      }
    }, 10);
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

  _abort() {
    this._completed = true;
    if (this.onabort) {
      this.onabort({ target: this });
    }
  }
}

class MockIDBIndex {
  constructor(name, keyPath, objectStore) {
    this.name = name;
    this.keyPath = keyPath;
    this._objectStore = objectStore;
  }

  openCursor(range) {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      try {
        const allEntries = Array.from(this._objectStore._data.entries());
        let filteredEntries = allEntries;
        
        // Apply range filter if provided
        if (range && range.upper !== undefined) {
          filteredEntries = allEntries.filter(([_key, value]) => {
            const indexValue = value[this.keyPath];
            return indexValue <= range.upper;
          });
        }
        
        let currentIndex = 0;
        
        const cursor = {
          get primaryKey() {
            return currentIndex < filteredEntries.length ? filteredEntries[currentIndex][0] : null;
          },
          get value() {
            return currentIndex < filteredEntries.length ? filteredEntries[currentIndex][1] : null;
          },
          continue() {
            currentIndex++;
            setTimeout(() => {
              if (currentIndex < filteredEntries.length) {
                request._succeed(cursor);
              } else {
                request._succeed(null);
              }
            }, 0);
          }
        };
        
        if (filteredEntries.length > 0) {
          request._succeed(cursor);
        } else {
          request._succeed(null);
        }
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
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

  put(value) {
    const request = new MockIDBRequest();
    
    // Simulate async operation
    setTimeout(() => {
      try {
        if (this.keyPath && value[this.keyPath]) {
          const key = value[this.keyPath];
          this._data.set(key, value); // put allows overwriting
          request._succeed(key);
        } else {
          request._fail(new Error('Invalid key'));
        }
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }

  get(key) {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      try {
        const value = this._data.get(key);
        request._succeed(value);
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }

  getAll() {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      try {
        const values = Array.from(this._data.values());
        request._succeed(values);
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }

  count() {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      try {
        const count = this._data.size;
        request._succeed(count);
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }

  delete(key) {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      try {
        const existed = this._data.has(key);
        this._data.delete(key); // Delete regardless (IndexedDB behavior)
        request._succeed(existed); // Return whether the key existed
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }

  index(name) {
    const indexInfo = this._indexes.get(name);
    if (!indexInfo) {
      throw new Error(`Index '${name}' does not exist`);
    }
    return new MockIDBIndex(name, indexInfo.keyPath, this);
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

  _triggerUpgrade(db, oldVersion = 0, newVersion = 1) {
    if (this.onupgradeneeded) {
      this.onupgradeneeded({ 
        target: { result: db }, 
        currentTarget: { result: db },
        oldVersion,
        newVersion
      });
    }
  }
}

// Mock IndexedDB implementation
const mockIndexedDB = {
  _databases: new Map(), // Track database versions
  
  open(name, version) {
    const request = new MockIDBOpenDBRequest();
    
    // Simulate async database opening
    setTimeout(() => {
      try {
        const currentVersion = this._databases.get(name) || 0;
        const db = new MockIDBDatabase(name, version || 1);
        
        // Trigger upgrade if version is higher than current
        if ((version || 1) > currentVersion) {
          request._triggerUpgrade(db, currentVersion, version || 1);
        }
        
        // Update stored version
        this._databases.set(name, version || 1);
        
        request._succeed(db);
      } catch (error) {
        request._fail(error);
      }
    }, 0);
    
    return request;
  }
};

// Mock IDBKeyRange
const mockIDBKeyRange = {
  upperBound(upper, open = false) {
    return {
      upper,
      upperOpen: open,
      lower: undefined,
      lowerOpen: false
    };
  },
  lowerBound(lower, open = false) {
    return {
      upper: undefined,
      upperOpen: false,
      lower,
      lowerOpen: open
    };
  },
  bound(lower, upper, lowerOpen = false, upperOpen = false) {
    return {
      upper,
      upperOpen,
      lower,
      lowerOpen
    };
  },
  only(value) {
    return {
      upper: value,
      upperOpen: false,
      lower: value,
      lowerOpen: false
    };
  }
};

// Set up global IndexedDB mock
global.indexedDB = mockIndexedDB;
global.IDBKeyRange = mockIDBKeyRange;

// Clean up mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  if (chrome.flush) {
    chrome.flush();
  }
  
  // Reset IndexedDB state between tests
  mockIndexedDB._databases.clear();
});