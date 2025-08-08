# Phase 2, Step 1: Triage System Specification

**Goal:** Implement a pre-storage filter (`TriageModule`) to ensure only valuable and meaningful events are saved to IndexedDB. This reduces noise, improves performance, and enforces a "cost-control" mindset from the start.

---

### 1. Technical Implementation

#### 1.1. New File: `src/background/triage.js`

- A new file must be created to house the triage logic.
- This file will define and export a `TriageModule` object, making it available to other background scripts.

#### 1.2. Core Function: `shouldStoreEvent(eventObject)`

- The `TriageModule` must expose a single function: `shouldStoreEvent`.
- **Input:** It accepts one argument, a `CoreEvent` object (as defined in `events.js`).
- **Output:** It returns a `boolean`:
    - `true`: The event is valuable and should be stored.
    - `false`: The event is noise and should be discarded.

#### 1.3. Integration with `events.js`

- The `logAndSaveEvent` function in `src/background/events.js` must be modified.
- It must call `TriageModule.shouldStoreEvent(eventObject)` **before** any logging or saving occurs.
- If the function returns `false`, `logAndSaveEvent` must immediately exit and take no further action.

#### 1.4. Configuration (`manifest.json` & `background.js`)

- The new `src/background/triage.js` script must be added to the `background.scripts` array in both `manifest-chrome.json` and `manifest-firefox.json`.
- It must also be imported in `background.js`.

---

### 2. Triage Rules (Initial Implementation)

The `shouldStoreEvent` function will implement the following rules. If any rule matches, the function should return `false`.

#### Rule 1: Filter Uninteresting Domains

- **Description:** Prevent the storage of events from internal browser pages and the extension itself.
- **Implementation:** The function will check the `domain` property of the `CoreEvent` object.
- **Blocked Domains List:**
    - `newtab` (Chrome's new tab page)
    - `about:newtab` (Firefox's new tab page)
    - `about:blank`
    - `chrome-extension` (Internal pages of any Chrome extension)
    - `moz-extension` (Internal pages of any Firefox extension)

#### Rule 2: Filter Events Without a URL/Domain

- **Description:** Events that lack a URL or domain are generally not useful for tracking user navigation or activity.
- **Implementation:** Check if the `domain` property of the `CoreEvent` is empty, null, or undefined.
- **Exception:** This rule **does not** apply to `CLOSE` events. A `CLOSE` event is always considered valuable, as it marks the end of a tab's lifecycle, even if its URL is not available.

---

### 3. Acceptance Criteria

- **AC-1:** When a user opens a new, blank tab, no `CREATE` or `ACTIVATE` event is stored in IndexedDB.
- **AC-2:** Navigating to a page within the extension's own settings (e.g., `chrome-extension://...`) does not result in a stored `NAVIGATE` event.
- **AC-3:** When a tab is closed, a `CLOSE` event **is** stored, regardless of whether a URL was available.
- **AC-4:** An `ACTIVATE` event that occurs before a URL is populated (i.e., `domain` is empty) is **not** stored.
- **AC-5:** A standard navigation to a public website (e.g., `google.com`) results in `CREATE`, `ACTIVATE`, and `NAVIGATE` events being stored correctly.
