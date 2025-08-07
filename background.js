// background.js
// This is the service worker for the HeyHo Extension.
// It uses the browser.* namespace for cross-browser compatibility via the polyfill.

console.log("HeyHo background script loaded.");

// Example of using the browser.* namespace
browser.alarms.onAlarm.addListener((alarm) => {
  console.log("Alarm fired!", alarm);
});

// Event listeners and other logic will be added in subsequent steps.