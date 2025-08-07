# Phase 1 Testing Plan

**Status:** In Progress

## Objective

This document outlines the testing strategy and specific test cases for the features developed in **Phase 1: The Foundation - Core Tracking (MVP)**. Its purpose is to ensure that the core data pipeline is reliable, robust, and free of regressions. This plan will be updated continuously as new features are completed.

## Core Technologies

-   **Testing Framework:** [Jest](https://jestjs.io/)
-   **Browser API Mocks:** [jest-chrome](https://github.com/extend-chrome/jest-chrome)
-   **IndexedDB Mock:** A manual mock will be needed within the Jest setup to simulate the IndexedDB API in a Node.js environment.

---

## 1. Test Suite: `storage.js` (Unit Tests)

**Feature Spec:** [Phase 1, Step 2: IndexedDB Setup](../specs/phase-1/2-indexeddb-setup.md)

### Objective

To verify that the `storage.js` module correctly initializes the database, handles versioning, creates the necessary object stores and indexes, and can reliably add events to the database.

### Setup

-   The global `indexedDB` object will be mocked in the test environment.
-   The mock will need to simulate the `open`, `transaction`, `objectStore`, and `createIndex` methods, as well as the `onsuccess`, `onerror`, and `onupgradeneeded` event handlers.

### Test Cases

#### `initDB()` Function

-   **Test 1.1.1:** On the first call, it should request to open the database with the correct name (`Heyho_EventsDB`) and version (`1`).
-   **Test 1.1.2:** It should correctly set up the `events` object store and its indexes (`timestamp_idx`, `domain_idx`) inside the `onupgradeneeded` event handler.
-   **Test 1.1.3:** On a successful connection, it should resolve the promise with the mock database instance.
-   **Test 1.1.4:** If the database connection request fails, it should reject the promise with an error.
-   **Test 1.1.5 (Caching):** On a second call to `initDB()`, it should immediately resolve with the cached database instance without re-running the open request logic.

#### `addEvent()` Function

-   **Test 1.2.1:** It should successfully add a valid `CoreEvent` object to the `events` object store.
-   **Test 1.2.2:** It must create a transaction in `'readwrite'` mode.
-   **Test 1.2.3:** If the `add` request within the transaction fails, the function should reject the promise with an error.
-   **Test 1.2.4:** If the transaction itself fails, the function should reject the promise with an error.

---

## 2. Test Suite: `background.js` (Integration Tests)

**Status:** Not Started

*(This section will be filled out after the event listeners are implemented in `background.js`. It will detail the tests needed to ensure that browser events correctly trigger calls to the `storage.js` module.)*
