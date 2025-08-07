/**
 * Unit Tests for storage.js
 * Tests for IndexedDB initialization and event storage functionality
 */

// Import the storage module
const storageModule = require('../../src/background/storage.js');
const { initDB, addEvent, getExpiredEvents, deleteEvents } = storageModule;

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

  describe('getExpiredEvents() Function Tests', () => {
    
    let currentTime;
    let oldEvents, recentEvents;
    
    beforeEach(async () => {
      currentTime = Date.now();
      
      // Create test events - some old, some recent
      oldEvents = [
        {
          id: 'evt_old_1',
          timestamp: currentTime - (8 * 24 * 60 * 60 * 1000), // 8 days old
          type: 'CREATE',
          tabId: 1,
          url: 'https://example.com',
          domain: 'example.com'
        },
        {
          id: 'evt_old_2',
          timestamp: currentTime - (10 * 24 * 60 * 60 * 1000), // 10 days old
          type: 'NAVIGATE',
          tabId: 2,
          url: 'https://github.com',
          domain: 'github.com'
        }
      ];
      
      recentEvents = [
        {
          id: 'evt_recent_1',
          timestamp: currentTime - (2 * 24 * 60 * 60 * 1000), // 2 days old
          type: 'ACTIVATE',
          tabId: 3,
          url: 'https://test.com',
          domain: 'test.com'
        },
        {
          id: 'evt_recent_2',
          timestamp: currentTime - (1 * 60 * 60 * 1000), // 1 hour old
          type: 'CLOSE',
          tabId: 4,
          url: 'https://new.com',
          domain: 'new.com'
        }
      ];
      
      // Add all test events
      const allEvents = [...oldEvents, ...recentEvents];
      for (const event of allEvents) {
        await addEvent(event);
      }
    });

    test('Test 1.3.1: Should return expired event IDs with default TTL (168 hours)', async () => {
      const expiredIds = await getExpiredEvents();
      
      expect(expiredIds).toHaveLength(2);
      expect(expiredIds).toContain('evt_old_1');
      expect(expiredIds).toContain('evt_old_2');
      expect(expiredIds).not.toContain('evt_recent_1');
      expect(expiredIds).not.toContain('evt_recent_2');
    });

    test('Test 1.3.2: Should return expired event IDs with custom TTL', async () => {
      // Set TTL to 3 days (72 hours) - should include 8-day and 10-day old events
      const expiredIds = await getExpiredEvents(72);
      
      expect(expiredIds).toHaveLength(2);
      expect(expiredIds).toContain('evt_old_1');
      expect(expiredIds).toContain('evt_old_2');
    });

    test('Test 1.3.3: Should return empty array when no events are expired', async () => {
      // Set TTL to 15 days - no events should be expired
      const expiredIds = await getExpiredEvents(15 * 24);
      
      expect(expiredIds).toHaveLength(0);
      expect(Array.isArray(expiredIds)).toBe(true);
    });

    test('Test 1.3.4: Should use timestamp index for efficient querying', async () => {
      const db = await initDB();
      const transactionSpy = jest.spyOn(db, 'transaction');
      
      await getExpiredEvents();
      
      expect(transactionSpy).toHaveBeenCalledWith(['events'], 'readonly');
    });

    test('Test 1.3.5: Should handle database errors gracefully', async () => {
      // Mock a database error
      const db = await initDB();
      const originalTransaction = db.transaction;
      db.transaction = jest.fn(() => {
        const mockTransaction = {
          objectStore: jest.fn(() => ({
            index: jest.fn(() => ({
              openCursor: jest.fn(() => ({
                onsuccess: null,
                onerror: null
              }))
            }))
          })),
          onerror: null
        };
        
        setTimeout(() => {
          mockTransaction.error = new Error('Database error');
          if (mockTransaction.onerror) {
            mockTransaction.onerror();
          }
        }, 0);
        
        return mockTransaction;
      });

      await expect(getExpiredEvents()).rejects.toThrow('Transaction failed');
      
      db.transaction = originalTransaction;
    });
  });

  describe('deleteEvents() Function Tests', () => {
    
    let testEvents;
    
    beforeEach(async () => {
      testEvents = [
        {
          id: 'evt_delete_1',
          timestamp: Date.now() - (1000 * 60 * 60), // 1 hour ago
          type: 'CREATE',
          tabId: 10,
          url: 'https://delete1.com',
          domain: 'delete1.com'
        },
        {
          id: 'evt_delete_2',
          timestamp: Date.now() - (1000 * 60 * 60 * 2), // 2 hours ago
          type: 'NAVIGATE',
          tabId: 11,
          url: 'https://delete2.com',
          domain: 'delete2.com'
        },
        {
          id: 'evt_keep',
          timestamp: Date.now() - (1000 * 60 * 30), // 30 minutes ago
          type: 'ACTIVATE',
          tabId: 12,
          url: 'https://keep.com',
          domain: 'keep.com'
        }
      ];
      
      // Add test events
      for (const event of testEvents) {
        await addEvent(event);
      }
    });

    test('Test 1.4.1: Should delete specified events and return count', async () => {
      const idsToDelete = ['evt_delete_1', 'evt_delete_2'];
      const deletedCount = await deleteEvents(idsToDelete);
      
      expect(deletedCount).toBe(2);
    });

    test('Test 1.4.2: Should handle empty array input', async () => {
      const deletedCount = await deleteEvents([]);
      expect(deletedCount).toBe(0);
    });

    test('Test 1.4.3: Should handle non-array input', async () => {
      const deletedCount = await deleteEvents(null);
      expect(deletedCount).toBe(0);
    });

    test('Test 1.4.4: Should handle non-existent event IDs gracefully', async () => {
      const idsToDelete = ['non_existent_1', 'non_existent_2'];
      const deletedCount = await deleteEvents(idsToDelete);
      
      expect(deletedCount).toBe(0);
    });

    test('Test 1.4.5: Should handle mixed valid and invalid IDs', async () => {
      const idsToDelete = ['evt_delete_1', 'non_existent', 'evt_delete_2'];
      const deletedCount = await deleteEvents(idsToDelete);
      
      expect(deletedCount).toBe(2); // Only valid IDs should be deleted
    });

    test('Test 1.4.6: Should process large batches correctly', async () => {
      // Create many events
      const manyEvents = [];
      const idsToDelete = [];
      
      for (let i = 0; i < 500; i++) {
        const event = {
          id: `evt_batch_${i}`,
          timestamp: Date.now() - i * 1000,
          type: 'CREATE',
          tabId: i + 100,
          url: `https://batch${i}.com`,
          domain: `batch${i}.com`
        };
        manyEvents.push(event);
        idsToDelete.push(event.id);
      }
      
      // Add all events
      for (const event of manyEvents) {
        await addEvent(event);
      }
      
      const deletedCount = await deleteEvents(idsToDelete);
      expect(deletedCount).toBe(500);
    });

    test('Test 1.4.7: Should create readwrite transactions for deletion', async () => {
      const db = await initDB();
      const transactionSpy = jest.spyOn(db, 'transaction');
      
      await deleteEvents(['evt_delete_1']);
      
      expect(transactionSpy).toHaveBeenCalledWith(['events'], 'readwrite');
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

    test('Should perform complete cleanup workflow', async () => {
      const currentTime = Date.now();
      
      // Create a mix of old and new events
      const oldEvents = [
        {
          id: 'evt_cleanup_old_1',
          timestamp: currentTime - (8 * 24 * 60 * 60 * 1000), // 8 days old
          type: 'CREATE',
          tabId: 100,
          url: 'https://old1.com',
          domain: 'old1.com'
        },
        {
          id: 'evt_cleanup_old_2',
          timestamp: currentTime - (9 * 24 * 60 * 60 * 1000), // 9 days old
          type: 'NAVIGATE',
          tabId: 101,
          url: 'https://old2.com',
          domain: 'old2.com'
        }
      ];
      
      const recentEvents = [
        {
          id: 'evt_cleanup_recent_1',
          timestamp: currentTime - (2 * 24 * 60 * 60 * 1000), // 2 days old
          type: 'ACTIVATE',
          tabId: 102,
          url: 'https://recent1.com',
          domain: 'recent1.com'
        }
      ];
      
      // Add all events
      for (const event of [...oldEvents, ...recentEvents]) {
        await addEvent(event);
      }
      
      // Get expired events
      const expiredIds = await getExpiredEvents(168); // 7 days
      expect(expiredIds).toHaveLength(2);
      expect(expiredIds).toContain('evt_cleanup_old_1');
      expect(expiredIds).toContain('evt_cleanup_old_2');
      
      // Delete expired events
      const deletedCount = await deleteEvents(expiredIds);
      expect(deletedCount).toBe(2);
      
      // Verify only recent events remain
      const remainingExpired = await getExpiredEvents(168);
      expect(remainingExpired).toHaveLength(0);
    });
  });
});