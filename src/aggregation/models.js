/**
 * Aggregation Models
 * Simple, practical domain models for the aggregation system
 */

/**
 * Represents a single page visit
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
  }

  static createFromEvent(tabId, url, domain, timestamp) {
    return new PageVisit({
      tabId,
      url,
      domain,
      timestamp,
      isActive: true
    });
  }

  complete(endTimestamp) {
    this.duration = endTimestamp - this.timestamp;
    this.isActive = false;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      tabId: this.tabId,
      url: this.url,
      domain: this.domain,
      timestamp: this.timestamp,
      duration: this.duration,
      isActive: this.isActive
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
  }

  static createNew(tabId, timestamp) {
    return new TabAggregate({
      tabId,
      startTime: timestamp,
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
      }
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

  getOrCreateTabAggregate(tabId, timestamp) {
    if (!this.tabAggregates.has(tabId)) {
      this.tabAggregates.set(tabId, TabAggregate.createNew(tabId, timestamp));
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