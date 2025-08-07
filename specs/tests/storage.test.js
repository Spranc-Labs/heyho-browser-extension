/**
 * Unit Tests for storage.js
 * Tests for IndexedDB initialization and event storage functionality
 */

// Import the storage module
const storageModule = require('../../src/background/storage.js');
const { initDB, addEvent } = storageModule;

describe('Storage Module Unit Tests', () => {
  
  beforeEach(() => {
    // Clear any cached database instances
    jest.clearAllMocks();
    // Reset module state by clearing the cached db instance
    storageModule.__resetInstance();
  });

  describe('initDB() Function Tests', () => {
    
    test('Test 1.1.1: Should request to open database with correct name and version', async () => {
      const openSpy = jest.spyOn(indexedDB, 'open');
      
      await initDB();
      
      expect(openSpy).toHaveBeenCalledWith('Heyho_EventsDB', 1);
    });

    test('Test 1.1.2: Should set up events object store with correct indexes', async () => {
      const db = await initDB();
      
      // Verify database was created
      expect(db).toBeTruthy();
      expect(db.name).toBe('Heyho_EventsDB');
      expect(db.version).toBe(1);
      
      // Verify the events store was created during setup
      expect(db._stores.has('events')).toBe(true);
      
      const eventsStore = db._stores.get('events');
      expect(eventsStore.name).toBe('events');
      expect(eventsStore.keyPath).toBe('id');
      expect(eventsStore.indexNames).toContain('timestamp_idx');
      expect(eventsStore.indexNames).toContain('domain_idx');
    });

    test('Test 1.1.3: Should resolve with database instance on success', async () => {
      const db = await initDB();
      
      expect(db).toBeTruthy();
      expect(db.name).toBe('Heyho_EventsDB');
      expect(db.version).toBe(1);
    });

    test('Test 1.1.4: Should reject promise on database connection failure', async () => {
      // Mock a failing database open
      const originalOpen = indexedDB.open;
      indexedDB.open = jest.fn(() => {
        const request = { 
          onerror: null, 
          onsuccess: null,
          onupgradeneeded: null 
        };
        
        setTimeout(() => {
          request.error = new Error('Database connection failed');
          if (request.onerror) {
            request.onerror();
          }
        }, 0);
        
        return request;
      });

      await expect(initDB()).rejects.toThrow('Failed to open database');
      
      // Restore original implementation
      indexedDB.open = originalOpen;
    });

    test('Test 1.1.5: Should return cached instance on subsequent calls', async () => {
      const openSpy = jest.spyOn(indexedDB, 'open');
      
      // First call
      const db1 = await initDB();
      expect(openSpy).toHaveBeenCalledTimes(1);
      
      // Second call should return the same instance without calling open again
      const db2 = await initDB();
      expect(openSpy).toHaveBeenCalledTimes(1); // Still only called once
      
      expect(db1).toBe(db2);
    });
  });

  describe('addEvent() Function Tests', () => {
    
    let testEvent;
    
    beforeEach(() => {
      testEvent = {
        id: 'evt_1678886400000_test',
        timestamp: 1678886400000,
        type: 'CREATE',
        tabId: 123,
        url: 'https://www.example.com/test',
        domain: 'www.example.com'
      };
    });

    test('Test 1.2.1: Should successfully add a valid CoreEvent object', async () => {
      await expect(addEvent(testEvent)).resolves.not.toThrow();
    });

    test('Test 1.2.2: Should create transaction in readwrite mode', async () => {
      const db = await initDB();
      const transactionSpy = jest.spyOn(db, 'transaction');
      
      await addEvent(testEvent);
      
      expect(transactionSpy).toHaveBeenCalledWith(['events'], 'readwrite');
    });

    test('Test 1.2.3: Should reject if add request fails', async () => {
      // Create an event with duplicate ID to trigger add failure
      await addEvent(testEvent); // First add should succeed
      
      // Second add with same ID should fail
      await expect(addEvent(testEvent)).rejects.toThrow('Failed to add event');
    });

    test('Test 1.2.4: Should reject if transaction fails', async () => {
      const db = await initDB();
      
      // Mock transaction to fail
      const originalTransaction = db.transaction;
      db.transaction = jest.fn(() => {
        const mockTransaction = {
          objectStore: jest.fn(() => ({
            add: jest.fn(() => ({
              onsuccess: null,
              onerror: null
            }))
          })),
          onerror: null
        };
        
        // Simulate transaction failure
        setTimeout(() => {
          mockTransaction.error = new Error('Transaction failed');
          if (mockTransaction.onerror) {
            mockTransaction.onerror();
          }
        }, 0);
        
        return mockTransaction;
      });

      await expect(addEvent(testEvent)).rejects.toThrow('Transaction failed');
      
      // Restore original implementation
      db.transaction = originalTransaction;
    });

    test('Should handle event with all required CoreEvent properties', async () => {
      const completeEvent = {
        id: 'evt_1678886400001_complete',
        timestamp: 1678886400001,
        type: 'NAVIGATE',
        tabId: 456,
        url: 'https://github.com/test/repo',
        domain: 'github.com'
      };
      
      await expect(addEvent(completeEvent)).resolves.not.toThrow();
    });

    test('Should handle different event types', async () => {
      const eventTypes = ['CREATE', 'ACTIVATE', 'NAVIGATE', 'HEARTBEAT', 'CLOSE'];
      
      for (const type of eventTypes) {
        const event = {
          ...testEvent,
          id: `evt_${Date.now()}_${type.toLowerCase()}`,
          type
        };
        
        await expect(addEvent(event)).resolves.not.toThrow();
      }
    });
  });

  describe('Integration Tests', () => {
    
    test('Should initialize database and add multiple events', async () => {
      const events = [
        {
          id: 'evt_1678886400000_1',
          timestamp: 1678886400000,
          type: 'CREATE',
          tabId: 1,
          url: 'https://example.com',
          domain: 'example.com'
        },
        {
          id: 'evt_1678886400001_2',
          timestamp: 1678886400001,
          type: 'ACTIVATE',
          tabId: 2,
          url: 'https://github.com',
          domain: 'github.com'
        },
        {
          id: 'evt_1678886400002_3',
          timestamp: 1678886400002,
          type: 'CLOSE',
          tabId: 1,
          url: 'https://example.com',
          domain: 'example.com'
        }
      ];
      
      // Add all events
      for (const event of events) {
        await expect(addEvent(event)).resolves.not.toThrow();
      }
    });
  });
});