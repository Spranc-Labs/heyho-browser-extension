/**
 * Storage Module for Aggregation System
 * Handles all storage operations with chrome.storage.local
 */

class AggregationStorage {
  constructor() {
    // Use browser.storage for better Firefox compatibility
    this.storage = typeof browser !== 'undefined' ? browser.storage.local : chrome.storage.local;

    // Storage keys
    this.KEYS = {
      EVENTS: 'pendingEvents',
      PAGE_VISITS: 'pageVisits',
      TAB_AGGREGATES: 'tabAggregates',
      ACTIVE_VISIT: 'activeVisit',
    };
  }

  // Event Management

  async getEvents() {
    try {
      // Get events from IndexedDB instead of chrome.storage.local
      if (self.StorageModule && self.StorageModule.getAllEvents) {
        const events = await self.StorageModule.getAllEvents();
        console.log(`Retrieved ${events.length} events from IndexedDB for aggregation`);
        return events;
      }

      // Fallback to chrome.storage.local if IndexedDB not available
      const result = await this.storage.get(this.KEYS.EVENTS);
      return result[this.KEYS.EVENTS] || [];
    } catch (error) {
      console.error('Failed to get events:', error);
      return [];
    }
  }

  saveEvents(_events) {
    // We don't save back to the events store, we clear them from IndexedDB
    // This is handled by clearEvents after processing
    return true;
  }

  addEvent(event) {
    // Events should be added through the main StorageModule to IndexedDB
    // This is only used for testing or manual event addition
    if (self.StorageModule && self.StorageModule.addEvent) {
      return self.StorageModule.addEvent(event);
    }

    // Fallback for testing - return false since we can't actually save
    console.warn('StorageModule not available, cannot add event');
    return false;
  }

  async clearEvents() {
    try {
      // Clear events from IndexedDB after processing
      if (self.StorageModule && self.StorageModule.clearEvents) {
        console.log('Clearing processed events from IndexedDB');
        return await self.StorageModule.clearEvents();
      }

      // Fallback to chrome.storage.local
      return await this.storage.set({ [this.KEYS.EVENTS]: [] });
    } catch (error) {
      console.error('Failed to clear events:', error);
      return false;
    }
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
    return this.savePageVisits(visits);
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
      const data =
        aggregates instanceof Map
          ? Array.from(aggregates.values()).map((a) => a.toJSON())
          : aggregates;

      await this.storage.set({ [this.KEYS.TAB_AGGREGATES]: data });
      return true;
    } catch (error) {
      console.error('Failed to save tab aggregates:', error);
      return false;
    }
  }

  async getTabAggregate(tabId) {
    const aggregates = await this.getTabAggregates();
    return aggregates.find((a) => a.tabId === tabId) || null;
  }

  async updateTabAggregate(tabId, updateFn) {
    const aggregates = await this.getTabAggregates();
    const index = aggregates.findIndex((a) => a.tabId === tabId);

    if (index >= 0) {
      aggregates[index] = updateFn(aggregates[index]);
    } else {
      const newAggregate = updateFn(null);
      if (newAggregate) {
        aggregates.push(newAggregate);
      }
    }

    return this.saveTabAggregates(aggregates);
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

  clearActiveVisit() {
    return this.setActiveVisit(null);
  }

  // Batch Operations

  async saveProcessingResults(batch) {
    try {
      console.log(
        `💾 Saving aggregation results: ${batch.pageVisits.length} visits, ` +
          `${batch.tabAggregates.size} aggregates`
      );

      const promises = [];

      // Save page visits
      if (batch.pageVisits.length > 0) {
        console.log(`Saving ${batch.pageVisits.length} new page visits...`);
        const existingVisits = await this.getPageVisits();
        const newVisitsJSON = batch.pageVisits.map((v) => v.toJSON());

        // DEBUG: Log first visit to see what's being saved
        if (newVisitsJSON.length > 0) {
          console.log('🔍 DEBUG - First visit being saved:', {
            url: newVisitsJSON[0].url?.substring(0, 60),
            category: newVisitsJSON[0].category,
            categoryConfidence: newVisitsJSON[0].categoryConfidence,
            categoryMethod: newVisitsJSON[0].categoryMethod,
            hasMetadata:
              !!newVisitsJSON[0].metadata && Object.keys(newVisitsJSON[0].metadata).length > 0,
            metadataKeys: newVisitsJSON[0].metadata
              ? Object.keys(newVisitsJSON[0].metadata).slice(0, 5)
              : [],
            title: newVisitsJSON[0].title?.substring(0, 40),
          });
        }

        const allVisits = [...existingVisits, ...newVisitsJSON];
        promises.push(this.savePageVisits(allVisits));
        console.log(`Total page visits after save: ${allVisits.length}`);
      }

      // Merge and save tab aggregates
      if (batch.tabAggregates.size > 0) {
        console.log(`Merging ${batch.tabAggregates.size} tab aggregates...`);

        // Get existing aggregates
        const existingAggregates = await this.getTabAggregates();
        const aggregateMap = new Map();

        // Add existing aggregates to map
        for (const agg of existingAggregates) {
          aggregateMap.set(agg.tabId, agg);
        }

        // Merge new aggregates (overwrite if exists)
        for (const [tabId, newAgg] of batch.tabAggregates) {
          const newAggJSON = newAgg.toJSON();

          // If aggregate exists, merge the data
          if (aggregateMap.has(tabId)) {
            const existing = aggregateMap.get(tabId);
            // Merge domain durations
            for (const [domain, duration] of Object.entries(newAggJSON.domainDurations || {})) {
              existing.domainDurations[domain] = (existing.domainDurations[domain] || 0) + duration;
            }
            // Update other fields
            existing.lastActiveTime = newAggJSON.lastActiveTime;
            existing.totalActiveDuration += newAggJSON.totalActiveDuration;
            existing.pageCount += newAggJSON.pageCount;
            existing.currentUrl = newAggJSON.currentUrl;
            existing.currentDomain = newAggJSON.currentDomain;
            // Recalculate statistics
            existing.statistics = {
              mostVisitedDomain: this._getMostVisitedDomain(existing.domainDurations),
              averagePageDuration:
                existing.pageCount > 0
                  ? Math.round(existing.totalActiveDuration / existing.pageCount)
                  : 0,
            };
          } else {
            aggregateMap.set(tabId, newAggJSON);
          }
        }

        // Convert map back to array and save
        const mergedAggregates = Array.from(aggregateMap.values());
        promises.push(this.saveTabAggregates(mergedAggregates));
        console.log(`Total tab aggregates after merge: ${mergedAggregates.length}`);
      }

      // Don't clear events here - that's handled by the processor after successful save

      // Update active visit
      if (batch.activeVisit) {
        console.log('Updating active visit...');
        promises.push(this.setActiveVisit(batch.activeVisit));
      }

      await Promise.all(promises);
      console.log('✅ All aggregation data saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save processing results:', error);
      return false;
    }
  }

  // Utility Methods

  async getStatistics() {
    try {
      const [events, visits, aggregates] = await Promise.all([
        this.getEvents(),
        this.getPageVisits(),
        this.getTabAggregates(),
      ]);

      return {
        eventsCount: events.length,
        pageVisitsCount: visits.length,
        tabAggregatesCount: aggregates.length,
        totalDomains: this._countUniqueDomains(visits),
        storageUsage: await this.getStorageUsage(),
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
        megabytes: (bytes / (1024 * 1024)).toFixed(2),
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
        this.getActiveVisit(),
      ]);

      return {
        events,
        pageVisits: visits,
        tabAggregates: aggregates,
        activeVisit,
        exportedAt: Date.now(),
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  // Private Helper Methods

  _countUniqueDomains(visits) {
    const domains = new Set(visits.map((v) => v.domain).filter(Boolean));
    return domains.size;
  }

  _getMostVisitedDomain(domainDurations) {
    let maxDuration = 0;
    let mostVisited = null;

    for (const [domain, duration] of Object.entries(domainDurations || {})) {
      if (duration > maxDuration) {
        maxDuration = duration;
        mostVisited = domain;
      }
    }

    return mostVisited;
  }
}

// Export for browser environment
self.AggregationStorage = AggregationStorage;
