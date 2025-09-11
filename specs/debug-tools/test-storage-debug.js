/**
 * Test Script to Debug Storage Issues
 * 
 * This script will help us understand what's stored where and why exports show 0
 */

async function testStorageAccess() {
  console.log('=== STORAGE DEBUG TEST ===');
  
  // Test 1: Check IndexedDB for raw events
  console.log('\n1. Testing IndexedDB (Raw Events)...');
  try {
    if (self.StorageModule && self.StorageModule.getAllEvents) {
      const rawEvents = await self.StorageModule.getAllEvents();
      console.log(`✓ IndexedDB Raw Events: ${rawEvents.length} found`);
      if (rawEvents.length > 0) {
        console.log('Sample event:', rawEvents[0]);
      }
    } else {
      console.log('❌ StorageModule.getAllEvents not available');
    }
  } catch (error) {
    console.error('❌ IndexedDB error:', error);
  }
  
  // Test 2: Check chrome.storage.local for aggregated data
  console.log('\n2. Testing chrome.storage.local (Aggregated Data)...');
  try {
    const [pageVisitsResult, tabAggregatesResult, activeVisitResult] = await Promise.all([
      chrome.storage.local.get('pageVisits'),
      chrome.storage.local.get('tabAggregates'),
      chrome.storage.local.get('activeVisit')
    ]);
    
    const pageVisits = pageVisitsResult.pageVisits || [];
    const tabAggregates = tabAggregatesResult.tabAggregates || [];
    const activeVisit = activeVisitResult.activeVisit || null;
    
    console.log(`✓ chrome.storage.local Page Visits: ${pageVisits.length} found`);
    console.log(`✓ chrome.storage.local Tab Aggregates: ${tabAggregates.length} found`);
    console.log(`✓ chrome.storage.local Active Visit: ${activeVisit ? 'exists' : 'none'}`);
    
    if (pageVisits.length > 0) {
      console.log('Sample page visit:', pageVisits[0]);
    }
    if (tabAggregates.length > 0) {
      console.log('Sample tab aggregate:', tabAggregates[0]);
    }
  } catch (error) {
    console.error('❌ chrome.storage.local error:', error);
  }
  
  // Test 3: Check aggregation storage module
  console.log('\n3. Testing AggregationStorage module...');
  try {
    if (self.AggregationStorage) {
      const storage = new self.AggregationStorage();
      const stats = await storage.getStatistics();
      console.log('✓ AggregationStorage stats:', stats);
      
      const exportData = await storage.exportData();
      console.log('✓ AggregationStorage export sample:', {
        eventsCount: exportData.events?.length || 0,
        pageVisitsCount: exportData.pageVisits?.length || 0,
        tabAggregatesCount: exportData.tabAggregates?.length || 0
      });
    } else {
      console.log('❌ AggregationStorage not available');
    }
  } catch (error) {
    console.error('❌ AggregationStorage error:', error);
  }
  
  // Test 4: Check what the debug module is actually getting
  console.log('\n4. Testing DebugModule functions...');
  try {
    if (self.DebugModule) {
      const pageVisits = await self.DebugModule.getAllPageVisits();
      const tabAggregates = await self.DebugModule.getAllTabAggregates();
      
      console.log(`✓ DebugModule Page Visits: ${pageVisits.length} found`);
      console.log(`✓ DebugModule Tab Aggregates: ${tabAggregates.length} found`);
    } else {
      console.log('❌ DebugModule not available');
    }
  } catch (error) {
    console.error('❌ DebugModule error:', error);
  }
  
  // Test 5: Manual aggregation trigger
  console.log('\n5. Testing manual aggregation...');
  try {
    if (self.aggregator && self.aggregator.triggerAggregation) {
      const result = await self.aggregator.triggerAggregation();
      console.log('✓ Manual aggregation result:', result);
      
      // Check data again after aggregation
      const pageVisitsResult = await chrome.storage.local.get('pageVisits');
      const pageVisits = pageVisitsResult.pageVisits || [];
      console.log(`✓ Page visits after aggregation: ${pageVisits.length}`);
    } else {
      console.log('❌ aggregator.triggerAggregation not available');
    }
  } catch (error) {
    console.error('❌ Manual aggregation error:', error);
  }
  
  console.log('\n=== END STORAGE DEBUG TEST ===');
}

// Run the test
testStorageAccess();


