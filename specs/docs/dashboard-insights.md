# Dashboard Insights

This document outlines the key insights that can be derived from the `PageVisit` and `TabAggregate` data models, and how they can be used to build a powerful and informative user dashboard.

## Key Performance Indicators (KPIs)

These are the high-level metrics that provide an at-a-glance understanding of user behavior.

| KPI                       | Data Source (Field)                                       | Description                                                                                                                                |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Total Browsing Time**   | `TabAggregate.totalActiveDuration` (summed across all tabs) | The total time the user has spent actively browsing the web.                                                                               |
| **Most Visited Domain**   | `TabAggregate.domainDurations` (aggregated across all tabs) | The website the user spends the most time on.                                                                                              |
| **Productivity Score**    | `PageVisit.engagementRate` (averaged across all visits)   | A measure of how focused and engaged the user is during their browsing sessions.                                                           |
| **Task Switching Rate**   | `CoreEvent` (`ACTIVATE` type) count over time             | How often the user switches between different tabs. A high rate might indicate distraction or a multi-tasking workflow.                  |

## Dashboard Components

Here are some ideas for dashboard components that can be built using the available data.

### 1. Time-Based Insights

*   **Browsing Time Over Time**: A line chart showing the total browsing time per day or week. This can help users understand their browsing habits and identify trends.
    *   **Data**: `TabAggregate.totalActiveDuration`, `TabAggregate.startTime`.
*   **Domain-Specific Time**: A pie chart or bar chart showing the distribution of browsing time across different domains. This can help users understand where they spend their time online.
    *   **Data**: `TabAggregate.domainDurations`.

### 2. Engagement and Focus

*   **Engagement Rate Trend**: A line chart showing the average `engagementRate` over time. This can help users see if their focus is improving or declining.
    *   **Data**: `PageVisit.engagementRate`, `PageVisit.timestamp`.
*   **Idle Time Analysis**: A bar chart showing the most common reasons for idle time. This can help users identify their biggest distractions.
    *   **Data**: `PageVisit.idlePeriods.reason`.

### 3. Task and Workflow Analysis

*   **Tab Lifecycle**: A timeline visualization of a single tab's journey, showing the sequence of `PageVisit`s and the time spent on each page. This can help users retrace their steps and understand their research process.
    *   **Data**: `PageVisit` objects for a single `tabId`.
*   **Cross-Tab Navigation**: A graph visualization showing how tabs are opened from one another. This can help users understand how they navigate between different tasks and websites.
    *   **Data**: `TabAggregate.openedByTabId`, `TabAggregate.openedTabs` (requires implementation).

## See Also

*   [Page Visits Specification](./page-visits.md)
*   [Tab Aggregates Specification](./tab-aggregates.md)
