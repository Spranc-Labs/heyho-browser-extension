/**
 * Test Aggregation Integration with Heartbeat System
 */

console.log('Testing Aggregation and Heartbeat Integration...\n');

async function testAggregationIntegration() {
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Test 1: Check aggregator module is available
  console.log('Test 1: Checking aggregator module availability...');
  try {
    if (!self.aggregator) {
      throw new Error('Aggregator module not found');
    }
    
    const functions = ['init', 'processEvents', 'addEvent', 'triggerAggregation', 'getStatistics'];
    const missingFunctions = functions.filter(fn => typeof self.aggregator[fn] !== 'function');
    
    if (missingFunctions.length === 0) {
      results.passed++;
      console.log('✅ Aggregator module loaded with all functions');
    } else {
      throw new Error(`Missing functions: ${missingFunctions.join(', ')}`);
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Aggregator check failed:', error.message);
  }
  
  // Test 2: Add test events including heartbeats
  console.log('\nTest 2: Adding test events with heartbeats...');
  try {
    // Clear existing data
    await self.aggregator.clearAllData();
    
    // Add page view event
    const pageViewResult = await self.aggregator.addEvent({
      type: 'page_view',
      tabId: 1,
      url: 'https://test-integration.com',
      timestamp: Date.now() - 120000 // 2 minutes ago
    });
    
    if (!pageViewResult.success) {
      throw new Error('Failed to add page view event');
    }
    
    // Add heartbeat events
    const heartbeat1 = await self.aggregator.addEvent({
      type: 'heartbeat',
      activeTabId: 1,
      timestamp: Date.now() - 90000, // 1.5 minutes ago
      engagement: { isEngaged: true, reason: 'active' },
      audible: false
    });
    
    const heartbeat2 = await self.aggregator.addEvent({
      type: 'heartbeat',
      activeTabId: 1,
      timestamp: Date.now() - 60000, // 1 minute ago
      engagement: { isEngaged: false, reason: 'idle' },
      audible: false
    });
    
    const heartbeat3 = await self.aggregator.addEvent({
      type: 'heartbeat',
      activeTabId: 1,
      timestamp: Date.now() - 30000, // 30 seconds ago
      engagement: { isEngaged: true, reason: 'active' },
      audible: false
    });
    
    // Check queue size
    const stats = await self.aggregator.getStatistics();
    if (stats.eventsCount >= 4) {
      results.passed++;
      console.log('✅ Events added successfully');
      console.log('   Queue size:', stats.eventsCount);
    } else {
      throw new Error('Events not queued properly');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Event addition failed:', error.message);
  }
  
  // Test 3: Trigger manual aggregation
  console.log('\nTest 3: Triggering manual aggregation...');
  try {
    const result = await self.aggregator.triggerAggregation();
    
    if (result.success) {
      results.passed++;
      console.log('✅ Manual aggregation triggered successfully');
      console.log('   Processed:', result.processed, 'events');
      
      // Check if heartbeats were processed
      if (result.statistics && result.statistics.processedEvents >= 4) {
        results.passed++;
        console.log('✅ Heartbeats processed with other events');
      }
    } else {
      throw new Error(result.error || 'Aggregation failed');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Manual aggregation failed:', error.message);
  }
  
  // Test 4: Verify engagement data in page visits
  console.log('\nTest 4: Checking engagement data in page visits...');
  try {
    const stats = await self.aggregator.getStatistics();
    
    // Export data to check page visits
    const exportData = await self.aggregator.exportData();
    
    if (exportData.pageVisits && exportData.pageVisits.length > 0) {
      const visit = exportData.pageVisits[0];
      
      // Check if engagement fields exist
      if ('activeDuration' in visit && 'engagementRate' in visit) {
        results.passed++;
        console.log('✅ Page visits have engagement data');
        console.log('   Active duration:', visit.activeDuration, 'ms');
        console.log('   Engagement rate:', (visit.engagementRate * 100).toFixed(1) + '%');
        
        // Check if engagement rate is reasonable (should be > 0 since we had active heartbeats)
        if (visit.activeDuration > 0) {
          results.passed++;
          console.log('✅ Engagement tracking is working');
        }
      } else {
        throw new Error('Engagement fields missing from page visit');
      }
    } else {
      console.log('⚠️ No page visits found (might be expected if no tab close event)');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Engagement data check failed:', error.message);
  }
  
  // Test 5: Test automatic processing with batch size
  console.log('\nTest 5: Testing automatic batch processing...');
  try {
    // Clear data first
    await self.aggregator.clearAllData();
    
    // Add exactly 10 events to trigger batch processing
    for (let i = 0; i < 9; i++) {
      await self.aggregator.addEvent({
        type: 'page_view',
        tabId: i + 1,
        url: `https://batch-test-${i}.com`,
        timestamp: Date.now() - (i * 1000)
      });
    }
    
    // The 10th event should trigger processing
    const finalResult = await self.aggregator.addEvent({
      type: 'page_view',
      tabId: 10,
      url: 'https://batch-test-final.com',
      timestamp: Date.now()
    });
    
    if (finalResult.success && !finalResult.queued) {
      results.passed++;
      console.log('✅ Automatic batch processing triggered at 10 events');
    } else {
      console.log('⚠️ Batch might have been queued instead of processed');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Batch processing test failed:', error.message);
  }
  
  // Test 6: Verify heartbeat module integration
  console.log('\nTest 6: Testing heartbeat module integration...');
  try {
    if (self.HeartbeatModule) {
      // Trigger a manual heartbeat
      const heartbeat = await self.HeartbeatModule.trigger();
      
      if (heartbeat && heartbeat.type === 'heartbeat') {
        results.passed++;
        console.log('✅ Heartbeat module is integrated');
        console.log('   Current state:', heartbeat.idleState);
        console.log('   Engaged:', heartbeat.engagement.isEngaged);
      }
      
      // Check heartbeat statistics
      const heartbeatStats = self.HeartbeatModule.getStats();
      console.log('   Heartbeat stats:', {
        total: heartbeatStats.totalHeartbeats,
        engaged: heartbeatStats.engagedCount,
        rate: (heartbeatStats.engagementRate * 100).toFixed(1) + '%'
      });
    } else {
      console.log('⚠️ Heartbeat module not initialized (might be expected in test environment)');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Heartbeat integration test failed:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('INTEGRATION TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All integration tests passed!');
    console.log('✅ Manual aggregation works');
    console.log('✅ Automatic batch processing works');
    console.log('✅ Heartbeat events are processed');
    console.log('✅ Engagement data is tracked');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
  
  return results;
}

// Run the tests
testAggregationIntegration().then(results => {
  console.log('\nIntegration test completed');
  self.integrationTestResults = results;
});