/**
 * Event Processor for Aggregation System
 * Handles the core business logic of processing browsing events
 */

class EventProcessor {
  constructor(storage) {
    this.storage = storage;
    this.batch = null;
  }

  /**
   * Process all pending events
   */
  async processAllEvents() {
    try {
      console.log('Starting event processing...');
      
      // Load data
      const [events, activeVisit, tabAggregates] = await Promise.all([
        this.storage.getEvents(),
        this.storage.getActiveVisit(),
        this.storage.getTabAggregates()
      ]);
      
      if (events.length === 0) {
        console.log('No events to process');
        return { success: true, processed: 0 };
      }
      
      console.log(`Processing ${events.length} events...`);
      
      // Initialize batch
      this.batch = new self.AggregationBatch(events, activeVisit, tabAggregates);
      
      // Process each event
      let processedCount = 0;
      let errorCount = 0;
      
      for (const event of events) {
        try {
          console.log(`🔄 Processing event ${event.id} of type ${event.type}...`);
          const result = await this._processEvent(event);
          console.log(`✅ Event ${event.id} processed:`, result);
          this.batch.markEventProcessed(event.id);
          processedCount++;
        } catch (error) {
          console.error(`❌ Error processing event ${event.id}:`, error);
          this.batch.addError({ eventId: event.id, error: error.message });
          errorCount++;
        }
      }
      
      // Complete any remaining active visit before saving
      if (this.batch.activeVisit) {
        const finalVisit = new self.PageVisit(this.batch.activeVisit);
        finalVisit.complete(Date.now());
        this.batch.addPageVisit(finalVisit);
        console.log('📝 Completed active visit before saving');
      }
      
      console.log(`📊 Batch processing complete: ${processedCount} processed, ${errorCount} errors`);
      console.log(`📊 Batch contents: ${this.batch.pageVisits.length} page visits, ` +
                  `${this.batch.tabAggregates.size} tab aggregates`);
      
      // Save results
      const saved = await this.storage.saveProcessingResults(this.batch);
      
      // Clear processed events from IndexedDB if saving was successful
      if (saved && processedCount > 0) {
        await this.storage.clearEvents();
        console.log(`Cleared ${processedCount} processed events from IndexedDB`);
        
        // Log aggregation success
        console.log(`✅ Aggregation completed: ${this.batch.pageVisits.length} page visits, ` +
                    `${this.batch.tabAggregates.size} tab aggregates saved`);
      } else if (!saved) {
        console.error('❌ Failed to save aggregation results - events NOT cleared');
      }
      
      const result = {
        success: saved,
        processed: processedCount,
        errors: errorCount,
        statistics: this.batch.getStatistics()
      };
      
      console.log(`Processing complete: ${processedCount} events processed, ${errorCount} errors`);
      
      // Clear batch
      this.batch = null;
      
      return result;
      
    } catch (error) {
      console.error('Event processing failed:', error);
      this.batch = null;
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Process a single event
   */
  _processEvent(event) {
    if (!event || !event.type) {
      throw new Error('Invalid event structure');
    }
    
    switch (event.type) {
    // Handle both new and legacy event types
    case 'page_view':
    case 'CREATE':
      return this._handlePageView(event);
    case 'tab_activate':
    case 'ACTIVATE':
      return this._handleTabActivate(event);
    case 'tab_close':
    case 'CLOSE':
      return this._handleTabClose(event);
    case 'navigation':
    case 'NAVIGATE':
      return this._handleNavigation(event);
    case 'heartbeat':
    case 'HEARTBEAT':
      return this._handleHeartbeat(event);
    default:
      console.warn(`Unknown event type: ${event.type}`);
      return null;
    }
  }

  /**
   * Handle page view event
   */
  _handlePageView(event) {
    const { tabId, url, timestamp } = event;
    
    if (!tabId || !url) {
      throw new Error('Page view event missing required fields');
    }
    
    const domain = self.UrlUtils.extractDomain(url);
    
    // Complete previous visit if exists
    if (this.batch.activeVisit && this.batch.activeVisit.tabId === tabId) {
      const completedVisit = new self.PageVisit(this.batch.activeVisit);
      completedVisit.complete(timestamp);
      this.batch.addPageVisit(completedVisit);
    }
    
    // Create new active visit
    const newVisit = self.PageVisit.createFromEvent(tabId, url, domain, timestamp, event.anonymousClientId || null);
    // Store the full visit object data, not the JSON representation
    this.batch.activeVisit = {
      id: newVisit.id,
      tabId: newVisit.tabId,
      url: newVisit.url,
      domain: newVisit.domain,
      timestamp: newVisit.timestamp,
      duration: newVisit.duration,
      isActive: newVisit.isActive,
      anonymousClientId: newVisit.anonymousClientId,
      activeDuration: newVisit.activeDuration,
      idlePeriods: newVisit.idlePeriods,
      engagementRate: newVisit.engagementRate,
      lastHeartbeat: newVisit.lastHeartbeat
    };
    
    // Update tab aggregate
    const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp, event.anonymousClientId || null);
    if (this.batch.activeVisit) {
      const duration = timestamp - (aggregate.lastActiveTime || timestamp);
      aggregate.updateActivity(domain, duration, url, timestamp);
    }
    
    return { type: 'page_view', tabId, domain };
  }

  /**
   * Handle tab activation event
   */
  _handleTabActivate(event) {
    const { tabId, url, timestamp } = event;
    
    if (!tabId) {
      throw new Error('Tab activate event missing tabId');
    }
    
    // If we have a URL, treat this as a page view (since we might not get CREATE events)
    if (url) {
      const domain = self.UrlUtils.extractDomain(url);
      
      // Complete previous visit if exists for this tab
      if (this.batch.activeVisit && this.batch.activeVisit.tabId === tabId) {
        const completedVisit = new self.PageVisit(this.batch.activeVisit);
        completedVisit.complete(timestamp);
        this.batch.addPageVisit(completedVisit);
      }
      
      // Create new active visit
      const newVisit = self.PageVisit.createFromEvent(tabId, url, domain, timestamp, event.anonymousClientId || null);
      // Store the full visit object data
      this.batch.activeVisit = {
        id: newVisit.id,
        tabId: newVisit.tabId,
        url: newVisit.url,
        domain: newVisit.domain,
        timestamp: newVisit.timestamp,
        duration: newVisit.duration,
        isActive: newVisit.isActive,
        anonymousClientId: newVisit.anonymousClientId,
        activeDuration: newVisit.activeDuration,
        idlePeriods: newVisit.idlePeriods,
        engagementRate: newVisit.engagementRate,
        lastHeartbeat: newVisit.lastHeartbeat
      };
      
      // Update tab aggregate with domain information
      const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp, event.anonymousClientId || null);
      aggregate.updateActivity(domain, 0, url, timestamp);
      
      return { type: 'tab_activate', tabId, domain };
    }
    
    // Just update last active time if no URL
    const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp, event.anonymousClientId || null);
    aggregate.lastActiveTime = timestamp;
    
    return { type: 'tab_activate', tabId };
  }

  /**
   * Handle tab close event
   */
  _handleTabClose(event) {
    const { tabId, timestamp } = event;
    
    if (!tabId) {
      throw new Error('Tab close event missing tabId');
    }
    
    // Complete active visit if it belongs to this tab
    if (this.batch.activeVisit && this.batch.activeVisit.tabId === tabId) {
      const completedVisit = new self.PageVisit(this.batch.activeVisit);
      completedVisit.complete(timestamp);
      this.batch.addPageVisit(completedVisit);
      this.batch.activeVisit = null;
    }
    
    // Finalize tab aggregate
    const aggregate = this.batch.tabAggregates.get(tabId);
    if (aggregate) {
      aggregate.lastActiveTime = timestamp;
    }
    
    return { type: 'tab_close', tabId };
  }

  /**
   * Handle navigation event
   */
  _handleNavigation(event) {
    const { tabId, url, timestamp, transitionType } = event;
    
    if (!tabId || !url) {
      throw new Error('Navigation event missing required fields');
    }
    
    const domain = self.UrlUtils.extractDomain(url);
    
    // If there's an active visit for this tab, complete it
    if (this.batch.activeVisit && this.batch.activeVisit.tabId === tabId) {
      const completedVisit = new self.PageVisit(this.batch.activeVisit);
      completedVisit.complete(timestamp);
      this.batch.addPageVisit(completedVisit);
    }
    
    // Create new active visit
    const newVisit = self.PageVisit.createFromEvent(tabId, url, domain, timestamp, event.anonymousClientId || null);
    // Store the full visit object data, not the JSON representation
    this.batch.activeVisit = {
      id: newVisit.id,
      tabId: newVisit.tabId,
      url: newVisit.url,
      domain: newVisit.domain,
      timestamp: newVisit.timestamp,
      duration: newVisit.duration,
      isActive: newVisit.isActive,
      anonymousClientId: newVisit.anonymousClientId,
      activeDuration: newVisit.activeDuration,
      idlePeriods: newVisit.idlePeriods,
      engagementRate: newVisit.engagementRate,
      lastHeartbeat: newVisit.lastHeartbeat
    };
    
    // Update tab aggregate
    const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp, event.anonymousClientId || null);
    aggregate.updateActivity(domain, 0, url, timestamp);
    
    return { 
      type: 'navigation', 
      tabId, 
      domain, 
      transitionType 
    };
  }

  /**
   * Handle heartbeat event for engagement tracking
   */
  _handleHeartbeat(event) {
    const { tabId, url, engagement, timestamp } = event;
    const activeTabId = event.activeTabId || tabId;
    
    if (!engagement) {
      return { type: 'heartbeat', skipped: true, reason: 'No engagement data' };
    }
    
    // If there's no active visit but we have URL info, create one
    if (!this.batch.activeVisit && url && tabId) {
      const domain = self.UrlUtils.extractDomain(url);
      const newVisit = self.PageVisit.createFromEvent(tabId, url, domain, timestamp, event.anonymousClientId || null);
      
      // Store the full visit object data
      this.batch.activeVisit = {
        id: newVisit.id,
        tabId: newVisit.tabId,
        url: newVisit.url,
        domain: newVisit.domain,
        timestamp: newVisit.timestamp,
        duration: newVisit.duration,
        isActive: newVisit.isActive,
        anonymousClientId: newVisit.anonymousClientId,
        activeDuration: newVisit.activeDuration,
        idlePeriods: newVisit.idlePeriods,
        engagementRate: newVisit.engagementRate,
        lastHeartbeat: newVisit.lastHeartbeat
      };
      
      // Update tab aggregate
      const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp, event.anonymousClientId || null);
      aggregate.updateActivity(domain, 0, url, timestamp);
    }
    
    // Update active visit if it exists and matches the tab
    if (this.batch.activeVisit && this.batch.activeVisit.tabId === activeTabId) {
      // Create a PageVisit instance to use the updateEngagement method
      const activeVisit = new self.PageVisit(this.batch.activeVisit);
      activeVisit.updateEngagement(event);
      
      // Update the stored active visit with full data
      this.batch.activeVisit = {
        id: activeVisit.id,
        tabId: activeVisit.tabId,
        url: activeVisit.url,
        domain: activeVisit.domain,
        timestamp: activeVisit.timestamp,
        duration: activeVisit.duration,
        isActive: activeVisit.isActive,
        anonymousClientId: activeVisit.anonymousClientId,
        activeDuration: activeVisit.activeDuration,
        idlePeriods: activeVisit.idlePeriods,
        engagementRate: activeVisit.engagementRate,
        lastHeartbeat: activeVisit.lastHeartbeat
      };
      
      // Update tab aggregate's active duration if engaged
      if (engagement.isEngaged) {
        const aggregate = this.batch.tabAggregates.get(activeTabId);
        if (aggregate) {
          aggregate.totalActiveDuration += 30000; // Add 30 seconds for each engaged heartbeat
          aggregate.lastActiveTime = timestamp;
        }
      }
      
      return {
        type: 'heartbeat',
        processed: true,
        tabId: activeTabId,
        engaged: engagement.isEngaged,
        reason: engagement.reason
      };
    }
    
    // No active visit to update
    return {
      type: 'heartbeat',
      skipped: true,
      reason: 'No active visit for tab'
    };
  }

  /**
   * Get current processing statistics
   */
  async getStatistics() {
    return await this.storage.getStatistics();
  }

  /**
   * Export all data
   */
  async exportData() {
    return await this.storage.exportData();
  }

  /**
   * Clear all data
   */
  async clearAll() {
    return await this.storage.clearAll();
  }
}

// Export for browser environment
self.EventProcessor = EventProcessor;