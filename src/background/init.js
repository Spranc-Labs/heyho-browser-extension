/**
 * Initialization Module for HeyHo Extension
 * 
 * Handles the startup and initialization sequence.
 */

/**
 * Initialize storage when background script loads
 */
async function initializeStorage() {
  const { IS_DEV_MODE } = self.ConfigModule;
  
  try {
    const { initDB } = self.StorageModule;
    await initDB();
    if (IS_DEV_MODE) {
      console.log('IndexedDB initialized successfully');
    }
  } catch (error) {
    console.error('Storage initialization failed:', error);
  }
}

/**
 * Run the complete initialization sequence
 */
async function initialize() {
  const { IS_DEV_MODE } = self.ConfigModule;
  const { performCleanup, setupCleanupAlarm, setupCleanupAlarmListener } = self.CleanupModule;
  const { setupTabListeners } = self.ListenersModule;
  const { initAggregator } = self.AggregatorModule;
  
  console.log('🚀 HeyHo background script loaded and ready to track events!');
  if (IS_DEV_MODE) {
    console.log('📝 Dev mode is enabled - you will see event logs and tables');
  }
  
  // Initialize storage
  await initializeStorage();
  
  // Initialize the aggregation system
  await initAggregator();
  
  // Run initial cleanup on startup to handle any old data
  if (IS_DEV_MODE) {
    console.log('🚀 Running initial cleanup on startup...');
  }
  await performCleanup();
  
  // Set up recurring cleanup alarm
  await setupCleanupAlarm();
  
  // Set up cleanup alarm listener
  setupCleanupAlarmListener();
  
  // Set up all tab event listeners
  setupTabListeners();
}

// Export for browser environment
self.InitModule = {
  initialize
};