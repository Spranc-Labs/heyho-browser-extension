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
          await this._processEvent(event);
          this.batch.markEventProcessed(event.id);
          processedCount++;
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
          this.batch.addError({ eventId: event.id, error: error.message });
          errorCount++;
        }
      }
      
      // Save results
      const saved = await this.storage.saveProcessingResults(this.batch);
      
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
    case 'page_view':
      return this._handlePageView(event);
    case 'tab_activate':
      return this._handleTabActivate(event);
    case 'tab_close':
      return this._handleTabClose(event);
    case 'navigation':
      return this._handleNavigation(event);
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
    const newVisit = self.PageVisit.createFromEvent(tabId, url, domain, timestamp);
    this.batch.activeVisit = newVisit.toJSON();
    
    // Update tab aggregate
    const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp);
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
    const { tabId, timestamp } = event;
    
    if (!tabId) {
      throw new Error('Tab activate event missing tabId');
    }
    
    // Update last active time for the tab
    const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp);
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
    const newVisit = self.PageVisit.createFromEvent(tabId, url, domain, timestamp);
    this.batch.activeVisit = newVisit.toJSON();
    
    // Update tab aggregate
    const aggregate = this.batch.getOrCreateTabAggregate(tabId, timestamp);
    aggregate.updateActivity(domain, 0, url, timestamp);
    
    return { 
      type: 'navigation', 
      tabId, 
      domain, 
      transitionType 
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