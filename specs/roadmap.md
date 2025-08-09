# [REVISED] HeyHo Extension Roadmap

This roadmap outlines the phased development of the HeyHo browser extension, evolving from a simple data collector into a powerful, insightful, and scalable service.

---

## Phase 1: The Foundation - Core Tracking (MVP)

**Goal:** Reliably capture and store the essential browsing events on the user's machine. This phase is complete and ensures that our data pipeline is built on a solid, persistent foundation.

-   **Step 1: Basic Extension Setup** ✅
-   **Step 2: Set up IndexedDB Storage** ✅
-   **Step 3: Implement "Fire-and-Forget" Event Logging** ✅
-   **Step 4: Implement Periodic Cleanup (TTL)** ✅

---

## Phase 2: The Local Brain - On-Device Aggregation

**Goal:** Make the extension "smart" on its own. This phase focuses on processing the raw event data locally into a structured and insightful format. The extension will be a fully functional, offline-first analysis tool by the end of this phase.

### Step 1: Implement the Triage System (Sampling) 🎯

**Action:** Create the logic for `shouldStoreEvent(event)` to filter out noisy, low-value events (e.g., `about:blank`) before they are ever written to the database. This is a pre-storage filter that keeps our raw data lean.

### Step 2: Implement Two-Tiered Aggregation 🧠

**Action:** Create a new background module (`aggregator.js`) and a `chrome.alarms` job that runs every 5 minutes. This job will perform the core "ETL" (Extract, Transform, Load) process entirely on-device.

1.  **Create `pageVisits` Object Store:** This is the detailed ledger. The aggregator will process `CoreEvent`s into `PageVisit` records, calculating time spent on each individual page.
2.  **Create `tabAggregates` Object Store:** This is the high-level summary. The aggregator will create and update a single `TabAggregate` for each tab, summarizing its entire lifecycle and its relationship to other tabs (`openedByTabId`).
3.  **Delete Processed Events:** Once events are successfully processed into these new structured formats, they are deleted from the `events` store.

> 📝 **Note:** This is the heart of the local-first architecture. The extension is now capable of providing deep insights without any external dependencies.

### Step 3: Implement Intelligent Heartbeats ❤️

**Action:** Use the `chrome.idle` API and tab `audible` property to make the `HEARTBEAT` event smarter. This allows for more accurate "active time" calculation by ensuring the user is present and engaged.

---

## Phase 3: The Cloud Connection - Sync & Categorization

**Goal:** Enhance the local experience with cloud-powered features. This phase connects the self-sufficient extension to a backend, enabling data backup, cross-device sync, and more advanced analytics.

### Step 1: Build the Sync Service ☁️

**Action:** Create a new `chrome.alarms` job (e.g., runs every hour) that sends batches of locally stored `pageVisits` and `tabAggregates` to a secure backend API. This provides data backup and enables the web dashboard.

### Step 2: Build the Categorization Service 🏷️

**Action:** Create a separate background process to handle domain categorization.
1.  **Local Cache:** Create a `domainCategories` object store in IndexedDB.
2.  **Batch API Calls:** When the aggregator finds new, uncategorized domains, it will add them to a queue. Periodically, the extension will send a batch of these domains to a dedicated categorization API.
3.  **Update Locally:** The results from the API are saved to the local `domainCategories` cache, enriching the data for the user's view.

> 📝 **Note:** This architecture keeps the extension private and performant. The categorization API only sees domain names, not user-specific browsing history.

---

## Phase 4: The User Experience - UI & Insights

**Goal:** Deliver the value to the user through intuitive interfaces.

### Step 1: Build the Extension UI (The "Companion")

**Action:** Create the extension's popup and options pages.
-   **Popup:** Provides a "real-time" view of the current tab's journey and stats.
-   **Dashboard Page:** A full-page view within the browser that uses the locally stored `pageVisits` and `tabAggregates` to display charts and insights about the user's behavior.

### Step 2: Build the Web App Dashboard (The "Headquarters")

**Action:** Develop a full-featured, standalone web application.
-   This dashboard will be powered by the data synced to the cloud in Phase 3.
-   It will offer more advanced, cross-device analytics and visualizations than the local dashboard.

### Step 3: Resurface Insights (The "Magic") ✨

**Action:** Use content scripts to inject useful information back onto web pages.
-   **Example:** Show a "You've visited this link 3 times" indicator next to Google search results.
-   **Example:** Display a "Opened from Jira ticket PROJ-123" banner on a GitHub page.
