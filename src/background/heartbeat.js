/**
 * Heartbeat Module for User Engagement Tracking
 * 
 * Implements periodic checks to determine if user is actively engaged
 * Uses chrome.idle API and tab audible property for smart engagement detection
 */

// Configuration
const HEARTBEAT_CONFIG = {
  intervalMs: 30000,        // Check every 30 seconds
  idleThreshold: 15,        // User idle after 15 seconds of inactivity (reduced for testing)
  storageKey: 'heartbeats', // Storage key for heartbeat data
  maxHeartbeats: 100,       // Keep last 100 heartbeats in circular buffer
  alarmName: 'heartbeat-wake', // Alarm name for wake mechanism
  alarmIntervalMinutes: 1   // Wake alarm fires every 1 minute
};

// Module state
let heartbeatInterval = null;
let heartbeatBuffer = [];
let isInitialized = false;
let lastHeartbeatTimestamp = 0;

/**
 * Initialize the heartbeat system
 */
async function initHeartbeat() {
  if (isInitialized) {
    console.log('⚠️ Heartbeat system already initialized, recovering if needed...');
    await ensureHeartbeatRunning();
    return;
  }

  try {
    console.log('🚀 Initializing heartbeat system...');

    // Load existing heartbeats from storage
    await loadHeartbeats();

    // Set idle detection threshold
    chrome.idle.setDetectionInterval(HEARTBEAT_CONFIG.idleThreshold);

    // Setup wake alarm for service worker dormancy
    await setupWakeAlarm();

    // Start periodic heartbeat checks
    startHeartbeatInterval();

    isInitialized = true;
    console.log('✅ Heartbeat system initialized');

  } catch (error) {
    console.error('❌ Failed to initialize heartbeat system:', error);
  }
}

/**
 * Setup wake alarm for service worker dormancy recovery
 */
async function setupWakeAlarm() {
  try {
    // Clear any existing alarm
    await chrome.alarms.clear(HEARTBEAT_CONFIG.alarmName);

    // Create periodic alarm to wake service worker
    await chrome.alarms.create(HEARTBEAT_CONFIG.alarmName, {
      periodInMinutes: HEARTBEAT_CONFIG.alarmIntervalMinutes
    });

    console.log(`✅ Wake alarm created: fires every ${HEARTBEAT_CONFIG.alarmIntervalMinutes} minute(s)`);
  } catch (error) {
    console.error('❌ Failed to setup wake alarm:', error);
  }
}

/**
 * Ensure heartbeat is running (recovery mechanism)
 */
async function ensureHeartbeatRunning() {
  const now = Date.now();
  const timeSinceLastHeartbeat = now - lastHeartbeatTimestamp;
  const expectedInterval = HEARTBEAT_CONFIG.intervalMs;

  // If more than 2x the expected interval has passed, the interval likely died
  if (timeSinceLastHeartbeat > expectedInterval * 2) {
    console.log(`⚠️ Heartbeat interval appears dormant (${Math.round(timeSinceLastHeartbeat / 1000)}s since last beat)`);
    console.log('🔄 Restarting heartbeat interval...');
    startHeartbeatInterval();
  } else if (heartbeatInterval === null) {
    console.log('⚠️ Heartbeat interval is null, restarting...');
    startHeartbeatInterval();
  } else {
    console.log('✅ Heartbeat interval is running normally');
  }
}

/**
 * Start the heartbeat interval
 */
function startHeartbeatInterval() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Initial heartbeat
  generateHeartbeat();

  // Set up periodic heartbeats
  heartbeatInterval = setInterval(async () => {
    await generateHeartbeat();
  }, HEARTBEAT_CONFIG.intervalMs);

  console.log(`💓 Heartbeat interval started: every ${HEARTBEAT_CONFIG.intervalMs / 1000} seconds`);
}

/**
 * Stop the heartbeat system
 */
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('Heartbeat system stopped');
  }
}

/**
 * Generate a single heartbeat event
 */
async function generateHeartbeat() {
  try {
    // Update last heartbeat timestamp
    lastHeartbeatTimestamp = Date.now();

    // Query idle state
    const idleState = await chrome.idle.queryState(HEARTBEAT_CONFIG.idleThreshold);

    // Get active tab information
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    // Get focused window
    const windows = await chrome.windows.getCurrent();
    const windowFocused = windows.focused;

    // Create heartbeat event
    const heartbeat = {
      type: 'heartbeat',
      timestamp: lastHeartbeatTimestamp,
      idleState: idleState,
      activeTabId: activeTab?.id || null,
      activeTabUrl: activeTab?.url || null,
      audible: activeTab?.audible || false,
      windowFocused: windowFocused,
      engagement: calculateEngagement(idleState, activeTab, windowFocused)
    };

    // Add to buffer
    await addHeartbeat(heartbeat);
    
    // Create and save heartbeat event through the EventsModule for proper triage and storage
    if (self.EventsModule && self.EventsModule.createCoreEvent && 
        self.EventsModule.logAndSaveEvent) {
      const heartbeatEvent = await self.EventsModule.createCoreEvent(
        'HEARTBEAT', 
        activeTab?.id || 0, 
        activeTab?.url || '', 
        {
          idleState: idleState,
          audible: activeTab?.audible || false,
          windowFocused: windowFocused,
          engagement: calculateEngagement(idleState, activeTab, windowFocused)
        }
      );
      
      await self.EventsModule.logAndSaveEvent(heartbeatEvent);
    }
    
    return heartbeat;
    
  } catch (error) {
    console.error('Failed to generate heartbeat:', error);
    return null;
  }
}

/**
 * Calculate engagement based on current state
 */
function calculateEngagement(idleState, activeTab, windowFocused) {
  // Computer is locked - definitely not engaged
  if (idleState === 'locked') {
    return {
      isEngaged: false,
      reason: 'locked',
      confidence: 1.0
    };
  }
  
  // User is actively using computer
  if (idleState === 'active') {
    return {
      isEngaged: true,
      reason: 'active',
      confidence: windowFocused ? 1.0 : 0.7
    };
  }
  
  // User is idle but audio is playing - likely still engaged
  if (idleState === 'idle' && activeTab?.audible) {
    return {
      isEngaged: true,
      reason: 'audio',
      confidence: 0.8
    };
  }
  
  // User is idle with no audio - not engaged
  return {
    isEngaged: false,
    reason: 'idle',
    confidence: 0.9
  };
}

/**
 * Add heartbeat to buffer with circular buffer logic
 */
async function addHeartbeat(heartbeat) {
  // Add to buffer
  heartbeatBuffer.push(heartbeat);
  
  // Maintain circular buffer size
  if (heartbeatBuffer.length > HEARTBEAT_CONFIG.maxHeartbeats) {
    heartbeatBuffer = heartbeatBuffer.slice(-HEARTBEAT_CONFIG.maxHeartbeats);
  }
  
  // Save to storage periodically (every 10 heartbeats)
  if (heartbeatBuffer.length % 10 === 0) {
    await saveHeartbeats();
  }
}

/**
 * Save heartbeats to storage
 */
async function saveHeartbeats() {
  try {
    await chrome.storage.local.set({
      [HEARTBEAT_CONFIG.storageKey]: heartbeatBuffer
    });
  } catch (error) {
    console.error('Failed to save heartbeats:', error);
  }
}

/**
 * Load heartbeats from storage
 */
async function loadHeartbeats() {
  try {
    const result = await chrome.storage.local.get(HEARTBEAT_CONFIG.storageKey);
    heartbeatBuffer = result[HEARTBEAT_CONFIG.storageKey] || [];
    console.log(`Loaded ${heartbeatBuffer.length} heartbeats from storage`);
  } catch (error) {
    console.error('Failed to load heartbeats:', error);
    heartbeatBuffer = [];
  }
}

/**
 * Get recent heartbeats for analysis
 */
function getRecentHeartbeats(count = 10) {
  return heartbeatBuffer.slice(-count);
}

/**
 * Get engagement statistics from recent heartbeats
 */
function getEngagementStats() {
  if (heartbeatBuffer.length === 0) {
    return {
      totalHeartbeats: 0,
      engagedCount: 0,
      engagementRate: 0,
      recentEngagement: null
    };
  }
  
  const engagedCount = heartbeatBuffer.filter(h => h.engagement.isEngaged).length;
  const engagementRate = engagedCount / heartbeatBuffer.length;
  const recentEngagement = heartbeatBuffer[heartbeatBuffer.length - 1]?.engagement;
  
  return {
    totalHeartbeats: heartbeatBuffer.length,
    engagedCount,
    engagementRate,
    recentEngagement,
    idleStates: countIdleStates(),
    audioEngagement: countAudioEngagement()
  };
}

/**
 * Count occurrences of each idle state
 */
function countIdleStates() {
  const counts = { active: 0, idle: 0, locked: 0 };
  
  for (const heartbeat of heartbeatBuffer) {
    counts[heartbeat.idleState] = (counts[heartbeat.idleState] || 0) + 1;
  }
  
  return counts;
}

/**
 * Count audio engagement
 */
function countAudioEngagement() {
  return heartbeatBuffer.filter(h => h.audible).length;
}

/**
 * Clear all heartbeat data
 */
async function clearHeartbeats() {
  heartbeatBuffer = [];
  await chrome.storage.local.remove(HEARTBEAT_CONFIG.storageKey);
  console.log('Heartbeat data cleared');
}

/**
 * Manual heartbeat trigger for testing
 */
async function triggerHeartbeat() {
  console.log('Manual heartbeat triggered');
  return await generateHeartbeat();
}

/**
 * Handle alarm events for wake mechanism
 */
function handleAlarm(alarm) {
  if (alarm.name === HEARTBEAT_CONFIG.alarmName) {
    console.log('⏰ Wake alarm fired, checking heartbeat status...');
    ensureHeartbeatRunning();
  }
}

/**
 * Setup alarm listener
 */
function setupAlarmListener() {
  if (chrome.alarms && chrome.alarms.onAlarm) {
    chrome.alarms.onAlarm.addListener(handleAlarm);
    console.log('✅ Alarm listener registered for heartbeat wake events');
  }
}

// Export the heartbeat module
self.HeartbeatModule = {
  init: initHeartbeat,
  stop: stopHeartbeat,
  trigger: triggerHeartbeat,
  getRecent: getRecentHeartbeats,
  getStats: getEngagementStats,
  clear: clearHeartbeats,
  ensureRunning: ensureHeartbeatRunning,
  setupAlarmListener: setupAlarmListener,
  // Expose for testing
  _calculateEngagement: calculateEngagement,
  _config: HEARTBEAT_CONFIG
};

// Setup alarm listener immediately
setupAlarmListener();

// Auto-initialize if this is the main heartbeat module
if (typeof self.heartbeatInitialized === 'undefined') {
  self.heartbeatInitialized = true;
  // Don't auto-init, let background.js control initialization
  console.log('Heartbeat module loaded, alarm listener ready, waiting for initialization');
}