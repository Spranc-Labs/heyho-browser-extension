/**
 * Quick Debug Script - Run this in browser console after reloading extension
 */

console.log('🔧 QUICK DEBUG - Checking aggregation system...');

// Test 1: Check what's in storage RIGHT NOW
chrome.storage.local.get(null).then(allData => {
  console.log('📦 ALL CHROME STORAGE:', allData);
  console.log('Storage keys:', Object.keys(allData));
  
  const pageVisits = allData.pageVisits || [];
  const tabAggregates = allData.tabAggregates || [];
  
  console.log(`📊 Current page visits: ${pageVisits.length}`);
  console.log(`📊 Current tab aggregates: ${tabAggregates.length}`);
  
  if (pageVisits.length > 0) {
    console.log('Latest page visit:', pageVisits[pageVisits.length - 1]);
  }
});

// Test 2: Check raw events
self.StorageModule.getAllEvents().then(events => {
  console.log(`📊 Raw events in IndexedDB: ${events.length}`);
  if (events.length > 0) {
    console.log('Sample raw event:', events[0]);
  }
});

// Test 3: Try manual aggregation with detailed logging
console.log('🔄 Triggering manual aggregation...');
self.aggregator.triggerAggregation().then(result => {
  console.log('✅ Manual aggregation result:', result);
  
  // Check storage again after aggregation
  chrome.storage.local.get(['pageVisits', 'tabAggregates']).then(data => {
    const pageVisits = data.pageVisits || [];
    const tabAggregates = data.tabAggregates || [];
    
    console.log(`📊 After aggregation - Page visits: ${pageVisits.length}`);
    console.log(`📊 After aggregation - Tab aggregates: ${tabAggregates.length}`);
  });
});

// Test 4: Create and process a test event
const testEvent = {
  id: `test_${Date.now()}`,
  type: 'CREATE',
  tabId: 12345,
  url: 'https://test.example.com/page',
  domain: 'test.example.com',
  timestamp: Date.now()
};

console.log('🧪 Adding test event:', testEvent);
self.StorageModule.addEvent(testEvent).then(() => {
  console.log('✅ Test event added');
  
  // Process it
  self.aggregator.triggerAggregation().then(result => {
    console.log('✅ Test event processing result:', result);
    
    // Check if test event was processed into a page visit
    chrome.storage.local.get('pageVisits').then(data => {
      const pageVisits = data.pageVisits || [];
      const testVisit = pageVisits.find(v => v.domain === 'test.example.com');
      
      if (testVisit) {
        console.log('✅ SUCCESS: Test event processed into page visit!', testVisit);
      } else {
        console.log('❌ FAILED: Test event not found in page visits');
        console.log('Current page visits:', pageVisits);
      }
    });
  });
});


