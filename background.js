// background.js
// This is the service worker for the HeyHo Extension.
// It uses the browser.* namespace for cross-browser compatibility via the polyfill.

console.log("HeyHo background script loaded.");

// Import storage module
importScripts('src/background/storage.js');

// Initialize storage and test with a sample CoreEvent
async function testStorage() {
  try {
    const { initDB, addEvent } = self.StorageModule;
    
    // Initialize the database
    await initDB();
    console.log("IndexedDB initialized successfully");
    
    // Create a test CoreEvent object
    const testEvent = {
      id: `evt_${Date.now()}_test`,
      timestamp: Date.now(),
      type: "CREATE",
      tabId: 123,
      url: "https://www.example.com/test-path",
      domain: "www.example.com"
    };
    
    // Add the test event to storage
    await addEvent(testEvent);
    console.log("Test CoreEvent added successfully:", testEvent);
    
  } catch (error) {
    console.error("Storage test failed:", error);
  }
}

// Run storage test when background script loads
testStorage();

// Example of using the browser.* namespace
browser.alarms.onAlarm.addListener((alarm) => {
  console.log("Alarm fired!", alarm);
});

// Event listeners and other logic will be added in subsequent steps.