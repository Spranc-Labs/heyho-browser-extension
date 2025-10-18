// background.js
// This is the service worker entry point for the HeyHo Extension.
// It uses the browser.* namespace for cross-browser compatibility via the polyfill.

// For Chrome (service worker): Import all modules using importScripts
if (typeof importScripts !== 'undefined') {
  importScripts(
    'browser-polyfill.js',
    'src/aggregation/utils.js',
    'src/aggregation/models.js',
    'src/aggregation/storage.js',
    'src/aggregation/processor.js',
    'src/background/storage.js',
    'src/background/config.js',
    'src/background/categorizer.js',
    'src/background/metadata-handler.js',
    'src/background/api-client.js',
    'src/background/auth-manager.js',
    'src/background/auth-handlers.js',
    'src/background/sync-manager.js',
    'src/background/sync-handlers.js',
    'src/background/triage.js',
    'src/background/events.js',
    'src/background/anonymousId.js',
    'src/background/aggregator.js',
    'src/background/heartbeat.js',
    'src/background/debug.js',
    'src/background/listeners.js',
    'src/background/cleanup.js',
    'src/background/init.js'
  );
}

// Start the extension initialization
self.InitModule.initialize();