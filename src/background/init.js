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
 * Recover active session from previous browser session
 */
async function recoverActiveSession() {
  try {
    const storage = (typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local);
    const result = await storage.get('activeVisit');
    
    if (result.activeVisit) {
      console.log('📚 Found active visit from previous session, completing it...');
      
      // Create a page visit and complete it
      const { PageVisit } = self;
      const recoveredVisit = new PageVisit(result.activeVisit);
      recoveredVisit.complete(Date.now());
      
      // Save the completed visit
      const visitsResult = await storage.get('pageVisits');
      const pageVisits = visitsResult.pageVisits || [];
      pageVisits.push(recoveredVisit.toJSON());
      
      await storage.set({ 
        pageVisits,
        activeVisit: null  // Clear the active visit
      });
      
      console.log('✅ Recovered and completed previous session visit');
    }
  } catch (error) {
    console.error('Failed to recover active session:', error);
  }
}

/**
 * Setup periodic token validation alarm
 * Checks token expiry every 15 minutes and refreshes if needed
 */
async function setupTokenValidationAlarm() {
  const { IS_DEV_MODE } = self.ConfigModule;

  try {
    // Create alarm that fires every 15 minutes
    await chrome.alarms.create('token-validation', {
      periodInMinutes: 15
    });

    // Set up listener for token validation alarm
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'token-validation') {
        if (IS_DEV_MODE) {
          console.log('⏰ Token validation alarm triggered');
        }

        // Check if user is authenticated
        if (self.AuthManager && self.AuthManager.isAuthenticated()) {
          // Ensure we have a valid token (will refresh if expiring soon)
          const validToken = await self.AuthManager.ensureValidToken();

          if (validToken) {
            if (IS_DEV_MODE) {
              console.log('✅ Token validation successful');
            }
          } else {
            if (IS_DEV_MODE) {
              console.log('⚠️ Token validation failed - user logged out');
            }
          }
        }
      }
    });

    if (IS_DEV_MODE) {
      console.log('✅ Token validation alarm configured (every 15 minutes)');
    }
  } catch (error) {
    console.error('Failed to setup token validation alarm:', error);
  }
}

/**
 * Run the complete initialization sequence
 */
async function initialize() {
  const { IS_DEV_MODE } = self.ConfigModule;
  const { performCleanup, setupCleanupAlarm, setupCleanupAlarmListener } = self.CleanupModule;
  const { setupTabListeners, setupMessageListener } = self.ListenersModule;
  const { init: initAggregator } = self.aggregator;
  const { init: initHeartbeat } = self.HeartbeatModule;
  const { setupDebugMessageHandlers } = self.DebugModule;
  const { init: initAuthManager } = self.AuthManager;
  const { setupAuthMessageHandlers } = self.AuthHandlers;
  const { init: initSyncManager, setupSyncAlarm } = self.SyncManager;
  const { setupSyncMessageHandlers } = self.SyncHandlers;
  const { init: initMetadataHandler } = self.MetadataHandler || {};

  // Log service worker lifecycle
  const startTime = Date.now();
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 SERVICE WORKER STARTING');
  console.log(`   Time: ${new Date(startTime).toLocaleTimeString()}`);
  console.log('═══════════════════════════════════════════════');

  console.log('🚀 HeyHo background script loaded and ready to track events!');
  if (IS_DEV_MODE) {
    console.log('📝 Dev mode is enabled - you will see event logs and tables');
  }

  // Initialize storage
  await initializeStorage();

  // Initialize authentication manager
  await initAuthManager();
  if (IS_DEV_MODE) {
    console.log('✅ Authentication manager initialized');
  }

  // Setup auth message handlers
  setupAuthMessageHandlers();

  // Initialize sync manager
  await initSyncManager();
  if (IS_DEV_MODE) {
    console.log('✅ Sync manager initialized');
  }

  // Setup periodic data sync alarm (every 5 minutes)
  await setupSyncAlarm();
  if (IS_DEV_MODE) {
    console.log('✅ Data sync alarm configured');
  }

  // Setup sync message handlers
  setupSyncMessageHandlers();
  
  // Run data migration for anonymous client ID (if module is available)
  if (self.AnonymousIdModule && self.AnonymousIdModule.migrateExistingData) {
    try {
      await self.AnonymousIdModule.migrateExistingData();
      if (IS_DEV_MODE) {
        console.log('✅ Anonymous client ID migration completed');
      }
    } catch (error) {
      console.error('❌ Anonymous client ID migration failed:', error);
    }
  }
  
  // Initialize the aggregation system
  await initAggregator();

  // Recover any active visit from previous session
  await recoverActiveSession();

  // Initialize metadata handler
  if (initMetadataHandler) {
    initMetadataHandler();
    if (IS_DEV_MODE) {
      console.log('✅ Metadata handler initialized');
    }
  }

  // Initialize the heartbeat system for engagement tracking
  await initHeartbeat();
  if (IS_DEV_MODE) {
    console.log('❤️ Heartbeat system initialized for engagement tracking');
  }

  // Setup debug message handlers
  setupDebugMessageHandlers();

  // Setup message listener for content scripts
  setupMessageListener();
  
  // Run initial cleanup on startup to handle any old data
  if (IS_DEV_MODE) {
    console.log('🚀 Running initial cleanup on startup...');
  }
  await performCleanup();
  
  // Set up recurring cleanup alarm
  await setupCleanupAlarm();

  // Set up cleanup alarm listener
  setupCleanupAlarmListener();

  // Set up periodic token validation (every 15 minutes)
  await setupTokenValidationAlarm();

  // Set up all tab event listeners
  setupTabListeners();

  // Log completion
  const endTime = Date.now();
  console.log('═══════════════════════════════════════════════');
  console.log('✅ SERVICE WORKER INITIALIZED');
  console.log(`   Initialization took: ${endTime - startTime}ms`);
  console.log('═══════════════════════════════════════════════');
}

// Export for browser environment
self.InitModule = {
  initialize
};

// Add service worker lifecycle logging
if (typeof self !== 'undefined') {
  // Log when service worker is installed
  self.addEventListener('install', (_event) => {
    console.log('🔧 SERVICE WORKER INSTALLED');
  });

  // Log when service worker is activated
  self.addEventListener('activate', (_event) => {
    console.log('🟢 SERVICE WORKER ACTIVATED');
  });
}