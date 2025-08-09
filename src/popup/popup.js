/**
 * Popup Script for HeyHo Extension Debug Panel
 * 
 * Provides UI controls for testing and exporting aggregation data
 */

class DebugPanel {
  constructor() {
    this.logContainer = document.getElementById('log-container');
    this.setupEventListeners();
    this.loadStats();
  }

  setupEventListeners() {
    // Aggregation controls
    document.getElementById('trigger-aggregation').addEventListener('click', () => {
      this.triggerAggregation();
    });

    document.getElementById('view-raw-events').addEventListener('click', () => {
      this.viewRawEvents();
    });

    // Export controls
    document.getElementById('export-page-visits').addEventListener('click', () => {
      this.exportData('pageVisits');
    });

    document.getElementById('export-tab-aggregates').addEventListener('click', () => {
      this.exportData('tabAggregates');
    });

    document.getElementById('export-all').addEventListener('click', () => {
      this.exportAllData();
    });
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getDebugStats'
      });

      if (response.success) {
        document.getElementById('events-count').textContent = response.stats.eventsCount;
        document.getElementById('visits-count').textContent = response.stats.visitsCount;
        document.getElementById('tabs-count').textContent = response.stats.tabsCount;
        document.getElementById('last-aggregation').textContent = response.stats.lastAggregation;
      } else {
        this.log('Failed to load stats', 'error');
      }
    } catch (error) {
      this.log(`Error loading stats: ${error.message}`, 'error');
    }
  }

  async triggerAggregation() {
    const button = document.getElementById('trigger-aggregation');
    button.classList.add('loading');
    button.disabled = true;

    this.log('Triggering manual aggregation...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'triggerAggregation'
      });

      if (response.success) {
        this.log(
          `✅ Aggregation completed: processed ${response.eventsProcessed} events`, 
          'success'
        );
        this.loadStats(); // Refresh stats
      } else {
        this.log(`❌ Aggregation failed: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error: ${error.message}`, 'error');
    } finally {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  async viewRawEvents() {
    this.log('Fetching raw events...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getRawEvents'
      });

      if (response.success) {
        const events = response.data;
        this.log(`Found ${events.length} raw events`, 'info');
        
        if (events.length > 0) {
          console.log('Raw Events:', events);
          this.downloadJSON(events, 'raw-events.json');
          this.log('Raw events downloaded to console and file', 'success');
        } else {
          this.log('No raw events found', 'info');
        }
      } else {
        this.log(`Failed to fetch raw events: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`Error fetching raw events: ${error.message}`, 'error');
    }
  }

  async exportData(type) {
    const typeLabels = {
      pageVisits: 'Page Visits',
      tabAggregates: 'Tab Aggregates'
    };

    this.log(`Exporting ${typeLabels[type]}...`, 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportData',
        dataType: type
      });

      if (response.success) {
        const data = response.data;
        this.log(`Found ${data.length} ${typeLabels[type].toLowerCase()}`, 'info');
        
        if (data.length > 0) {
          this.downloadJSON(data, `${type}.json`);
          this.log(`✅ ${typeLabels[type]} exported successfully`, 'success');
        } else {
          this.log(`No ${typeLabels[type].toLowerCase()} found`, 'info');
        }
      } else {
        this.log(`❌ Export failed: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error exporting ${typeLabels[type]}: ${error.message}`, 'error');
    }
  }

  async exportAllData() {
    this.log('Exporting all aggregation data...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'exportAllData'
      });

      if (response.success) {
        const { rawEvents, pageVisits, tabAggregates, stats } = response.data;
        
        const allData = {
          exportedAt: new Date().toISOString(),
          stats: {
            rawEventsCount: rawEvents.length,
            pageVisitsCount: pageVisits.length,
            tabAggregatesCount: tabAggregates.length
          },
          rawEvents,
          pageVisits,
          tabAggregates,
          systemStats: stats
        };

        this.downloadJSON(allData, 'heyho-aggregation-data.json');
        this.log(
          `✅ Complete export: ${rawEvents.length} events, ` +
          `${pageVisits.length} visits, ${tabAggregates.length} tabs`, 
          'success'
        );
      } else {
        this.log(`❌ Export failed: ${response.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Error exporting all data: ${error.message}`, 'error');
    }
  }

  downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  log(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    this.logContainer.appendChild(logEntry);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;

    // Keep only last 50 log entries
    while (this.logContainer.children.length > 50) {
      this.logContainer.removeChild(this.logContainer.firstChild);
    }
  }
}

// Initialize the debug panel when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new DebugPanel();
});