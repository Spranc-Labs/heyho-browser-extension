# Data Relationships

This document explains the relationship between the different data models used in the browser extension.

## `CoreEvent`, `PageVisit`, and `TabAggregate`

The three main data models in the extension are `CoreEvent`, `PageVisit`, and `TabAggregate`. They represent a hierarchy of data, from raw events to aggregated summaries.

*   **`CoreEvent`**: The lowest level of data. A `CoreEvent` is a raw event that is captured by the extension, such as a tab being created, activated, or closed. These events are stored in IndexedDB and are processed by the aggregation system.

*   **`PageVisit`**: The middle level of data. A `PageVisit` represents a single, continuous period of user activity on a specific web page. `PageVisit` objects are created by the aggregation system from a sequence of `CoreEvent`s. For example, a `NAVIGATE` event will end the previous `PageVisit` and start a new one.

*   **`TabAggregate`**: The highest level of data. A `TabAggregate` represents the entire lifecycle of a single browser tab, from the moment it's created until it's closed. It summarizes information from its associated `PageVisit` records.

### Relationship Diagram

```
+------------------+
|   TabAggregate   |
| (1)              |
+------------------+
        |
        |
        v
+------------------+
|    PageVisit     |
| (Many)           |
+------------------+
        |
        |
        v
+------------------+
|     CoreEvent    |
| (Many)           |
+------------------+
```

### Key Fields

*   **`tabId`**: The `tabId` field is the key that links all three data models together. Each `CoreEvent`, `PageVisit`, and `TabAggregate` has a `tabId` that identifies the browser tab it belongs to.

*   **`totalActiveDuration`**: The `totalActiveDuration` field in `TabAggregate` is a good example of the relationship between `PageVisit` and `TabAggregate`. It is the sum of the `duration` of all the `PageVisit` records associated with that `TabAggregate`.
