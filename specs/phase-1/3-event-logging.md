# Phase 1, Step 3: Implement "Fire-and-Forget" Event Logging

**Parent-Phase:** [Phase 1: The Foundation - Core Tracking (MVP)](./1-basic-extension-setup.md)  
**Depends On:** [Step 2: IndexedDB Setup](./2-indexeddb-setup.md)  
**Status:** Not Started

## Objective

To implement the core logic in `background.js` that listens for key browser tab events. For each event, a `CoreEvent` object will be created and immediately persisted to IndexedDB using the `addEvent` function from the `storage.js` module. This step also includes a special "dev mode" for logging, which will provide real-time feedback that the system is working as expected.

---

## Technical Requirements

### 1. Module Imports

-   The `background.js` script must ensure that the `StorageModule` (from `storage.js`) is available in its scope.

### 2. Event Listeners

The following event listeners from the `tabs` API must be implemented.

-   **`browser.tabs.onCreated.addListener(tab => { ... })`**
    -   **Trigger:** When a new tab is created.
    -   **Action:** Create and save a `CoreEvent` with `type: 'CREATE'`. The `tab` object provided by the listener contains all necessary information (`tab.id`, `tab.url`).

-   **`browser.tabs.onActivated.addListener(activeInfo => { ... })`**
    -   **Trigger:** When the user switches focus to a different tab.
    -   **Action:** Create and save a `CoreEvent` with `type: 'ACTIVATE'`. The `activeInfo` object contains the `tabId`. You will need to make a separate call to `browser.tabs.get(activeInfo.tabId)` to retrieve the tab's URL.

-   **`browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { ... })`**
    -   **Trigger:** When a tab's properties change.
    -   **Action:** This listener must be filtered. Create and save a `CoreEvent` with `type: 'NAVIGATE'` **only if `changeInfo.url` exists**. This ensures we only capture actual URL navigations, not other updates like title or favicon changes.

-   **`browser.tabs.onRemoved.addListener(tabId => { ... })`**
    -   **Trigger:** When a tab is closed.
    -   **Action:** Create and save a `CoreEvent` with `type: 'CLOSE'`. The listener only provides the `tabId`. The URL information will not be available and can be omitted or retrieved from a temporary state if necessary (for this phase, omitting is acceptable).

### 3. `CoreEvent` Object Creation

For each event, a `CoreEvent` object must be constructed. This involves:

-   **Unique ID Generation:** Create a simple unique ID. A combination of the current timestamp and the tab ID is sufficient. Example: `id: `evt_${Date.now()}_${tab.id}``.
-   **Domain Extraction:** Create a helper function `getDomain(url)` that extracts the hostname from a URL string. This should handle potential errors with invalid URLs (e.g., `about:blank`).
-   **Object Structure:** The final object passed to `addEvent` must match the defined model.

---

## Developer Mode Logging

To facilitate debugging, a simple logging mechanism will be implemented.

### 1. Dev Mode Flag

-   At the top of `background.js`, a global constant `const IS_DEV_MODE = true;` will be defined. All logging functions will be wrapped in an `if (IS_DEV_MODE)` block.

### 2. Log on Add

-   Inside each event listener, immediately after creating the `CoreEvent` object, log it to the console. Example: `console.log('CoreEvent CREATED:', eventObject);`

### 3. First 10 Events Log

-   A temporary, in-memory array `let devLogBuffer = [];` will be created at the global level.
-   After an event is logged, it will also be pushed into this `devLogBuffer`.
-   A condition will check if `devLogBuffer.length <= 10`. If it is, the entire buffer will be logged to the console as a table. Example: `console.table(devLogBuffer);`
-   **Note:** This in-memory buffer is for **debugging only**. It is acceptable for it to be wiped when the service worker terminates. The actual data is safe in IndexedDB.

---

## Acceptance Criteria

-   **AC1:** The four tab event listeners are implemented in `background.js`.
-   **AC2:** When `IS_DEV_MODE` is true, creating, switching, navigating, and closing tabs all result in corresponding log messages in the extension's background console.
-   **AC3:** The console displays a table of the first 10 events captured since the service worker started.
-   **AC4:** After performing some browsing activity, inspecting IndexedDB via developer tools shows multiple `CoreEvent` objects stored correctly in the `events` object store.
