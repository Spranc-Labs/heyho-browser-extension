// Tab Tracker Real-Time Data Viewer
// Copy and paste this into your browser console to see live data

// Cross-browser API wrapper
const api = (typeof browser !== 'undefined') ? browser : chrome;

console.log("Tab Tracker Real-Time Data Viewer");
console.log("==================================");

async function testExtension() {
  try {
    // Test 1: Check current tab tracking
    console.log("\n1. Current Tab Tracking:");
    const [currentTab] = await api.tabs.query({ active: true, currentWindow: true });
    const { tabHistory } = await api.storage.local.get('tabHistory');
    
    if (tabHistory && tabHistory[currentTab.id]) {
      console.log("✓ Current tab is being tracked:", tabHistory[currentTab.id]);
    } else {
      console.log("✗ Current tab not found in tracking data");
      console.log("Try navigating to a few pages and wait a moment");
    }

    // Test 2: Check tab records
    console.log("\n2. Tab Records:");
    const { tabRecords } = await api.storage.local.get('tabRecords');
    if (tabRecords && tabRecords.length > 0) {
      console.log(`✓ Found ${tabRecords.length} tab records:`);
      tabRecords.slice(-5).forEach((record, index) => {
        console.log(`Recent Record ${index + 1}:`, {
          domain: record.domain,
          timeSpent: record.activeSeconds + 's',
          category: record.sessionData?.category,
          engagement: record.sessionData?.engagement,
          autoSaved: record.autoSaved
        });
      });
    } else {
      console.log("✗ No tab records found");
      console.log("Try browsing for a few minutes - records auto-save");
    }

    // Test 3: Check opt-out status
    console.log("\n3. Tracking Status:");
    const { trackingOptOut } = await api.storage.local.get('trackingOptOut');
    console.log(`Tracking opt-out: ${trackingOptOut ? 'ENABLED (tracking disabled)' : 'DISABLED (tracking enabled)'}`);

    // Test 4: Show all tracked tabs
    console.log("\n4. All Tracked Tabs:");
    if (tabHistory) {
      const tabIds = Object.keys(tabHistory);
      console.log(`Total tabs tracked: ${tabIds.length}`);
      Object.values(tabHistory).forEach((tab, index) => {
        console.log(`Tab ${index + 1}:`, {
          activeSeconds: tab.activeSeconds,
          loadCount: tab.loadCount,
          pinned: tab.pinned,
          bookmarked: tab.bookmarked,
          url: tab.originalUrl // Show original URL for debugging
        });
      });
    }

    // Test 5: Storage usage
    console.log("\n5. Storage Usage:");
    api.storage.local.getBytesInUse(['tabHistory', 'journalEntries', 'trackingOptOut'], (bytes) => {
      console.log(`Storage used: ${bytes} bytes`);
    });

  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Auto-run the test
testExtension();

// Utility functions you can call manually:
window.clearRecords = async function() {
  await api.storage.local.remove('tabRecords');
  console.log("Tab records cleared!");
};

window.clearAllData = async function() {
  await api.storage.local.clear();
  console.log("All extension data cleared!");
};

window.enableTracking = async function() {
  await api.storage.local.set({ trackingOptOut: false });
  console.log("Tracking enabled!");
};

window.disableTracking = async function() {
  await api.storage.local.set({ trackingOptOut: true });
  console.log("Tracking disabled!");
};

console.log("\nUtility Functions Available:");
console.log("- clearRecords() - Clear all tab records");
console.log("- clearAllData() - Clear all extension data");
console.log("- enableTracking() - Enable tracking");
console.log("- disableTracking() - Disable tracking");
console.log("\nExample: Type 'clearRecords()' to clear all records"); 