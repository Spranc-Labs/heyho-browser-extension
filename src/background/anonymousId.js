/**
 * Anonymous Client ID Management
 *
 * Handles generation, storage, and retrieval of persistent anonymous client IDs
 * for data collection before user authentication.
 */

const ANONYMOUS_ID_KEY = 'anonymousClientId';
const MIGRATION_STATUS_KEY = 'migrationCompleted';

/**
 * Generates a new anonymous client ID (UUID v4)
 * @returns {string} UUID v4 string
 */
function generateAnonymousId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 generation
  const HEX_BASE = 16;
  const UUID_VERSION_MASK = 0x3;
  const UUID_VARIANT_MASK = 0x8;

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * HEX_BASE) | 0;
    const v = c === 'x' ? r : (r & UUID_VERSION_MASK) | UUID_VARIANT_MASK;
    return v.toString(HEX_BASE);
  });
}

/**
 * Gets or creates an anonymous client ID
 * @returns {Promise<string>} The anonymous client ID
 */
async function getOrCreateAnonymousId() {
  try {
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const result = await storage.get([ANONYMOUS_ID_KEY]);

    if (result[ANONYMOUS_ID_KEY]) {
      console.log('Retrieved existing anonymous ID:', result[ANONYMOUS_ID_KEY]);
      return result[ANONYMOUS_ID_KEY];
    }

    const newId = generateAnonymousId();
    await storage.set({ [ANONYMOUS_ID_KEY]: newId });
    console.log('Created new anonymous ID:', newId);

    return newId;
  } catch (error) {
    console.error('Error managing anonymous ID:', error);
    throw error;
  }
}

/**
 * Gets the current anonymous client ID (returns null if none exists)
 * @returns {Promise<string|null>} The anonymous client ID or null
 */
async function getAnonymousId() {
  try {
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const result = await storage.get([ANONYMOUS_ID_KEY]);
    return result[ANONYMOUS_ID_KEY] || null;
  } catch (error) {
    console.error('Error retrieving anonymous ID:', error);
    return null;
  }
}

/**
 * Clears the anonymous client ID (called after successful account linking)
 * @returns {Promise<void>}
 */
async function clearAnonymousId() {
  try {
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    await storage.remove([ANONYMOUS_ID_KEY]);
    console.log('Anonymous ID cleared after account linking');
  } catch (error) {
    console.error('Error clearing anonymous ID:', error);
    throw error;
  }
}

/**
 * Checks if data migration has been completed
 * @returns {Promise<boolean>}
 */
async function isMigrationCompleted() {
  try {
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const result = await storage.get([MIGRATION_STATUS_KEY]);
    return result[MIGRATION_STATUS_KEY] === true;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Marks migration as completed
 * @returns {Promise<void>}
 */
async function markMigrationCompleted() {
  try {
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    await storage.set({ [MIGRATION_STATUS_KEY]: true });
    console.log('Migration marked as completed');
  } catch (error) {
    console.error('Error marking migration completed:', error);
    throw error;
  }
}

/**
 * Migrates existing data by adding anonymous client ID to all existing records
 * @returns {Promise<void>}
 */
async function migrateExistingData() {
  if (await isMigrationCompleted()) {
    console.log('Migration already completed, skipping');
    return;
  }

  console.log('Starting migration of existing data...');
  const anonymousId = await getOrCreateAnonymousId();

  try {
    // Migrate IndexedDB events
    await migrateIndexedDBData(anonymousId);

    // Migrate Chrome Storage data
    await migrateChromeStorageData(anonymousId);

    await markMigrationCompleted();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Migrates IndexedDB data by adding anonymous client ID
 * @param {string} anonymousId - The anonymous client ID to add
 * @returns {Promise<void>}
 */
async function migrateIndexedDBData(anonymousId) {
  // Use storage functions from global module
  const { getAllEvents, executeTransaction, EVENTS_STORE } = self.StorageModule;

  try {
    const events = await getAllEvents();
    console.log(`Migrating ${events.length} events in IndexedDB`);

    const operations = [];
    let updateCount = 0;

    for (const event of events) {
      if (!event.anonymousClientId) {
        // Create updated event with anonymous client ID
        const updatedEvent = {
          ...event,
          anonymousClientId: anonymousId,
        };

        // Add put operation to update the event
        operations.push({
          type: 'put',
          storeName: EVENTS_STORE,
          data: updatedEvent,
        });
        updateCount++;
      }
    }

    if (operations.length > 0) {
      await executeTransaction(operations);
      console.log(`IndexedDB migration completed: updated ${updateCount} events`);
    } else {
      console.log('IndexedDB migration: no events needed updating');
    }
  } catch (error) {
    console.error('Error migrating IndexedDB data:', error);
    throw error;
  }
}

/**
 * Migrates Chrome Storage data by adding anonymous client ID
 * @param {string} anonymousId - The anonymous client ID to add
 * @returns {Promise<void>}
 */
async function migrateChromeStorageData(anonymousId) {
  try {
    const storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;
    const keys = ['pageVisits', 'tabAggregates', 'pendingEvents', 'activeVisit'];
    const data = await storage.get(keys);

    let updateNeeded = false;
    const updates = {};

    // Migrate page visits
    if (data.pageVisits && Array.isArray(data.pageVisits)) {
      let visitsUpdated = false;
      const migratedVisits = data.pageVisits.map((visit) => {
        if (!visit.anonymousClientId) {
          visitsUpdated = true;
          return { ...visit, anonymousClientId: anonymousId };
        }
        return visit;
      });
      if (visitsUpdated) {
        updates.pageVisits = migratedVisits;
        updateNeeded = true;
        console.log(`Migrated ${migratedVisits.length} page visits`);
      }
    }

    // Migrate tab aggregates (stored as an array, not object)
    if (data.tabAggregates && Array.isArray(data.tabAggregates)) {
      let aggregatesUpdated = false;
      const migratedAggregates = data.tabAggregates.map((aggregate) => {
        if (!aggregate.anonymousClientId) {
          aggregatesUpdated = true;
          return { ...aggregate, anonymousClientId: anonymousId };
        }
        return aggregate;
      });
      if (aggregatesUpdated) {
        updates.tabAggregates = migratedAggregates;
        updateNeeded = true;
        console.log(`Migrated ${migratedAggregates.length} tab aggregates`);
      }
    }

    // Migrate active visit if exists
    if (data.activeVisit && !data.activeVisit.anonymousClientId) {
      updates.activeVisit = { ...data.activeVisit, anonymousClientId: anonymousId };
      updateNeeded = true;
      console.log('Migrated active visit');
    }

    // Migrate pending events
    if (data.pendingEvents && Array.isArray(data.pendingEvents)) {
      let eventsUpdated = false;
      const migratedEvents = data.pendingEvents.map((event) => {
        if (!event.anonymousClientId) {
          eventsUpdated = true;
          return { ...event, anonymousClientId: anonymousId };
        }
        return event;
      });
      if (eventsUpdated) {
        updates.pendingEvents = migratedEvents;
        updateNeeded = true;
        console.log(`Migrated ${migratedEvents.length} pending events`);
      }
    }

    if (updateNeeded) {
      await storage.set(updates);
      console.log('Chrome Storage migration completed successfully');
    } else {
      console.log('No Chrome Storage migration needed - all data already has anonymousClientId');
    }
  } catch (error) {
    console.error('Error migrating Chrome Storage data:', error);
    throw error;
  }
}

// Export module for global access (service worker pattern)
self.AnonymousIdModule = {
  getOrCreateAnonymousId,
  getAnonymousId,
  clearAnonymousId,
  migrateExistingData,
  isMigrationCompleted,
};

// Log successful module loading
console.log('✅ AnonymousIdModule loaded successfully');
