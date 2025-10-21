/**
 * Unit Tests for Triage System
 * Tests the TriageModule filtering logic for event storage decisions
 */

const { shouldStoreEvent } = require('../../src/background/triage.js');

// Helper function to create test events
const createEvent = (type, domain, url = '') => ({
  type,
  domain,
  url: url || (domain ? `https://${domain}/path` : ''),
  id: 'test',
  timestamp: Date.now(),
  tabId: 123,
});

// Helper to test filtering behavior
const expectFiltered = (type, domain, url) =>
  expect(shouldStoreEvent(createEvent(type, domain, url))).toBe(false);
const expectAllowed = (type, domain, url) =>
  expect(shouldStoreEvent(createEvent(type, domain, url))).toBe(true);

describe('Triage System', () => {
  describe('Rule 1: Filter Uninteresting URLs', () => {
    const blockedUrls = [
      { domain: 'newtab', url: 'about:newtab' },
      { domain: '', url: 'about:blank' },
      { domain: 'abcd123', url: 'chrome-extension://abcd123/popup.html' },
      { domain: 'xyz789', url: 'moz-extension://xyz789/login.html' },
      { domain: '', url: 'chrome://settings' },
      { domain: '', url: 'edge://settings' },
      { domain: '', url: 'view-source:https://example.com' },
    ];

    test.each(blockedUrls)('should filter URL: $url', ({ domain, url }) => {
      expectFiltered('CREATE', domain, url);
    });

    test('should filter newtab domain (special case)', () => {
      expectFiltered('CREATE', 'newtab', 'https://newtab/');
    });

    test.each(['google.com', 'mail.google.com', 'example.org'])(
      'should allow valid domain: %s',
      (domain) => {
        expectAllowed('CREATE', domain);
      }
    );
  });

  describe('Rule 2: Filter Events Without URL/Domain', () => {
    const emptyDomains = ['', null, undefined];
    const nonCloseTypes = ['CREATE', 'ACTIVATE', 'NAVIGATE'];

    test.each(nonCloseTypes.flatMap((type) => emptyDomains.map((domain) => [type, domain])))(
      'should filter %s events with empty domain (%s)',
      (type, domain) => {
        expectFiltered(type, domain);
      }
    );

    test.each(emptyDomains)('should allow CLOSE events with empty domain (%s)', (domain) => {
      expectAllowed('CLOSE', domain);
    });

    test('should still filter CLOSE events from blocked URLs', () => {
      expectFiltered('CLOSE', 'xyz789', 'chrome-extension://xyz789/popup.html');
    });
  });

  describe('Acceptance Criteria', () => {
    test('AC-1: Blank tab events are filtered', () => {
      expectFiltered('CREATE', '', 'about:blank');
      expectFiltered('ACTIVATE', '', 'about:blank');
    });

    test('AC-2: Extension page events are filtered', () => {
      expectFiltered('NAVIGATE', 'abcd', 'chrome-extension://abcd/options.html');
      expectFiltered('NAVIGATE', 'xyz', 'moz-extension://xyz/settings.html');
    });

    test('AC-3: CLOSE events always stored (except blocked URLs)', () => {
      expectAllowed('CLOSE', 'example.com');
      expectAllowed('CLOSE', '');
      expectAllowed('CLOSE', null);
    });

    test('AC-4: Empty domain non-CLOSE events are filtered', () => {
      ['CREATE', 'ACTIVATE', 'NAVIGATE'].forEach((type) => {
        expectFiltered(type, '');
        expectFiltered(type, null);
      });
    });

    test('AC-5: Standard website events are stored', () => {
      ['CREATE', 'ACTIVATE', 'NAVIGATE', 'CLOSE'].forEach((type) => {
        expectAllowed(type, 'google.com');
      });
    });
  });

  describe('Edge Cases', () => {
    test('chrome:// pages are blocked', () => {
      expectFiltered('CREATE', '', 'chrome://settings');
    });

    test('newtab domain substring matching works', () => {
      expectFiltered('CREATE', 'newtab-dashboard.com', 'https://newtab-dashboard.com'); // Contains 'newtab'
    });

    test('normal domains with "extension" in name are allowed', () => {
      expectAllowed('CREATE', 'my-extension-site.com');
    });
  });
});
