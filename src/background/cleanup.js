/**
 * Cleanup Module for HeyHo Extension
 *
 * Handles the logic for periodically cleaning up old data.
 */

/**
 * Performs cleanup of expired events from IndexedDB
 * Removes events older than 7 days (168 hours)
 */
async function performCleanup() {
  const { IS_DEV_MODE } = self.ConfigModule;
  const startTime = Date.now();

  try {
    const { getExpiredEvents, deleteEvents } = self.StorageModule;

    if (IS_DEV_MODE) {
      console.log('🧹 Starting daily cleanup process...');
    }

    // Get expired events (older than 7 days)
    const expiredEventIds = await getExpiredEvents(168);

    if (expiredEventIds.length === 0) {
      if (IS_DEV_MODE) {
        console.log('✅ Cleanup complete: No expired events found');
      }
      return;
    }

    if (IS_DEV_MODE) {
      console.log(`📊 Found ${expiredEventIds.length} expired events to delete`);
    }

    // Delete expired events
    const deletedCount = await deleteEvents(expiredEventIds);

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (IS_DEV_MODE) {
      console.log('✅ Cleanup complete:', {
        eventsScanned: expiredEventIds.length,
        eventsDeleted: deletedCount,
        durationMs: duration,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
    }
  } catch (error) {
    console.error('❌ Cleanup process failed:', error);

    if (IS_DEV_MODE) {
      console.error('Cleanup error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Set up daily cleanup alarm
 */
async function setupCleanupAlarm() {
  const { IS_DEV_MODE } = self.ConfigModule;

  try {
    // Create daily cleanup alarm that starts 24 hours after extension load
    // and repeats every 24 hours
    await browser.alarms.create('daily-cleanup', {
      delayInMinutes: 24 * 60, // Start after 24 hours
      periodInMinutes: 24 * 60, // Repeat every 24 hours
    });

    if (IS_DEV_MODE) {
      console.log('Daily cleanup alarm created successfully');
    }
  } catch (error) {
    console.error('Failed to create cleanup alarm:', error);
  }
}

/**
 * Sets up the alarm listener for cleanup operations
 */
function setupCleanupAlarmListener() {
  const { IS_DEV_MODE } = self.ConfigModule;

  // Enhanced alarm listener with cleanup handling
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (IS_DEV_MODE) {
      console.log('⏰ Alarm fired:', alarm.name);
    }

    if (alarm.name === 'daily-cleanup') {
      await performCleanup();
    } else if (IS_DEV_MODE) {
      console.log('Unknown alarm fired:', alarm);
    }
  });
}

// Export for browser environment
self.CleanupModule = {
  performCleanup,
  setupCleanupAlarm,
  setupCleanupAlarmListener,
};
