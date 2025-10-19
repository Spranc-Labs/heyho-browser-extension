# Phase 2, Step 2: Aggregation System PRD

**Product Requirements Document**

**Goal:** Implement a robust, two-tiered aggregation system that processes raw `CoreEvent`s into structured, insightful, and permanent records. This system is the core of the extension's intelligence, turning low-level data into high-level understanding of user behavior.

---

### 1. The "Why": User Stories

This feature is for users who want to move beyond a simple history log and understand the *story* behind their browsing.

-   **As a user, I want to know exactly how long I spent on a specific article or page**, so I can gauge how deeply I engaged with it.
-   **As a user, I want to see the complete journey I took within a single tab**, so I can retrace my steps during a research session.
-   **As a user, I want the extension to understand when I switch tasks**, so I can later see how different projects or workflows intertwine.
-   **As a user, I want all this processing to happen silently in the background**, so it never slows down my computer or browsing experience.

---

### 2. The "What": System and Data Model

Two new object stores (tables) must be created in IndexedDB to permanently store the processed data.

#### 2.1. `pageVisits` (The Ledger)

This store contains the detailed, chronological history of every page a user looks at.

-   **Purpose:** To provide a granular, step-by-step record of the user's journey. This is the source of truth for time-on-page and navigation paths.
-   **Primary Key:** `visitId` (A unique string, e.g., `pv_${timestamp}_${tabId}`)

**Schema:**

```javascript
{
  "visitId": "pv_1678887724000_123",
  "tabId": 123,
  "url": "https://en.wikipedia.org/wiki/Browser_extension",
  "domain": "en.wikipedia.org",
  "startedAt": 1678887724000, // Timestamp of the ACTIVATE or NAVIGATE event that started this visit
  "endedAt": 1678887844000,   // Timestamp of the event that ended this visit (can be null if active)
  "durationSeconds": 120      // Calculated as (endedAt - startedAt)
}
```

#### 2.2. `tabAggregates` (The Trip Summary)

This store contains a high-level summary for the entire lifecycle of a single tab.

-   **Purpose:** To provide a quick, at-a-glance overview of a tab's history and its relationship to other tabs.
-   **Primary Key:** `tabId`

**Schema:**

```javascript
{
  "tabId": 123,
  "isOpen": true,
  "createdAt": 1678887605000,       // Timestamp of the initial CREATE event
  "closedAt": null,               // Timestamp of the CLOSE event
  "initialUrl": "https://www.google.com/",
  "lastUrl": "https://en.wikipedia.org/wiki/Main_Page",
  "totalActiveSeconds": 0,        // Sum of durationSeconds from all its child pageVisits
  "navigationCount": 0,           // Total number of NAVIGATE events
  "openedByTabId": null,          // The tabId that opened this one (from openerTabId)
  "openedTabs": []                // An array of tabIds that this tab has opened
}
```

---

### 3. The "How": Technical Implementation

A new background module, `src/background/aggregator.js`, will be created.

#### 3.1. The Alarm (`chrome.alarms`)

-   An alarm named `aggregate` will be created to run periodically every **5 minutes**.
-   This alarm will trigger the main `processEvents()` function.

#### 3.2. The Aggregation Function (`processEvents()`)

This function is the heart of the batch process. It will execute the following steps:

1.  **Fetch Raw Events:** Get all records from the `events` object store.
2.  **Sort Events:** Sort the events chronologically by `timestamp`.
3.  **Process Sequentially:** Iterate through each event and update the `pageVisits` and `tabAggregates` stores.
4.  **Transaction Management:** All database writes within a single batch must be wrapped in a single IndexedDB transaction to ensure data integrity. If any step fails, the entire transaction should be rolled back.
5.  **Delete Processed Events:** After the transaction successfully completes, delete the processed events from the `events` store.

#### 3.3. State Management

-   The aggregator must persist the `currentlyActiveTabId` and its `visitId` between batches. This will be stored in `chrome.storage.local` to ensure it survives service worker termination.
    -   `{ "activeVisit": { "tabId": 123, "visitId": "pv_..." } }`

#### 3.4. Core Processing Logic (Detailed)

-   **On `CREATE`:** Create a new `TabAggregate` record. Set `createdAt`, `initialUrl`, and `isOpen: true`. If `openerTabId` exists, find the parent `TabAggregate` and add the new `tabId` to its `openedTabs` array.
-   **On `ACTIVATE`:**
    1.  Read the `activeVisit` from `chrome.storage.local` to identify the previously active tab and visit.
    2.  End the last `PageVisit` for the previous tab (set `endedAt`, calculate `duration`, update `totalActiveSeconds` on its `TabAggregate`).
    3.  Start a new `PageVisit` for the newly activated tab.
    4.  Update the `activeVisit` in `chrome.storage.local` with the new `tabId` and `visitId`.
-   **On `NAVIGATE`:**
    1.  End the current `PageVisit` for that tab (as described above).
    2.  Start a new `PageVisit` with the new URL.
    3.  Increment `navigationCount` on the `TabAggregate` and update its `lastUrl`.
    4.  Update the `activeVisit` in `chrome.storage.local`.
-   **On `CLOSE`:**
    1.  End the final `PageVisit` for the tab.
    2.  Update the `TabAggregate`: set `isOpen: false` and `closedAt`.
    3.  If the closed tab was the active tab, clear the `activeVisit` from `chrome.storage.local`.

---

### 4. The "How Much": Success Metrics

-   **Data Integrity:** After a 24-hour period, the sum of `durationSeconds` in the `pageVisits` table for a given tab must equal the `totalActiveSeconds` in its corresponding `tabAggregates` record.
-   **Data Completeness:** No `CoreEvent`s should remain in the `events` table for more than 10 minutes (allowing for two cycles of the aggregator to run).
-   **Performance:** The entire `processEvents()` function should execute in under 5 seconds, even with a backlog of several thousand `CoreEvent`s.