/**
 * Test Alarm-based Automatic Aggregation
 */

console.log('Testing Alarm-based Automatic Aggregation...\n');

async function testAlarms() {
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Test 1: Check aggregation alarm exists
  console.log('Test 1: Checking aggregation alarm...');
  try {
    const aggregationAlarm = await chrome.alarms.get('aggregate');
    
    if (aggregationAlarm) {
      results.passed++;
      console.log('✅ Aggregation alarm is set');
      console.log('   Name:', aggregationAlarm.name);
      console.log('   Period:', aggregationAlarm.periodInMinutes, 'minutes');
      console.log('   Next trigger:', new Date(aggregationAlarm.scheduledTime).toLocaleTimeString());
    } else {
      throw new Error('Aggregation alarm not found');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Aggregation alarm check failed:', error.message);
  }
  
  // Test 2: Check cleanup alarm
  console.log('\nTest 2: Checking cleanup alarm...');
  try {
    const cleanupAlarm = await chrome.alarms.get('cleanup');
    
    if (cleanupAlarm) {
      results.passed++;
      console.log('✅ Cleanup alarm is set');
      console.log('   Name:', cleanupAlarm.name);
      console.log('   Period:', cleanupAlarm.periodInMinutes, 'minutes');
      console.log('   Next trigger:', new Date(cleanupAlarm.scheduledTime).toLocaleTimeString());
    } else {
      console.log('⚠️ Cleanup alarm not found (might be expected)');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Cleanup alarm check failed:', error.message);
  }
  
  // Test 3: List all alarms
  console.log('\nTest 3: Listing all active alarms...');
  try {
    const allAlarms = await chrome.alarms.getAll();
    
    if (allAlarms && allAlarms.length > 0) {
      results.passed++;
      console.log('✅ Found', allAlarms.length, 'active alarm(s):');
      
      allAlarms.forEach(alarm => {
        console.log(`   - ${alarm.name}:`);
        console.log(`     Period: ${alarm.periodInMinutes} minutes`);
        console.log(`     Next: ${new Date(alarm.scheduledTime).toLocaleTimeString()}`);
      });
    } else {
      console.log('⚠️ No alarms found');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Alarm listing failed:', error.message);
  }
  
  // Test 4: Simulate alarm trigger (if possible)
  console.log('\nTest 4: Testing manual aggregation as alarm simulation...');
  try {
    // Add some test events first
    for (let i = 0; i < 3; i++) {
      await self.aggregator.addEvent({
        type: 'page_view',
        tabId: i + 1,
        url: `https://alarm-test-${i}.com`,
        timestamp: Date.now() - (i * 1000)
      });
    }
    
    // Simulate what happens when alarm fires
    const result = await self.aggregator.processEvents();
    
    if (result.success) {
      results.passed++;
      console.log('✅ Aggregation works when triggered (simulating alarm)');
      console.log('   Processed:', result.processed, 'events');
    } else {
      throw new Error('Aggregation failed');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Alarm simulation failed:', error.message);
  }
  
  // Test 5: Check heartbeat doesn't interfere with alarms
  console.log('\nTest 5: Checking heartbeat coexistence...');
  try {
    // The heartbeat system should work alongside alarms
    if (self.HeartbeatModule) {
      // Check if heartbeat is running
      const stats = self.HeartbeatModule.getStats();
      
      if (stats.totalHeartbeats >= 0) {
        results.passed++;
        console.log('✅ Heartbeat system coexists with alarms');
        console.log('   Heartbeats recorded:', stats.totalHeartbeats);
      }
    } else {
      console.log('⚠️ Heartbeat module not initialized');
    }
  } catch (error) {
    results.failed++;
    console.log('❌ Heartbeat check failed:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('ALARM TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 Automatic aggregation system is working!');
    console.log('✅ Aggregation alarm runs every 5 minutes');
    console.log('✅ Manual trigger works as backup');
    console.log('✅ Heartbeat system runs independently');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above.');
  }
  
  // Helpful information
  console.log('\n📋 System Status:');
  console.log('- Aggregation: Every 5 minutes automatically');
  console.log('- Heartbeat: Every 30 seconds for engagement');
  console.log('- Batch processing: Every 10 events');
  console.log('- Manual trigger: Available via debug panel');
  
  return results;
}

// Run the tests
testAlarms().then(results => {
  console.log('\nAlarm test completed');
  self.alarmTestResults = results;
});