# Phase 1, Step 4: Implement Periodic Cleanup (TTL) 🧹

**Parent-Phase:** [Phase 1: The Foundation - Core Tracking (MVP)](./1-basic-extension-setup.md)  
**Depends On:** [Step 3: Event Logging](./3-event-logging.md)  
**Status:** Not Started

## Objective

To implement an automated cleanup system that removes old CoreEvent objects from IndexedDB to prevent database bloat and maintain optimal performance. This ensures the extension remains a "good citizen" by managing resource usage responsibly while preserving data long enough for meaningful analysis and backend synchronization.

---

## Technical Requirements

### 1. Alarm Setup

The cleanup system must use the `browser.alarms` API to schedule periodic maintenance:

- **Alarm Name:** `'daily-cleanup'`
- **Initial Delay:** 24 hours from extension startup
- **Repeat Interval:** Every 24 hours (daily execution)
- **Purpose:** Automated, reliable scheduling independent of user activity

### 2. Storage Module Extension

The `storage.js` module must be extended with new functions to support cleanup operations:

#### 2.1 Query Expired Events Function

```javascript
/**
 * Retrieves events older than the specified age
 * @param {number} maxAgeHours - Maximum age in hours (default: 168 = 7 days)
 * @returns {Promise<Array>} - Array of expired event IDs
 */
async function getExpiredEvents(maxAgeHours = 168) {
  // Implementation details in acceptance criteria
}
```

#### 2.2 Bulk Delete Function

```javascript
/**
 * Deletes multiple events by their IDs
 * @param {Array<string>} eventIds - Array of event IDs to delete
 * @returns {Promise<number>} - Number of events successfully deleted
 */
async function deleteEvents(eventIds) {
  // Implementation details in acceptance criteria
}
```

### 3. Cleanup Logic Integration

The existing alarm listener in `background.js` must be enhanced to handle the cleanup alarm:

- **Event Detection:** Check if `alarm.name === 'daily-cleanup'`
- **Cleanup Execution:** Call the cleanup process
- **Error Handling:** Graceful failure management
- **Dev Mode Logging:** Comprehensive logging when `IS_DEV_MODE` is true

---

## Data Retention Strategy

### Time-to-Live (TTL) Configuration

- **Retention Period:** 7 days (168 hours)
- **Rationale:** 
  - Covers weekly usage patterns and weekend behavior
  - Allows time for backend synchronization failures
  - Provides debugging window for development
  - Balances storage efficiency with data utility

### Cleanup Process Flow

1. **Query Phase:** Identify events with `timestamp < (currentTime - 7 days)`
2. **Batch Processing:** Process deletions in manageable chunks (suggested: 100-500 events per batch)
3. **Execution Phase:** Delete expired events from IndexedDB
4. **Logging Phase:** Report results in development mode
5. **Error Recovery:** Handle partial failures gracefully

---

## Implementation Details

### 3.1 Alarm Registration

In `background.js`, during initialization:

```javascript
// Set up daily cleanup alarm on extension startup
browser.alarms.create('daily-cleanup', {
  delayInMinutes: 24 * 60,      // Start after 24 hours
  periodInMinutes: 24 * 60      // Repeat every 24 hours
});
```

### 3.2 IndexedDB Query Strategy

Use the `timestamp_idx` index for efficient querying:

```javascript
// Efficient query using existing timestamp index
const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
const transaction = db.transaction(['events'], 'readonly');
const store = transaction.objectStore('events');
const index = store.index('timestamp_idx');
const range = IDBKeyRange.upperBound(cutoffTime, false);
```

### 3.3 Batch Deletion Process

```javascript
const BATCH_SIZE = 200; // Delete in batches to avoid blocking
for (let i = 0; i < expiredIds.length; i += BATCH_SIZE) {
  const batch = expiredIds.slice(i, i + BATCH_SIZE);
  await deleteBatch(batch);
}
```

### 3.4 Development Mode Logging

When `IS_DEV_MODE` is true, the cleanup process should log:

- Start and completion times
- Number of events scanned
- Number of events deleted
- Any errors encountered
- Performance metrics (time taken)

---

## Performance Considerations

### 1. Non-Blocking Operation

- **Batch Processing:** Delete events in small batches to prevent UI freezing
- **Async Operations:** Use proper async/await patterns
- **Error Isolation:** Continue processing even if individual deletions fail

### 2. Resource Management

- **Memory Usage:** Avoid loading all expired events into memory at once
- **Transaction Efficiency:** Use appropriate transaction scopes
- **Index Utilization:** Leverage existing `timestamp_idx` for fast queries

### 3. Failure Recovery

- **Partial Failures:** Log errors but continue with remaining deletions
- **Transaction Rollback:** Handle IndexedDB transaction failures
- **Retry Logic:** Consider implementing retry for transient failures

---

## Acceptance Criteria

- **AC1:** A daily alarm named 'daily-cleanup' is created on extension startup and fires every 24 hours
- **AC2:** The `storage.js` module includes `getExpiredEvents()` and `deleteEvents()` functions
- **AC3:** Events older than 7 days (168 hours) are automatically deleted during cleanup
- **AC4:** In development mode, cleanup operations are logged with detailed metrics
- **AC5:** The cleanup process handles errors gracefully without crashing the extension
- **AC6:** After running for several days, IndexedDB size remains bounded (old events are removed)
- **AC7:** Cleanup operations complete within reasonable time (< 30 seconds for typical datasets)

---

## Testing Strategy

### Manual Testing

1. **Time Acceleration:** Temporarily reduce TTL to 1 hour for testing
2. **Data Generation:** Create test events with various timestamps
3. **Alarm Verification:** Confirm alarm fires and cleanup executes
4. **Log Inspection:** Verify development mode logging

### Automated Testing

- Unit tests for `getExpiredEvents()` and `deleteEvents()` functions
- Mock alarm testing for cleanup logic
- Performance tests with large datasets
- Error handling tests for various failure scenarios

---

## Future Enhancements

### Configurable TTL

In future phases, consider making TTL configurable:

```javascript
// Future: User-configurable retention
const settings = await browser.storage.sync.get('retentionDays');
const ttlHours = (settings.retentionDays || 7) * 24;
```

### Cleanup Analytics

Track cleanup metrics for system health monitoring:

- Events deleted per cleanup cycle
- Database size trends over time
- Cleanup operation performance

### Smart Cleanup

Advanced cleanup strategies for future consideration:

- **Value-based retention:** Keep high-value events longer
- **Frequency-based:** Retain events from frequently visited domains
- **Session-aware:** Preserve complete session data

---

This implementation ensures the extension maintains optimal performance while preserving data for meaningful analysis and reliable backend synchronization.