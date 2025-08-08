// background.js
// This is the service worker entry point for the HeyHo Extension.
// It uses the browser.* namespace for cross-browser compatibility via the polyfill.

// For Chrome (service worker): Import all modules using importScripts
if (typeof importScripts !== 'undefined') {
  importScripts(
    'src/background/config.js',
    'src/background/triage.js',
    'src/background/events.js', 
    'src/background/listeners.js',
    'src/background/cleanup.js',
    'src/background/init.js'
  );
}

// Start the extension initialization
self.InitModule.initialize();