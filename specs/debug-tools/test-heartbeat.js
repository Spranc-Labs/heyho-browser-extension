/**
 * Test suite for the Intelligent Heartbeat System
 */

console.log('Starting Heartbeat System Tests...\n');

async function testHeartbeatSystem() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Heartbeat module initialization
  console.log('Test 1: Heartbeat module initialization...');
  try {
    // Check if module is loaded
    if (!self.HeartbeatModule) {
      throw new Error('HeartbeatModule not loaded');
    }
    
    // Initialize the module
    await self.HeartbeatModule.init();
    
    // Check configuration
    const config = self.HeartbeatModule._config;
    if (config.intervalMs === 30000 && config.idleThreshold === 60) {
      results.passed++;
      console.log('✅ Heartbeat module initialized correctly');
    } else {
      throw new Error('Configuration incorrect');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Initialization failed:', error.message);
  }
  
  // Test 2: Engagement calculation logic
  console.log('\nTest 2: Testing engagement calculation...');
  try {
    const calculateEngagement = self.HeartbeatModule._calculateEngagement;
    
    // Test case 1: Active user
    const activeResult = calculateEngagement('active', { audible: false }, true);
    if (activeResult.isEngaged && activeResult.reason === 'active') {
      console.log('✅ Active user correctly identified as engaged');
      results.passed++;
    } else {
      throw new Error('Active user not marked as engaged');
    }
    
    // Test case 2: Idle with audio
    const audioResult = calculateEngagement('idle', { audible: true }, true);
    if (audioResult.isEngaged && audioResult.reason === 'audio') {
      console.log('✅ Idle with audio correctly identified as engaged');
      results.passed++;
    } else {
      throw new Error('Audio engagement not detected');
    }
    
    // Test case 3: Locked computer
    const lockedResult = calculateEngagement('locked', { audible: false }, true);
    if (!lockedResult.isEngaged && lockedResult.reason === 'locked') {
      console.log('✅ Locked state correctly identified as not engaged');
      results.passed++;
    } else {
      throw new Error('Locked state incorrectly marked as engaged');
    }
    
    // Test case 4: Idle without audio
    const idleResult = calculateEngagement('idle', { audible: false }, true);
    if (!idleResult.isEngaged && idleResult.reason === 'idle') {
      console.log('✅ Idle state correctly identified as not engaged');
      results.passed++;
    } else {
      throw new Error('Idle state incorrectly marked as engaged');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Engagement calculation failed:', error.message);
  }
  
  // Test 3: Manual heartbeat generation
  console.log('\nTest 3: Testing manual heartbeat generation...');
  try {
    const heartbeat = await self.HeartbeatModule.trigger();
    
    if (!heartbeat) {
      throw new Error('No heartbeat generated');
    }
    
    // Check heartbeat structure
    const requiredFields = ['type', 'timestamp', 'idleState', 'engagement'];
    const hasAllFields = requiredFields.every(field => field in heartbeat);
    
    if (hasAllFields && heartbeat.type === 'heartbeat') {
      results.passed++;
      console.log('✅ Heartbeat generated with correct structure');
      console.log('   Heartbeat:', {
        idleState: heartbeat.idleState,
        engaged: heartbeat.engagement.isEngaged,
        reason: heartbeat.engagement.reason,
        audible: heartbeat.audible
      });
    } else {
      throw new Error('Heartbeat structure incorrect');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Heartbeat generation failed:', error.message);
  }
  
  // Test 4: PageVisit engagement tracking
  console.log('\nTest 4: Testing PageVisit engagement tracking...');
  try {
    // Create a page visit
    const visit = self.PageVisit.createFromEvent(
      1, 
      'https://example.com',
      'example.com',
      Date.now() - 60000 // Started 1 minute ago
    );
    
    // Simulate engaged heartbeat
    const engagedHeartbeat = {
      timestamp: Date.now(),
      engagement: { isEngaged: true, reason: 'active' }
    };
    visit.updateEngagement(engagedHeartbeat);
    
    if (visit.activeDuration > 0) {
      console.log('✅ Active duration updated correctly');
      console.log('   Active duration:', visit.activeDuration, 'ms');
      results.passed++;
    } else {
      throw new Error('Active duration not updated');
    }
    
    // Simulate idle heartbeat
    const idleHeartbeat = {
      timestamp: Date.now() + 30000,
      engagement: { isEngaged: false, reason: 'idle' }
    };
    visit.updateEngagement(idleHeartbeat);
    
    if (visit.idlePeriods.length > 0) {
      console.log('✅ Idle periods tracked correctly');
      console.log('   Idle periods:', visit.idlePeriods.length);
      results.passed++;
    } else {
      throw new Error('Idle periods not tracked');
    }
    
    // Complete visit and check engagement rate
    visit.complete(Date.now() + 60000);
    
    if (visit.engagementRate > 0 && visit.engagementRate <= 1) {
      console.log('✅ Engagement rate calculated correctly');
      console.log('   Engagement rate:', (visit.engagementRate * 100).toFixed(1) + '%');
      results.passed++;
    } else {
      throw new Error('Engagement rate calculation failed');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ PageVisit engagement tracking failed:', error.message);
  }
  
  // Test 5: Heartbeat statistics
  console.log('\nTest 5: Testing heartbeat statistics...');
  try {
    // Generate a few heartbeats first
    await self.HeartbeatModule.trigger();
    await new Promise(resolve => setTimeout(resolve, 100));
    await self.HeartbeatModule.trigger();
    
    const stats = self.HeartbeatModule.getStats();
    
    if (stats.totalHeartbeats > 0) {
      console.log('✅ Heartbeat statistics working');
      console.log('   Stats:', {
        total: stats.totalHeartbeats,
        engaged: stats.engagedCount,
        rate: (stats.engagementRate * 100).toFixed(1) + '%',
        states: stats.idleStates
      });
      results.passed++;
    } else {
      throw new Error('No statistics available');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Statistics test failed:', error.message);
  }
  
  // Test 6: Integration with processor
  console.log('\nTest 6: Testing processor integration...');
  try {
    const storage = new self.AggregationStorage();
    const processor = new self.EventProcessor(storage);
    
    // Clear storage first
    await storage.clearAll();
    
    // Add a page view event to create active visit
    await storage.addEvent({
      id: 'test1',
      type: 'page_view',
      tabId: 1,
      url: 'https://test.com',
      timestamp: Date.now() - 60000
    });
    
    // Add a heartbeat event
    await storage.addEvent({
      id: 'hb1',
      type: 'heartbeat',
      activeTabId: 1,
      timestamp: Date.now(),
      engagement: { isEngaged: true, reason: 'active' }
    });
    
    // Process events
    const result = await processor.processAllEvents();
    
    if (result.success && result.processed >= 2) {
      console.log('✅ Heartbeat processed successfully');
      console.log('   Processed:', result.processed, 'events');
      
      // Check if page visit has engagement data
      const visits = await storage.getPageVisits();
      if (visits.length > 0 && visits[0].activeDuration !== undefined) {
        console.log('✅ Page visit updated with engagement data');
        results.passed++;
      }
    } else {
      throw new Error('Processing failed');
    }
    
  } catch (error) {
    results.failed++;
    console.log('❌ Processor integration failed:', error.message);
  }
  
  // Clean up
  console.log('\nCleaning up test data...');
  await self.HeartbeatModule.clear();
  self.HeartbeatModule.stop();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('HEARTBEAT TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success rate: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All heartbeat tests passed! The system is working correctly.');
    console.log('📊 Your extension now tracks:');
    console.log('   - Total time (tab open)');
    console.log('   - Active time (user engaged)');
    console.log('   - Engagement rate (active/total)');
    console.log('   - Idle periods with reasons');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
  
  return results;
}

// Run the tests
testHeartbeatSystem().then(results => {
  console.log('\nHeartbeat test suite completed');
  self.heartbeatTestResults = results;
});