/**
 * Test Aggregation Timing
 * 
 * This script tests that the automatic aggregation system properly stores timestamps
 * for the debug panel to display.
 */

// Mock browser environment
if (typeof self === 'undefined') {
  global.self = {};
}

// Mock chrome storage
const mockStorage = new Map();
global.chrome = {
  storage: {
    local: {
      set: async (data) => {
        console.log('📦 Storage set:', data);
        for (const [key, value] of Object.entries(data)) {
          mockStorage.set(key, value);
        }
      },
      get: async (keys) => {
        console.log('📦 Storage get:', keys);
        const result = {};
        if (typeof keys === 'string') {
          result[keys] = mockStorage.get(keys);
        } else if (Array.isArray(keys)) {
          for (const key of keys) {
            result[key] = mockStorage.get(key);
          }
        }
        return result;
      }
    }
  }
};

// Load required modules
require('../../src/aggregation/utils.js');
require('../../src/aggregation/models.js');
require('../../src/aggregation/storage.js');
require('../../src/aggregation/processor.js');
require('../../src/background/storage.js');
require('../../src/background/config.js');
require('../../src/background/aggregator.js');

async function testAggregationTiming() {
  console.log('🧪 Testing Aggregation Timing...');
  
  try {
    // Initialize the aggregator
    await self.aggregator.init();
    console.log('✅ Aggregator initialized');
    
    // Add some test events
    const testEvents = [
      {
        id: 'test_1',
        type: 'CREATE',
        tabId: 1,
        url: 'https://example.com',
        domain: 'example.com',
        timestamp: Date.now()
      },
      {
        id: 'test_2',
        type: 'ACTIVATE', 
        tabId: 1,
        url: 'https://example.com',
        domain: 'example.com',
        timestamp: Date.now()
      }
    ];
    
    // Add events to the queue
    for (const event of testEvents) {
      await self.aggregator.addEvent(event);
      console.log('✅ Added event:', event.id);
    }
    
    // Trigger aggregation process
    console.log('⚡ Triggering aggregation...');
    const result = await self.aggregator.processEvents();
    console.log('📊 Aggregation result:', result);
    
    // Check if timestamp was stored
    const timestampResult = await chrome.storage.local.get('lastAggregationTime');
    console.log('🕒 Retrieved timestamp:', timestampResult);
    
    if (timestampResult.lastAggregationTime) {
      const date = new Date(timestampResult.lastAggregationTime);
      console.log('✅ SUCCESS: Timestamp stored correctly:', date.toLocaleString());
      
      // Test the same format as debug panel
      const formattedTime = timestampResult.lastAggregationTime 
        ? new Date(timestampResult.lastAggregationTime).toLocaleString()
        : 'Never';
      
      console.log('🎯 Debug panel will show:', formattedTime);
      
    } else {
      console.error('❌ FAILED: No timestamp found in storage');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAggregationTiming();