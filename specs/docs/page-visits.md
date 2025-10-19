# Page Visits Specification

This document outlines the structure of the `PageVisit` object, which represents a single, continuous period of user activity on a specific web page. These objects are created by the aggregation system from raw `CoreEvent` data and are stored in IndexedDB.

## `PageVisit` Object Structure

The `PageVisit` object is a JSON object with the following fields:

| Field               | Type     | Description                                                                                                                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id` / `visitId`    | `string` | A unique identifier for the page visit, generated from the tab ID and the timestamp of the first event. Example: `pv_1678886400000_123`.                                      |
| `tabId`             | `number` | The ID of the browser tab where the visit occurred.                                                                                                                      |
| `url`               | `string` | The URL of the page that was visited.                                                                                                                                    |
| `domain`            | `string` | The domain of the visited URL.                                                                                                                                           |
| `timestamp` / `startedAt` | `number` | The Unix timestamp (in milliseconds) when the page visit began.                                                                                                          |
| `endedAt`           | `number` | The Unix timestamp (in milliseconds) when the page visit ended. This field is `null` for active visits.                                                                  |
| `duration` / `durationSeconds` | `number` | The total duration of the page visit in milliseconds or seconds.                                                                                                         |
| `isActive`          | `boolean`| A boolean flag indicating whether the page visit is currently active.                                                                                                    |
| `anonymousClientId` | `string` | An anonymous, unique identifier for the client, used to associate data without tracking personal information.                                                          |

## See Also

*   [Data Relationships](./data-relationships.md)

## Engagement Tracking

The `PageVisit` object also includes fields for tracking user engagement on the page.

| Field            | Type     | Description                                                                                                         |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `activeDuration` | `number` | The total time (in milliseconds) that the user was actively engaged with the page.                                  |
| `idlePeriods`    | `array`  | An array of objects representing periods of user inactivity. Each object has `start` and `end` timestamps.          |
| `engagementRate` | `number` | A value between 0 and 1 representing the ratio of active duration to total duration.                                |
| `lastHeartbeat`  | `number` | The timestamp of the last heartbeat event received for this page visit.                                             |
