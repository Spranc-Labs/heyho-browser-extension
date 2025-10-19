# Tab Aggregates Specification

This document outlines the structure of the `TabAggregate` object, which provides a high-level summary for the entire lifecycle of a single browser tab.

## `TabAggregate` Object Structure

The `TabAggregate` object is a JSON object with the following fields:

| Field                 | Type     | Description                                                                                                                                      |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tabId`               | `number` | The unique identifier for the browser tab.                                                                                                       |
| `startTime`           | `number` | The Unix timestamp (in milliseconds) when the tab was created.                                                                                   |
| `lastActiveTime`      | `number` | The Unix timestamp (in milliseconds) of the last recorded activity in the tab.                                                                   |
| `totalActiveDuration` | `number` | The total time (in milliseconds) that the user was actively engaged with the tab, calculated as the sum of the durations of all its `PageVisit`s. |
| `domainDurations`     | `object` | An object where keys are domain names and values are the total duration (in milliseconds) spent on each domain within the tab.                     |
| `pageCount`           | `number` | The total number of pages visited within the tab.                                                                                                |
| `currentUrl`          | `string` | The last known URL of the tab.                                                                                                                   |
| `currentDomain`       | `string` | The last known domain of the tab.                                                                                                                |
| `anonymousClientId`   | `string` | An anonymous, unique identifier for the client, used to associate data without tracking personal information.                                  |

## Statistics

The `TabAggregate` object also includes a `statistics` object that provides additional insights:

| Field                 | Type     | Description                                                              |
| --------------------- | -------- | ------------------------------------------------------------------------ |
| `mostVisitedDomain`   | `string` | The domain that the user spent the most time on within the tab.          |
| `averagePageDuration` | `number` | The average duration (in milliseconds) of a page visit within the tab.   |

## See Also

*   [Data Relationships](./data-relationships.md)
