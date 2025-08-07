# Phase 1, Step 2: IndexedDB Setup

**Parent-Phase:** [Phase 1: The Foundation - Core Tracking (MVP)](./1-basic-extension-setup.md)  
**Status:** Not Started

## Objective

To create a robust, reusable storage module (`storage.js`) that handles all interactions with the browser's IndexedDB. This module will be responsible for initializing the database and providing a simple, asynchronous function to add single `CoreEvent` objects to it.

This step is critical for ensuring data is persisted safely and immediately, which is a requirement for a Manifest V3 service worker environment.

---

## Technical Requirements

### 1. File Creation

- A new file named `storage.js` will be created in the project's source directory (e.g., `/src/background/storage.js`). This module will export the necessary functions.

### 2. Database Connection and Initialization

- The module must manage the opening and versioning of the IndexedDB database.
- A function, let's call it `initDB()`, will be the core of this module.
- **Database Name:** `Heyho_EventsDB`
- **Database Version:** `1`
- This function will return a `Promise` that resolves with the database instance when it's successfully opened and ready.

### 3. Object Store and Index Creation

- During the database initialization (specifically within the `onupgradeneeded` event handler), the module must create the primary object store.
- **Object Store Name:** `events`
- **Key Path:** The `id` property of the event objects will be the unique key. The store should be configured to use this as its `keyPath`.
- **Indexes:** Two indexes must be created on the `events` object store to allow for efficient querying later:
    1.  **`timestamp_idx`**: An index on the `timestamp` property.
    2.  **`domain_idx`**: An index on the `domain` property.

### 4. Event Creation Function

- The module must export an `async` function named `addEvent`.
- **Signature:** `async function addEvent(eventObject)`
- **Functionality:**
    - It takes a single JavaScript object, `eventObject`, as its argument. This object is expected to conform to the `CoreEvent` model.
    - It will open a `'readwrite'` transaction with the `events` object store.
    - It will add the `eventObject` to the store using the `.add()` method.
    - The function should handle the success or failure of the write operation, returning a `Promise` that resolves when the write is complete or rejects on error.

---

## Data Model: The `CoreEvent` Object

The `addEvent` function will be designed to store objects with the following structure.

```javascript
{
  id: "evt_1678886400000_123", // A unique string identifier
  timestamp: 1678886400000,     // Milliseconds since Unix epoch
  type: "CREATE" | "ACTIVATE" | "NAVIGATE" | "HEARTBEAT" | "CLOSE",
  tabId: 123,                   // The browser's ID for the tab
  url: "https://www.example.com/path",
  domain: "www.example.com"
}
```

---

## Acceptance Criteria

-   **AC1:** A `storage.js` file exists and contains the database initialization and `addEvent` logic.
-   **AC2:** When the extension is loaded, running a test snippet from the background script that calls `addEvent` successfully adds a `CoreEvent` object to IndexedDB.
-   **AC3:** The developer can verify AC2 by using the browser's Developer Tools (Application > Storage > IndexedDB) to inspect the database. The `Heyho_EventsDB` database should exist with an `events` object store containing the test object.
-   **AC4:** The `events` object store correctly shows `id` as the key path and has `timestamp_idx` and `domain_idx` listed under its indexes.

## Cross-Browser Note

The IndexedDB API is a web standard and is highly consistent across modern browsers (Chrome, Firefox, Edge). Unlike other WebExtension APIs, you generally do not need a polyfill or namespace (`browser.*` vs `chrome.*`) for IndexedDB code itself. The global `indexedDB` object can be used directly.
