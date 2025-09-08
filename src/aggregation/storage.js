/**
 * Storage Module for Aggregation System
 * Handles all storage operations with chrome.storage.local
 */

class AggregationStorage {
  constructor() {
    this.storage = chrome.storage.local;
    
    // Storage keys
    this.KEYS = {
      EVENTS: 'pendingEvents',
      PAGE_VISITS: 'pageVisits',
      TAB_AGGREGATES: 'tabAggregates',
      ACTIVE_VISIT: 'activeVisit'
    };
  }

  // Event Management
  
  async getEvents() {
    try {
      const result = await this.storage.get(this.KEYS.EVENTS);
      return result[this.KEYS.EVENTS] || [];
    } catch (error) {
      console.error('Failed to get events:', error);
      return [];
    }
  }

  async saveEvents(events) {
    try {
      await this.storage.set({ [this.KEYS.EVENTS]: events });
      return true;
    } catch (error) {
      console.error('Failed to save events:', error);
      return false;
    }
  }

  async addEvent(event) {
    const events = await this.getEvents();
    events.push(event);
    return await this.saveEvents(events);
  }

  async clearEvents() {
    return await this.saveEvents([]);
  }

  // Page Visit Management
  
  async getPageVisits() {
    try {
      const result = await this.storage.get(this.KEYS.PAGE_VISITS);
      return result[this.KEYS.PAGE_VISITS] || [];
    } catch (error) {
      console.error('Failed to get page visits:', error);
      return [];
    }
  }

  async savePageVisits(visits) {
    try {
      await this.storage.set({ [this.KEYS.PAGE_VISITS]: visits });
      return true;
    } catch (error) {
      console.error('Failed to save page visits:', error);
      return false;
    }
  }

  async addPageVisit(visit) {
    const visits = await this.getPageVisits();
    visits.push(visit);
    return await this.savePageVisits(visits);
  }

  // Tab Aggregate Management
  
  async getTabAggregates() {
    try {
      const result = await this.storage.get(this.KEYS.TAB_AGGREGATES);
      return result[this.KEYS.TAB_AGGREGATES] || [];
    } catch (error) {
      console.error('Failed to get tab aggregates:', error);
      return [];
    }
  }

  async saveTabAggregates(aggregates) {
    try {
      // Convert Map to array if needed
      const data = aggregates instanceof Map ? 
        Array.from(aggregates.values()).map(a => a.toJSON()) : 
        aggregates;
      
      await this.storage.set({ [this.KEYS.TAB_AGGREGATES]: data });
      return true;
    } catch (error) {
      console.error('Failed to save tab aggregates:', error);
      return false;
    }
  }

  async getTabAggregate(tabId) {
    const aggregates = await this.getTabAggregates();
    return aggregates.find(a => a.tabId === tabId) || null;
  }

  async updateTabAggregate(tabId, updateFn) {
    const aggregates = await this.getTabAggregates();
    const index = aggregates.findIndex(a => a.tabId === tabId);
    
    if (index >= 0) {
      aggregates[index] = updateFn(aggregates[index]);
    } else {
      const newAggregate = updateFn(null);
      if (newAggregate) {
        aggregates.push(newAggregate);
      }
    }
    
    return await this.saveTabAggregates(aggregates);
  }

  // Active Visit Management
  
  async getActiveVisit() {
    try {
      const result = await this.storage.get(this.KEYS.ACTIVE_VISIT);
      return result[this.KEYS.ACTIVE_VISIT] || null;
    } catch (error) {
      console.error('Failed to get active visit:', error);
      return null;
    }
  }

  async setActiveVisit(visit) {
    try {
      await this.storage.set({ [this.KEYS.ACTIVE_VISIT]: visit });
      return true;
    } catch (error) {
      console.error('Failed to set active visit:', error);
      return false;
    }
  }

  async clearActiveVisit() {
    return await this.setActiveVisit(null);
  }

  // Batch Operations
  
  async saveProcessingResults(batch) {
    try {
      const promises = [];
      
      // Save page visits
      if (batch.pageVisits.length > 0) {
        const existingVisits = await this.getPageVisits();
        const allVisits = [...existingVisits, ...batch.pageVisits.map(v => v.toJSON())];
        promises.push(this.savePageVisits(allVisits));
      }
      
      // Save tab aggregates
      if (batch.tabAggregates.size > 0) {
        promises.push(this.saveTabAggregates(batch.tabAggregates));
      }
      
      // Clear processed events
      if (batch.processedEvents.size > 0) {
        const remainingEvents = batch.events.filter(e => !batch.processedEvents.has(e.id));
        promises.push(this.saveEvents(remainingEvents));
      }
      
      // Update active visit
      if (batch.activeVisit) {
        promises.push(this.setActiveVisit(batch.activeVisit));
      }
      
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Failed to save processing results:', error);
      return false;
    }
  }

  // Utility Methods
  
  async getStatistics() {
    try {
      const [events, visits, aggregates] = await Promise.all([
        this.getEvents(),
        this.getPageVisits(),
        this.getTabAggregates()
      ]);
      
      return {
        eventsCount: events.length,
        pageVisitsCount: visits.length,
        tabAggregatesCount: aggregates.length,
        totalDomains: this._countUniqueDomains(visits),
        storageUsage: await this.getStorageUsage()
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return null;
    }
  }

  async getStorageUsage() {
    try {
      const bytes = await this.storage.getBytesInUse();
      return {
        bytes,
        megabytes: (bytes / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      return { bytes: 0, megabytes: '0.00' };
    }
  }

  async clearAll() {
    try {
      await this.storage.remove(Object.values(this.KEYS));
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  async exportData() {
    try {
      const [events, visits, aggregates, activeVisit] = await Promise.all([
        this.getEvents(),
        this.getPageVisits(),
        this.getTabAggregates(),
        this.getActiveVisit()
      ]);
      
      return {
        events,
        pageVisits: visits,
        tabAggregates: aggregates,
        activeVisit,
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  // Private Helper Methods
  
  _countUniqueDomains(visits) {
    const domains = new Set(visits.map(v => v.domain).filter(Boolean));
    return domains.size;
  }
}

// Export for browser environment
self.AggregationStorage = AggregationStorage;