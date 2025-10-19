# Anonymous Client ID Implementation & Migration Strategy

## Overview

This document outlines the implementation of anonymous client ID functionality in the HeyHo browser extension to support the anonymous-to-verified user claiming process described in the backend architecture.

## Implementation Details

### 1. Anonymous Client ID Module (`src/background/anonymousId.js`)

**Key Features:**
- Generates UUID v4 anonymous client IDs using `crypto.randomUUID()`
- Stores anonymous ID in `chrome.storage.local` with key `anonymousClientId`
- Provides migration functionality for existing data
- Tracks migration status to prevent duplicate migrations

**Core Functions:**
- `getOrCreateAnonymousId()` - Gets existing or creates new anonymous ID
- `migrateExistingData()` - One-time migration of existing data
- `clearAnonymousId()` - Clears ID after account linking
- `isMigrationCompleted()` - Checks if migration was already performed

### 2. Data Model Updates

**CoreEvent Model (events.js):**
```javascript
{
  id: `evt_${timestamp}_${tabId}`,
  timestamp: Date.now(),
  type: 'CREATE|ACTIVATE|NAVIGATE|CLOSE|HEARTBEAT',
  tabId: number,
  url: string,
  domain: string,
  anonymousClientId: string,  // ← NEW FIELD
  // Additional metadata...
}
```

**PageVisit Model (models.js):**
```javascript
class PageVisit {
  constructor(data) {
    // ... existing fields
    this.anonymousClientId = data.anonymousClientId;  // ← NEW FIELD
  }
}
```

**TabAggregate Model (models.js):**
```javascript
class TabAggregate {
  constructor(data) {
    // ... existing fields
    this.anonymousClientId = data.anonymousClientId;  // ← NEW FIELD
  }
}
```

### 3. Event Collection Updates

**All event listeners updated to be async:**
- Tab created events
- Tab activated events  
- Tab navigation events
- Tab closed events
- Heartbeat events

**Event creation now async:**
```javascript
// Before
const eventObject = createCoreEvent('CREATE', tab.id, tab.url);

// After
const eventObject = await createCoreEvent('CREATE', tab.id, tab.url);
```

### 4. Migration Strategy

**Automatic Migration on Extension Startup:**
- Runs during extension initialization (`init.js`)
- Checks `migrationCompleted` flag to prevent duplicate runs
- Migrates both IndexedDB and Chrome Storage data

**Migration Process:**

1. **IndexedDB Migration:**
   - Retrieves all existing events
   - Adds `anonymousClientId` to events that don't have it
   - Updates events in place (delete old, insert updated)

2. **Chrome Storage Migration:**
   - Updates `pageVisits` array items
   - Updates `tabAggregates` object values
   - Updates `pendingEvents` array items

3. **Migration Completion:**
   - Sets `migrationCompleted: true` in Chrome storage
   - Prevents future migration runs

## Migration Handling for Existing Users

### Scenario 1: Fresh Installation
- New anonymous ID generated on first use
- All new data automatically tagged with anonymous ID
- No migration needed

### Scenario 2: Existing Users (Upgrade)
- Extension detects missing anonymous IDs on startup
- Generates single anonymous ID for the user
- Migrates ALL existing data to include this ID
- Sets migration complete flag
- Future data automatically includes anonymous ID

### Migration Safety Features

**Idempotent Migration:**
- Multiple migration runs won't duplicate data
- Checks for existing `anonymousClientId` before updating
- Uses `migrationCompleted` flag to prevent re-runs

**Error Handling:**
- Migration wrapped in try-catch blocks
- Logs detailed error information
- Fails gracefully without breaking extension

**Data Integrity:**
- Uses atomic operations where possible
- Maintains existing data structure
- Only adds new field, doesn't modify existing fields

## Data Flow with Anonymous ID

### Before User Authentication
```
Browser Event → CoreEvent (with anonymousClientId) → IndexedDB
                    ↓
              Aggregation Processing
                    ↓
           PageVisit/TabAggregate (with anonymousClientId) → Chrome Storage
```

### After User Authentication (Future Implementation)
```
User Login → JWT Token → API Call to /api/v1/users/claim-anonymous-data
                              ↓
                    Backend Associates All Data
                              ↓
                    Extension Clears Anonymous ID
```

## Backend Integration Points

**Data Export Structure:**
All exported data now includes `anonymousClientId` field:
```javascript
{
  exportedAt: "2025-09-12T...",
  rawEvents: [{ ..., anonymousClientId: "uuid" }],
  pageVisits: [{ ..., anonymousClientId: "uuid" }],
  tabAggregates: { tabId: { ..., anonymousClientId: "uuid" } }
}
```

**API Integration Ready:**
- All data structures prepared for backend consumption
- Anonymous ID consistently applied across all data types
- Ready for claiming API implementation

## Verification & Testing

**Migration Verification:**
1. Install extension with existing data
2. Check browser console for migration logs
3. Verify all data has `anonymousClientId` field
4. Confirm migration only runs once

**New Data Verification:**
1. Generate new browser events
2. Verify all events include `anonymousClientId`
3. Check aggregated data includes anonymous ID
4. Confirm consistent ID across all data types

## Files Modified

```
browser-extension/
├── background.js                     # Added anonymousId.js import
├── src/background/
│   ├── anonymousId.js               # NEW: Anonymous ID management
│   ├── events.js                    # Updated: Async createCoreEvent
│   ├── listeners.js                 # Updated: Async event listeners  
│   ├── heartbeat.js                 # Updated: Async heartbeat events
│   └── init.js                      # Updated: Migration on startup
├── src/aggregation/
│   ├── models.js                    # Updated: Added anonymousClientId fields
│   └── processor.js                 # Updated: Pass anonymousClientId to models
└── ANONYMOUS_CLIENT_ID_IMPLEMENTATION.md  # NEW: This documentation
```

## Summary

The implementation successfully:

1. ✅ **Added anonymous client ID to all data structures**
2. ✅ **Implemented automatic migration for existing users**
3. ✅ **Maintained backward compatibility**
4. ✅ **Prepared data for backend claiming process**
5. ✅ **Added proper error handling and logging**

The extension is now ready to support the anonymous-to-verified user claiming flow described in the backend architecture, ensuring no user data is lost during the account creation process.