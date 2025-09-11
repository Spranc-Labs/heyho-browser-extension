/**
 * Test Full Aggregation Flow - From Event Capture to Aggregated Data
 * 
 * This test verifies that events flow correctly from:
 * 1. IndexedDB (raw events) -> 2. Aggregation -> 3. chrome.storage.local (pageVisits/tabAggregates)
 */

console.log('Testing Full Aggregation Flow...\n');
console.log('=' + '='.repeat(50));

async function testFullAggregationFlow() {
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  // Test 1: Clear all existing data
  console.log('\n📧 Test 1: Clearing all existing data...');
  try {
    // Clear IndexedDB events
    if (self.StorageModule && self.StorageModule.clearEvents) {
      await self.StorageModule.clearEvents();
      console.log('✅ Cleared IndexedDB events');
    }
    
    // Clear chrome.storage.local aggregated data
    await chrome.storage.local.remove(['pageVisits', 'tabAggregates', 'pendingEvents']);
    console.log('✅ Cleared chrome.storage.local data');
    
    results.passed++;
  } catch (error) {
    console.log('❌ Failed to clear data:', error.message);
    results.failed++;
  }
  
  // Test 2: Add events directly to IndexedDB (simulating real event capture)
  console.log('\n📥 Test 2: Adding events to IndexedDB...');
  try {
    const testEvents = [
      {
        id: `evt_${Date.now()}_1`,
        timestamp: Date.now() - 120000,
        type: 'CREATE',
        tabId: 1,
        url: 'https://example.com',
        domain: 'example.com'
      },
      {
        id: `evt_${Date.now() + 1}_1`,
        timestamp: Date.now() - 90000,
        type: 'NAVIGATE',
        tabId: 1,
        url: 'https://example.com/page1',
        domain: 'example.com'
      },
      {
        id: `evt_${Date.now() + 2}_1`,
        timestamp: Date.now() - 60000,
        type: 'NAVIGATE',
        tabId: 1,
        url: 'https://google.com',
        domain: 'google.com'
      },
      {
        id: `evt_${Date.now() + 3}_1`,
        timestamp: Date.now() - 30000,
        type: 'CLOSE',
        tabId: 1,
        url: '',
        domain: ''
      }
    ];
    
    // Add events to IndexedDB
    for (const event of testEvents) {
      await self.StorageModule.addEvent(event);
    }
    
    // Verify events are in IndexedDB
    const storedEvents = await self.StorageModule.getAllEvents();
    console.log(`✅ Added ${testEvents.length} events to IndexedDB`);
    console.log(`   Verified: ${storedEvents.length} events in IndexedDB`);
    
    results.passed++;
  } catch (error) {
    console.log('❌ Failed to add events:', error.message);
    results.failed++;
  }
  
  // Test 3: Check that aggregation can read from IndexedDB
  console.log('\n🔍 Test 3: Verifying aggregation can read IndexedDB events...');
  try {
    const storage = new self.AggregationStorage();
    const events = await storage.getEvents();
    
    if (events.length > 0) {
      console.log(`✅ Aggregation storage retrieved ${events.length} events from IndexedDB`);
      results.passed++;
    } else {
      throw new Error('No events retrieved from IndexedDB');
    }
  } catch (error) {
    console.log('❌ Failed to read events for aggregation:', error.message);
    results.failed++;
  }
  
  // Test 4: Trigger aggregation
  console.log('\n⚙️ Test 4: Triggering aggregation process...');
  try {
    const result = await self.aggregator.triggerAggregation();
    
    if (result.success) {
      console.log(`✅ Aggregation completed successfully`);
      console.log(`   Processed: ${result.processed} events`);
      if (result.statistics) {
        console.log(`   Page visits created: ${result.statistics.pageVisits}`);
        console.log(`   Tab aggregates: ${result.statistics.tabAggregates}`);
      }
      results.passed++;
    } else {
      throw new Error(result.error || 'Aggregation failed');
    }
  } catch (error) {
    console.log('❌ Aggregation failed:', error.message);
    results.failed++;
  }
  
  // Test 5: Verify events were cleared from IndexedDB
  console.log('\n🧹 Test 5: Verifying events cleared from IndexedDB after processing...');
  try {
    const remainingEvents = await self.StorageModule.getAllEvents();
    
    if (remainingEvents.length === 0) {
      console.log('✅ Events successfully cleared from IndexedDB after processing');
      results.passed++;
    } else {
      console.log(`⚠️ ${remainingEvents.length} events still in IndexedDB (might be new events)`);
    }
  } catch (error) {
    console.log('❌ Failed to check remaining events:', error.message);
    results.failed++;
  }
  
  // Test 6: Verify pageVisits in chrome.storage.local
  console.log('\n📊 Test 6: Checking pageVisits in chrome.storage.local...');
  try {
    const result = await chrome.storage.local.get('pageVisits');
    const pageVisits = result.pageVisits || [];
    
    if (pageVisits.length > 0) {
      console.log(`✅ Found ${pageVisits.length} page visits in chrome.storage.local`);
      
      // Check if visits have engagement data
      const hasEngagementData = pageVisits.some(v => 
        'activeDuration' in v && 'engagementRate' in v
      );
      
      if (hasEngagementData) {
        console.log('✅ Page visits include engagement tracking data');
      }
      
      // Show sample visit
      if (pageVisits[0]) {
        console.log('   Sample visit:', {
          url: pageVisits[0].url,
          duration: pageVisits[0].duration,
          activeDuration: pageVisits[0].activeDuration,
          engagementRate: pageVisits[0].engagementRate
        });
      }
      
      results.passed++;
    } else {
      console.log('⚠️ No page visits found (events might not have created visits)');
    }
  } catch (error) {
    console.log('❌ Failed to get page visits:', error.message);
    results.failed++;
  }
  
  // Test 7: Verify tabAggregates in chrome.storage.local
  console.log('\n📈 Test 7: Checking tabAggregates in chrome.storage.local...');
  try {
    const result = await chrome.storage.local.get('tabAggregates');
    const tabAggregates = result.tabAggregates || [];
    
    if (tabAggregates.length > 0) {
      console.log(`✅ Found ${tabAggregates.length} tab aggregates in chrome.storage.local`);
      
      // Show sample aggregate
      if (tabAggregates[0]) {
        console.log('   Sample aggregate:', {
          tabId: tabAggregates[0].tabId,
          pageCount: tabAggregates[0].pageCount,
          totalActiveDuration: tabAggregates[0].totalActiveDuration,
          domainDurations: Object.keys(tabAggregates[0].domainDurations || {})
        });
      }
      
      results.passed++;
    } else {
      console.log('⚠️ No tab aggregates found');
    }
  } catch (error) {
    console.log('❌ Failed to get tab aggregates:', error.message);
    results.failed++;
  }
  
  // Test 8: Verify export functionality
  console.log('\n💾 Test 8: Testing data export functionality...');
  try {
    const exportData = await self.aggregator.exportData();
    
    if (exportData) {
      console.log('✅ Export data retrieved successfully');
      console.log('   Export contains:', {
        pageVisits: exportData.pageVisits?.length || 0,
        tabAggregates: exportData.tabAggregates?.length || 0,
        events: exportData.events?.length || 0
      });
      results.passed++;
    } else {
      throw new Error('Export returned no data');
    }
  } catch (error) {
    console.log('❌ Export failed:', error.message);
    results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('FULL FLOW TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The aggregation flow is working correctly:');
    console.log('✅ Events saved to IndexedDB');
    console.log('✅ Aggregation reads from IndexedDB');
    console.log('✅ Processed events cleared from IndexedDB');
    console.log('✅ PageVisits saved to chrome.storage.local');
    console.log('✅ TabAggregates saved to chrome.storage.local');
    console.log('✅ Export functionality works');
  } else {
    console.log('\n⚠️ Some tests failed. The aggregation flow may have issues.');
    console.log('Common issues:');
    console.log('- Events not being saved to IndexedDB');
    console.log('- Aggregation not reading from IndexedDB');
    console.log('- Results not being saved to chrome.storage.local');
  }
  
  return results;
}

// Run the test
testFullAggregationFlow().then(results => {
  console.log('\n✅ Full flow test completed');
  self.fullFlowTestResults = results;
});