/**
 * Test Script to Fix and Verify Aggregation
 * 
 * This script tests the aggregation fix and helps verify data processing
 */

async function testAggregationFix() {
  console.log('🔧 TESTING AGGREGATION FIX');
  console.log('===========================');
  
  // Step 1: Check current state
  console.log('\n1️⃣ Checking current state...');
  try {
    const rawEvents = await self.StorageModule.getAllEvents();
    console.log(`📊 Raw events in IndexedDB: ${rawEvents.length}`);
    
    const pageVisitsResult = await chrome.storage.local.get('pageVisits');
    const tabAggregatesResult = await chrome.storage.local.get('tabAggregates');
    const pageVisits = pageVisitsResult.pageVisits || [];
    const tabAggregates = tabAggregatesResult.tabAggregates || [];
    
    console.log(`📊 Page visits in storage: ${pageVisits.length}`);
    console.log(`📊 Tab aggregates in storage: ${tabAggregates.length}`);
    
    if (rawEvents.length > 0) {
      console.log(`📝 Sample raw event:`, rawEvents[0]);
    }
  } catch (error) {
    console.error('❌ Error checking current state:', error);
  }
  
  // Step 2: Test manual aggregation
  console.log('\n2️⃣ Running manual aggregation...');
  try {
    const result = await self.aggregator.triggerAggregation();
    console.log('✅ Aggregation result:', result);
  } catch (error) {
    console.error('❌ Manual aggregation failed:', error);
  }
  
  // Step 3: Check state after aggregation
  console.log('\n3️⃣ Checking state after aggregation...');
  try {
    const rawEventsAfter = await self.StorageModule.getAllEvents();
    console.log(`📊 Raw events after aggregation: ${rawEventsAfter.length}`);
    
    const pageVisitsAfterResult = await chrome.storage.local.get('pageVisits');
    const tabAggregatesAfterResult = await chrome.storage.local.get('tabAggregates');
    const pageVisitsAfter = pageVisitsAfterResult.pageVisits || [];
    const tabAggregatesAfter = tabAggregatesAfterResult.tabAggregates || [];
    
    console.log(`📊 Page visits after aggregation: ${pageVisitsAfter.length}`);
    console.log(`📊 Tab aggregates after aggregation: ${tabAggregatesAfter.length}`);
    
    if (pageVisitsAfter.length > 0) {
      console.log(`📝 Sample page visit:`, pageVisitsAfter[pageVisitsAfter.length - 1]);
    }
    if (tabAggregatesAfter.length > 0) {
      console.log(`📝 Sample tab aggregate:`, tabAggregatesAfter[tabAggregatesAfter.length - 1]);
    }
  } catch (error) {
    console.error('❌ Error checking state after aggregation:', error);
  }
  
  // Step 4: Test export function
  console.log('\n4️⃣ Testing export function...');
  try {
    // Test the debug export that was showing 0s
    const exportData = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'exportAllData' }, resolve);
    });
    
    if (exportData.success) {
      const { rawEvents, pageVisits, tabAggregates } = exportData.data;
      console.log('✅ Export successful:');
      console.log(`   📊 Raw events: ${rawEvents.length}`);
      console.log(`   📊 Page visits: ${pageVisits.length}`);
      console.log(`   📊 Tab aggregates: ${tabAggregates.length}`);
    } else {
      console.error('❌ Export failed:', exportData.error);
    }
  } catch (error) {
    console.error('❌ Export test failed:', error);
  }
  
  // Step 5: Add test events and process them
  console.log('\n5️⃣ Testing with new events...');
  try {
    // Create a test event using the current event creation system
    const testEvent = {
      id: `test_${Date.now()}`,
      type: 'CREATE',
      tabId: 999,
      url: 'https://test.example.com',
      domain: 'test.example.com',
      timestamp: Date.now()
    };
    
    console.log('🧪 Adding test event:', testEvent);
    await self.StorageModule.addEvent(testEvent);
    
    // Process the test event
    console.log('🔄 Processing test event...');
    const processResult = await self.aggregator.triggerAggregation();
    console.log('✅ Test event processing result:', processResult);
    
    // Check if the test event was processed
    const finalPageVisits = await chrome.storage.local.get('pageVisits');
    const finalVisits = finalPageVisits.pageVisits || [];
    const testVisit = finalVisits.find(v => v.domain === 'test.example.com');
    
    if (testVisit) {
      console.log('✅ Test event successfully processed into page visit:', testVisit);
    } else {
      console.log('❌ Test event was not processed into a page visit');
    }
    
  } catch (error) {
    console.error('❌ Test event processing failed:', error);
  }
  
  console.log('\n🏁 AGGREGATION FIX TEST COMPLETE');
  console.log('=================================');
}

// Make function available globally for console testing
self.testAggregationFix = testAggregationFix;

// Auto-run if this script is executed directly
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  console.log('🧪 Aggregation fix test script loaded. Run testAggregationFix() to execute.');
}

// Additional focused test for the export issue
async function testExportIssue() {
  console.log('🔍 DEBUGGING EXPORT ISSUE');
  console.log('==========================');
  
  // Step 1: Check what's actually in chrome.storage.local
  console.log('\n1️⃣ Checking chrome.storage.local directly...');
  try {
    const allStorage = await chrome.storage.local.get(null);
    console.log('📦 All chrome.storage.local keys:', Object.keys(allStorage));
    
    for (const [key, value] of Object.entries(allStorage)) {
      if (Array.isArray(value)) {
        console.log(`   ${key}: Array with ${value.length} items`);
        if (value.length > 0) {
          console.log(`   Sample ${key}:`, value[0]);
        }
      } else {
        console.log(`   ${key}:`, typeof value, value);
      }
    }
  } catch (error) {
    console.error('❌ Error checking chrome.storage.local:', error);
  }
  
  // Step 2: Test the specific export functions that are failing
  console.log('\n2️⃣ Testing export functions...');
  try {
    if (self.DebugModule) {
      const pageVisits = await self.DebugModule.getAllPageVisits();
      const tabAggregates = await self.DebugModule.getAllTabAggregates();
      
      console.log(`📊 DebugModule.getAllPageVisits(): ${pageVisits.length} items`);
      console.log(`📊 DebugModule.getAllTabAggregates(): ${tabAggregates.length} items`);
    }
  } catch (error) {
    console.error('❌ Error testing export functions:', error);
  }
  
  // Step 3: Test the aggregation storage module directly
  console.log('\n3️⃣ Testing AggregationStorage directly...');
  try {
    const storage = new self.AggregationStorage();
    const pageVisits = await storage.getPageVisits();
    const tabAggregates = await storage.getTabAggregates();
    
    console.log(`📊 AggregationStorage.getPageVisits(): ${pageVisits.length} items`);
    console.log(`📊 AggregationStorage.getTabAggregates(): ${tabAggregates.length} items`);
    
    if (pageVisits.length > 0) {
      console.log('📝 Sample page visit from storage:', pageVisits[0]);
    }
  } catch (error) {
    console.error('❌ Error testing AggregationStorage:', error);
  }
  
  // Step 4: Check if there are any raw events to process
  console.log('\n4️⃣ Checking raw events...');
  try {
    const rawEvents = await self.StorageModule.getAllEvents();
    console.log(`📊 Raw events available: ${rawEvents.length}`);
    
    if (rawEvents.length > 0) {
      console.log('📝 Sample raw event:', rawEvents[0]);
      
      // Try processing them
      console.log('🔄 Attempting to process raw events...');
      const result = await self.aggregator.triggerAggregation();
      console.log('✅ Processing result:', result);
    }
  } catch (error) {
    console.error('❌ Error checking raw events:', error);
  }
  
  console.log('\n🏁 EXPORT DEBUG COMPLETE');
}

self.testExportIssue = testExportIssue;
