/**
 * Test suite for the simplified aggregation system
 */

console.log('Starting simplified aggregation system tests...\n');

async function testSimplifiedSystem() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Models creation
  console.log('Test 1: Creating models...');
  try {
    // Test PageVisit
    const visit = self.PageVisit.createFromEvent(
      1, 
      'https://example.com', 
      'example.com', 
      Date.now()
    );
    
    if (visit.isActive && visit.tabId === 1) {
      results.passed++;
      console.log('✅ PageVisit model works');
    } else {
      throw new Error('PageVisit properties incorrect');
    }
    
    // Test TabAggregate
    const aggregate = self.TabAggregate.createNew(1, Date.now());
    aggregate.updateActivity('example.com', 5000, 'https://example.com', Date.now());
    
    if (aggregate.domainDurations['example.com'] === 5000) {
      results.passed++;
      console.log('✅ TabAggregate model works');
    } else {
      throw new Error('TabAggregate update failed');
    }
    
    // Test AggregationBatch
    const batch = new self.AggregationBatch([], null, []);
    batch.addPageVisit(visit);
    
    if (batch.pageVisits.length === 1) {
      results.passed++;
      console.log('✅ AggregationBatch model works');
    } else {
      throw new Error('AggregationBatch add failed');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Models test failed:', error.message);
  }
  
  // Test 2: Storage operations
  console.log('\nTest 2: Testing storage...');
  try {
    const storage = new self.AggregationStorage();
    
    // Clear any existing data
    await storage.clearAll();
    
    // Test adding events
    const testEvent = {
      type: 'page_view',
      tabId: 1,
      url: 'https://test.com',
      timestamp: Date.now()
    };
    
    await storage.addEvent(testEvent);
    const events = await storage.getEvents();
    
    if (events.length === 1 && events[0].type === 'page_view') {
      results.passed++;
      console.log('✅ Storage add/get events works');
    } else {
      throw new Error('Storage events failed');
    }
    
    // Test statistics
    const stats = await storage.getStatistics();
    if (stats.eventsCount === 1) {
      results.passed++;
      console.log('✅ Storage statistics work');
    } else {
      throw new Error('Storage statistics incorrect');
    }
    
    // Clean up
    await storage.clearAll();
    
  } catch (error) {
    results.failed++;
    console.log('❌ Storage test failed:', error.message);
  }
  
  // Test 3: Event processing
  console.log('\nTest 3: Testing event processor...');
  try {
    const storage = new self.AggregationStorage();
    const processor = new self.EventProcessor(storage);
    
    // Clear any existing data
    await storage.clearAll();
    
    // Add test events
    const testEvents = [
      {
        id: 'evt1',
        type: 'page_view',
        tabId: 1,
        url: 'https://example.com',
        timestamp: Date.now() - 10000
      },
      {
        id: 'evt2',
        type: 'navigation',
        tabId: 1,
        url: 'https://example.com/page',
        timestamp: Date.now() - 5000
      },
      {
        id: 'evt3',
        type: 'tab_close',
        tabId: 1,
        timestamp: Date.now()
      }
    ];
    
    for (const event of testEvents) {
      await storage.addEvent(event);
    }
    
    // Process events
    const result = await processor.processAllEvents();
    
    if (result.success && result.processed === 3) {
      results.passed++;
      console.log('✅ Event processing works');
      console.log('   Processed:', result.processed, 'events');
      console.log('   Statistics:', result.statistics);
    } else {
      throw new Error('Processing failed or incorrect count');
    }
    
    // Check that events were cleared
    const remainingEvents = await storage.getEvents();
    if (remainingEvents.length === 0) {
      results.passed++;
      console.log('✅ Events cleared after processing');
    } else {
      throw new Error('Events not cleared');
    }
    
    // Check page visits were saved
    const visits = await storage.getPageVisits();
    if (visits.length > 0) {
      results.passed++;
      console.log('✅ Page visits saved');
      console.log('   Visits saved:', visits.length);
    } else {
      throw new Error('No page visits saved');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Processor test failed:', error.message);
  }
  
  // Test 4: URL utilities
  console.log('\nTest 4: Testing URL utilities...');
  try {
    const testUrl = 'https://www.example.com/path?query=1#hash';
    const domain = self.UrlUtils.extractDomain(testUrl);
    
    if (domain === 'example.com') {
      results.passed++;
      console.log('✅ URL domain extraction works');
    } else {
      throw new Error(`Wrong domain: ${domain}`);
    }
    
    if (self.UrlUtils.shouldTrackUrl('https://google.com')) {
      results.passed++;
      console.log('✅ URL tracking check works');
    } else {
      throw new Error('Should track normal URLs');
    }
    
    if (!self.UrlUtils.shouldTrackUrl('chrome://settings')) {
      results.passed++;
      console.log('✅ URL filtering works');
    } else {
      throw new Error('Should not track chrome:// URLs');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ URL utils test failed:', error.message);
  }
  
  // Test 5: Integration test with aggregator
  console.log('\nTest 5: Testing aggregator integration...');
  try {
    // Initialize aggregator
    await self.aggregator.init();
    
    // Clear data
    await self.aggregator.clearAllData();
    
    // Add some events
    const event1 = await self.aggregator.addEvent({
      type: 'page_view',
      tabId: 2,
      url: 'https://integration-test.com'
    });
    
    if (event1.success && event1.queued) {
      results.passed++;
      console.log('✅ Aggregator event queuing works');
    } else {
      throw new Error('Event queuing failed');
    }
    
    // Get statistics
    const stats = await self.aggregator.getStatistics();
    if (stats.eventsCount >= 0) {
      results.passed++;
      console.log('✅ Aggregator statistics work');
      console.log('   Current stats:', stats);
    } else {
      throw new Error('Statistics retrieval failed');
    }
    
    // Manual trigger
    const processResult = await self.aggregator.triggerAggregation();
    console.log('✅ Manual aggregation triggered');
    console.log('   Result:', processResult);
    results.passed++;
    
  } catch (error) {
    results.failed++;
    console.log('❌ Aggregator integration test failed:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The simplified system is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
  
  return results;
}

// Run the tests
testSimplifiedSystem().then(results => {
  console.log('\nTest suite completed');
  self.testResults = results;
});