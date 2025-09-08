# Phase 2, Step 3: Intelligent Heartbeats Specification

**Goal:** Implement a heartbeat system using the `chrome.idle` API and tab `audible` property to accurately track user engagement. This distinguishes between active browsing and passive/idle time, providing richer data for backend analysis.

---

## 1. Technical Implementation

### 1.1. New Module: Heartbeat System

#### Location: `src/background/heartbeat.js`

- A new file must be created to house the heartbeat logic.
- This file will define and export a `HeartbeatModule` object.
- The module will manage periodic engagement checks and update visit states accordingly.

### 1.2. Core Components

#### 1.2.1. Heartbeat Configuration
```javascript
const HEARTBEAT_CONFIG = {
  intervalMs: 30000,        // Check every 30 seconds
  idleThreshold: 60,        // User idle after 60 seconds of inactivity
  storageKey: 'heartbeats'  // Storage key for heartbeat data
};
```

#### 1.2.2. Main Function: `initHeartbeat()`
- Initializes the heartbeat system on extension startup
- Sets up periodic interval for engagement checks
- Must be called from `background.js` initialization

#### 1.2.3. Heartbeat Event Structure
```javascript
{
  type: 'heartbeat',
  timestamp: Date.now(),
  idleState: 'active' | 'idle' | 'locked',
  activeTabId: number,
  audible: boolean,
  windowFocused: boolean,
  engagement: {
    isEngaged: boolean,
    reason: string  // 'active', 'audio', 'idle', 'locked'
  }
}
```

### 1.3. Integration Points

#### 1.3.1. With `src/background/events.js`
- Add new event type: `HEARTBEAT`
- The `handleTriagedEvent` function must process heartbeat events
- Heartbeats should update active visit durations

#### 1.3.2. With `src/aggregation/models.js`
- Enhance `PageVisit` model with engagement tracking:
  ```javascript
  {
    // Existing fields
    duration: number,        // Total duration
    // New fields
    activeDuration: number,  // Engaged duration
    idlePeriods: Array,      // [{start, end, reason}]
    engagementRate: number   // activeDuration / duration
  }
  ```

#### 1.3.3. With `src/aggregation/processor.js`
- Add heartbeat event handler: `_handleHeartbeat(event)`
- Update active visit engagement metrics
- Calculate real active duration vs. passive time

### 1.4. Configuration Updates

#### 1.4.1. Manifest Files
- Add `"idle"` permission (already present)
- Include `src/background/heartbeat.js` in background scripts array

#### 1.4.2. Background Initialization
- Import and initialize `HeartbeatModule` in `background.js`
- Ensure heartbeat starts after core modules are ready

---

## 2. Engagement Detection Rules

### Rule 1: Active User Detection
- **Condition:** `chrome.idle.queryState()` returns `'active'`
- **Result:** User is actively using the computer
- **Engagement:** TRUE

### Rule 2: Audio Engagement
- **Condition:** Active tab has `audible: true`
- **Result:** User likely consuming audio/video content
- **Engagement:** TRUE (even if idle)

### Rule 3: Idle State
- **Condition:** `chrome.idle.queryState()` returns `'idle'`
- **Result:** No user input for threshold period
- **Engagement:** FALSE (unless audio playing)

### Rule 4: Locked State
- **Condition:** `chrome.idle.queryState()` returns `'locked'`
- **Result:** Computer is locked
- **Engagement:** FALSE (always)

### Rule 5: Window Focus
- **Condition:** Chrome window is not focused
- **Result:** User using different application
- **Engagement:** REDUCED (track separately)

---

## 3. Data Processing Logic

### 3.1. Heartbeat Processing Flow

1. **Capture State**
   - Query idle state
   - Get active tab information
   - Check audio status
   - Determine window focus

2. **Calculate Engagement**
   - Apply engagement rules
   - Determine if user is engaged
   - Record reason for engagement state

3. **Update Metrics**
   - Find active PageVisit
   - Update activeDuration if engaged
   - Record idle period if transitioning to idle
   - Calculate engagement rate

### 3.2. Storage Strategy

#### Heartbeat Events
- Store last 100 heartbeats in circular buffer
- Aggregate into 5-minute windows for efficiency
- Clear old heartbeats after aggregation

#### Engagement Metrics
- Update PageVisit with:
  - `activeDuration`: Accumulated engaged time
  - `idlePeriods`: Array of idle periods
  - `engagementRate`: Percentage of active time

---

## 4. Implementation Phases

### Phase 1: Basic Heartbeat (MVP)
- Implement periodic heartbeat generation
- Capture idle state and tab information
- Store heartbeat events

### Phase 2: Engagement Calculation
- Apply engagement rules
- Calculate active vs. passive time
- Update PageVisit models

### Phase 3: Advanced Metrics
- Track idle period patterns
- Implement engagement rate calculations
- Add window focus tracking

---

## 5. Testing Requirements

### 5.1. Unit Tests
- Test engagement rule logic
- Verify heartbeat event generation
- Validate duration calculations

### 5.2. Integration Tests
- Ensure heartbeats update PageVisits correctly
- Verify storage and aggregation integration
- Test idle state transitions

### 5.3. Scenarios to Test
1. User actively browsing → Engaged
2. YouTube video playing, user idle → Still engaged (audio)
3. Tab open, user walks away → Not engaged after threshold
4. Computer locked → Never engaged
5. Switching between apps → Partial engagement

---

## 6. Performance Considerations

### 6.1. Optimizations
- 30-second interval balances accuracy vs. performance
- Batch process heartbeats during aggregation
- Use efficient storage with circular buffer

### 6.2. Resource Usage
- Minimal CPU: Simple state checks
- Low memory: ~100 heartbeats = ~10KB
- Battery friendly: No continuous monitoring

---

## 7. Privacy & Security

### 7.1. Data Minimization
- Don't store specific user actions
- Only track engagement state, not content
- Aggregate data quickly, discard raw heartbeats

### 7.2. User Control
- Respect browser privacy settings
- Allow disabling heartbeat tracking
- Clear engagement data with other user data

---

## 8. Expected Outcomes

### 8.1. Enhanced Metrics
- **Real engagement time** vs. tab open time
- **Focus sessions**: Continuous engaged periods
- **Break patterns**: When users step away
- **Multitasking insights**: Audio while working

### 8.2. Backend Benefits
- More accurate productivity analytics
- Better user behavior understanding
- Reliable time-on-site metrics
- Improved recommendation algorithms

---

## 9. Success Criteria

- ✅ Heartbeats generated every 30 seconds
- ✅ Idle state correctly detected
- ✅ Audio engagement tracked
- ✅ PageVisits show active vs. total duration
- ✅ Engagement rate calculated accurately
- ✅ System uses <1% CPU and <10MB memory

---

## 10. Code Example

```javascript
// src/background/heartbeat.js
const HeartbeatModule = {
  async checkEngagement() {
    const idleState = await chrome.idle.queryState(60);
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    return {
      type: 'heartbeat',
      timestamp: Date.now(),
      idleState,
      activeTabId: activeTab?.id,
      audible: activeTab?.audible || false,
      windowFocused: await this.isWindowFocused(),
      engagement: this.calculateEngagement(idleState, activeTab)
    };
  },
  
  calculateEngagement(idleState, tab) {
    if (idleState === 'locked') {
      return { isEngaged: false, reason: 'locked' };
    }
    if (idleState === 'active') {
      return { isEngaged: true, reason: 'active' };
    }
    if (tab?.audible) {
      return { isEngaged: true, reason: 'audio' };
    }
    return { isEngaged: false, reason: 'idle' };
  }
};
```

This specification ensures the heartbeat system provides valuable engagement metrics while remaining lightweight and privacy-conscious.