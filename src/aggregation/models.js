/**
 * Aggregation Models
 * Simple, practical domain models for the aggregation system
 */

/**
 * Represents a single page visit with engagement tracking
 */
class PageVisit {
  constructor(data) {
    this.id = data.id || `${data.tabId}_${data.timestamp}`;
    this.tabId = data.tabId;
    this.url = data.url;
    this.domain = data.domain;
    this.timestamp = data.timestamp;
    this.duration = data.duration || 0;
    this.isActive = data.isActive || false;
    this.anonymousClientId = data.anonymousClientId;

    // Engagement tracking fields
    this.activeDuration = data.activeDuration || 0;
    this.idlePeriods = data.idlePeriods || [];
    this.engagementRate = data.engagementRate || 0;
    this.lastHeartbeat = data.lastHeartbeat || null;

    // Categorization fields
    this.category = data.category || null;
    this.categoryConfidence = data.categoryConfidence || 0;
    this.categoryMethod = data.categoryMethod || null;
    this.metadata = data.metadata || {};
    this.title = data.title || '';
  }

  static createFromEvent(tabId, url, domain, timestamp, anonymousClientId, title = '', metadata = {}) {
    const pageVisit = new PageVisit({
      id: `pv_${timestamp}_${tabId}`, // Match the format from your existing data
      tabId,
      url,
      domain,
      timestamp,
      anonymousClientId,
      title,
      metadata,
      isActive: true,
      activeDuration: 0,
      idlePeriods: [],
      engagementRate: 0
    });

    // Categorize immediately if categorizer is available
    if (self.PageCategorizer) {
      const categorization = self.PageCategorizer.categorize(pageVisit);
      pageVisit.category = categorization.category;
      pageVisit.categoryConfidence = categorization.confidence;
      pageVisit.categoryMethod = categorization.method;
    }

    return pageVisit;
  }

  complete(endTimestamp) {
    this.duration = endTimestamp - this.timestamp;
    this.isActive = false;
    
    // Close any open idle period when visit completes
    const lastIdlePeriod = this.idlePeriods[this.idlePeriods.length - 1];
    if (lastIdlePeriod && !lastIdlePeriod.end) {
      lastIdlePeriod.end = endTimestamp;
      lastIdlePeriod.durationMs = endTimestamp - lastIdlePeriod.start;
      lastIdlePeriod.resumeReason = 'visit_ended';
    }
    
    this.calculateEngagementRate();
    return this;
  }

  /**
   * Update engagement based on heartbeat
   */
  updateEngagement(heartbeat) {
    if (!heartbeat || !heartbeat.engagement) {
      return;
    }
    
    this.lastHeartbeat = heartbeat.timestamp;
    
    // If engaged, add to active duration
    if (heartbeat.engagement.isEngaged) {
      // Add time since last heartbeat (or use 30 seconds as default)
      const timeSinceLastHeartbeat = 30000; // 30 seconds default
      this.activeDuration += timeSinceLastHeartbeat;
      
      // End any open idle period when user becomes active again
      const lastIdlePeriod = this.idlePeriods[this.idlePeriods.length - 1];
      if (lastIdlePeriod && !lastIdlePeriod.end) {
        lastIdlePeriod.end = heartbeat.timestamp;
        lastIdlePeriod.durationMs = heartbeat.timestamp - lastIdlePeriod.start;
        lastIdlePeriod.resumeReason = heartbeat.engagement.reason; // Why they became active again
      }
    } else {
      // Track idle period if not already idle
      const lastIdlePeriod = this.idlePeriods[this.idlePeriods.length - 1];
      if (!lastIdlePeriod || lastIdlePeriod.end) {
        // Start new idle period
        this.idlePeriods.push({
          start: heartbeat.timestamp,
          reason: heartbeat.engagement.reason,
          end: null,
          durationMs: null,
          resumeReason: null
        });
      }
    }
    
    // Update engagement rate
    this.calculateEngagementRate();
  }

  /**
   * Calculate engagement rate (active time / total time)
   */
  calculateEngagementRate() {
    if (this.duration > 0) {
      this.engagementRate = Math.min(1, this.activeDuration / this.duration);
    } else if (this.isActive) {
      // For active visits, calculate based on time since start
      const currentDuration = Date.now() - this.timestamp;
      if (currentDuration > 0) {
        this.engagementRate = Math.min(1, this.activeDuration / currentDuration);
      }
    }
  }

  toJSON() {
    return {
      // Legacy format fields (for compatibility with existing data)
      visitId: this.id,
      tabId: this.tabId,
      url: this.url,
      domain: this.domain,
      startedAt: this.timestamp,
      endedAt: this.isActive ? null : (this.timestamp + this.duration),
      durationSeconds: this.duration ? Math.round(this.duration / 1000) : null,

      // New format fields (for future use)
      id: this.id,
      timestamp: this.timestamp,
      duration: this.duration,
      isActive: this.isActive,

      // Engagement fields
      activeDuration: this.activeDuration,
      idlePeriods: this.idlePeriods,
      engagementRate: this.engagementRate,
      lastHeartbeat: this.lastHeartbeat,

      // Categorization fields
      category: this.category,
      categoryConfidence: this.categoryConfidence,
      categoryMethod: this.categoryMethod,
      metadata: this.metadata,
      title: this.title,

      // Anonymous client ID for data association
      anonymousClientId: this.anonymousClientId
    };
  }
}

/**
 * Represents aggregated data for a browser tab
 */
class TabAggregate {
  constructor(data) {
    this.tabId = data.tabId;
    this.startTime = data.startTime;
    this.lastActiveTime = data.lastActiveTime || data.startTime;
    this.totalActiveDuration = data.totalActiveDuration || 0;
    this.domainDurations = data.domainDurations || {};
    this.pageCount = data.pageCount || 0;
    this.currentUrl = data.currentUrl || null;
    this.currentDomain = data.currentDomain || null;
    this.anonymousClientId = data.anonymousClientId;
  }

  static createNew(tabId, timestamp, anonymousClientId) {
    return new TabAggregate({
      tabId,
      startTime: timestamp,
      anonymousClientId,
      lastActiveTime: timestamp
    });
  }

  updateActivity(domain, duration, url, timestamp) {
    this.totalActiveDuration += duration;
    this.domainDurations[domain] = (this.domainDurations[domain] || 0) + duration;
    this.lastActiveTime = timestamp;
    this.currentUrl = url;
    this.currentDomain = domain;
    this.pageCount++;
    return this;
  }

  getMostVisitedDomain() {
    let maxDuration = 0;
    let mostVisited = null;
    
    for (const [domain, duration] of Object.entries(this.domainDurations)) {
      if (duration > maxDuration) {
        maxDuration = duration;
        mostVisited = domain;
      }
    }
    
    return mostVisited;
  }

  getAveragePageDuration() {
    return this.pageCount > 0 ? Math.round(this.totalActiveDuration / this.pageCount) : 0;
  }

  toJSON() {
    return {
      tabId: this.tabId,
      startTime: this.startTime,
      lastActiveTime: this.lastActiveTime,
      totalActiveDuration: this.totalActiveDuration,
      domainDurations: this.domainDurations,
      pageCount: this.pageCount,
      currentUrl: this.currentUrl,
      currentDomain: this.currentDomain,
      statistics: {
        mostVisitedDomain: this.getMostVisitedDomain(),
        averagePageDuration: this.getAveragePageDuration()
      },
      // Anonymous client ID for data association
      anonymousClientId: this.anonymousClientId
    };
  }
}

/**
 * Represents a batch of events being processed
 */
class AggregationBatch {
  constructor(events, activeVisit, tabAggregates) {
    this.events = events || [];
    this.activeVisit = activeVisit;
    this.tabAggregates = new Map();
    
    // Initialize tab aggregates map
    if (tabAggregates) {
      for (const aggregate of tabAggregates) {
        this.tabAggregates.set(aggregate.tabId, new TabAggregate(aggregate));
      }
    }
    
    this.processedEvents = new Set();
    this.pageVisits = [];
    this.errors = [];
  }

  markEventProcessed(eventId) {
    this.processedEvents.add(eventId);
  }

  addPageVisit(pageVisit) {
    this.pageVisits.push(pageVisit);
  }

  addError(error) {
    this.errors.push(error);
  }

  getOrCreateTabAggregate(tabId, timestamp, anonymousClientId) {
    if (!this.tabAggregates.has(tabId)) {
      this.tabAggregates.set(tabId, TabAggregate.createNew(tabId, timestamp, anonymousClientId));
    }
    return this.tabAggregates.get(tabId);
  }

  getStatistics() {
    return {
      totalEvents: this.events.length,
      processedEvents: this.processedEvents.size,
      pageVisits: this.pageVisits.length,
      tabAggregates: this.tabAggregates.size,
      errors: this.errors.length,
      hasActiveVisit: !!this.activeVisit
    };
  }
}

// Export for browser environment
self.PageVisit = PageVisit;
self.TabAggregate = TabAggregate;
self.AggregationBatch = AggregationBatch;