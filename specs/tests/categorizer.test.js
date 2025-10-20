/**
 * Categorizer Tests
 * Tests for page categorization based on metadata
 */

// Load the categorizer module
const fs = require('fs');
const path = require('path');

// Read and evaluate the categorizer code
const categorizerCode = fs.readFileSync(
  path.join(__dirname, '../../src/background/categorizer.js'),
  'utf8'
);

// eslint-disable-next-line no-eval
eval(categorizerCode);

// PageCategorizer is now available globally (defined by eval)
/* global PageCategorizer */

describe('PageCategorizer', () => {
  describe('YouTube Video Categorization', () => {
    it('should categorize a tutorial video as learning_video', () => {
      const pageVisit = {
        url: 'https://youtube.com/watch?v=xyz',
        domain: 'youtube.com',
        title: 'React Tutorial for Beginners',
        metadata: {
          schemaType: 'VideoObject',
          schemaData: {
            duration: 'PT45M30S',
            genre: 'Education',
          },
        },
        engagementRate: 0.8, // High engagement
        duration: 120000, // 2 minutes
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('learning_video');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.method).toBe('metadata');
    });

    it('should categorize YouTube Shorts as entertainment_short_form', () => {
      const pageVisit = {
        url: 'https://youtube.com/shorts/abc123',
        domain: 'youtube.com',
        title: 'Funny cat video',
        metadata: {
          schemaType: 'VideoObject',
        },
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('entertainment_short_form');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should categorize short videos (<60s) as entertainment_short_form', () => {
      const pageVisit = {
        url: 'https://youtube.com/watch?v=xyz',
        domain: 'youtube.com',
        title: 'Quick tip',
        metadata: {
          schemaType: 'VideoObject',
          schemaData: {
            duration: 'PT30S', // 30 seconds
          },
        },
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('entertainment_short_form');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should categorize movie trailers as entertainment_video', () => {
      const pageVisit = {
        url: 'https://youtube.com/watch?v=xyz',
        domain: 'youtube.com',
        title: 'Marvel Movie Trailer 2024',
        metadata: {
          schemaType: 'VideoObject',
          schemaData: {
            duration: 'PT2M30S',
          },
        },
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('entertainment_video');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('GitHub Categorization', () => {
    it('should categorize GitHub pull requests as work_code_review', () => {
      const pageVisit = {
        url: 'https://github.com/owner/repo/pull/123',
        domain: 'github.com',
        title: 'Add new feature',
        metadata: {},
        engagementRate: 0.8,
        duration: 120000,
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('work_code_review');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should categorize GitHub code browsing as work_coding', () => {
      const pageVisit = {
        url: 'https://github.com/owner/repo/blob/main/src/index.js',
        domain: 'github.com',
        title: 'index.js',
        metadata: {},
        engagementRate: 0.8,
        duration: 120000,
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('work_coding');
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should categorize GitHub issues as work_communication', () => {
      const pageVisit = {
        url: 'https://github.com/owner/repo/issues/456',
        domain: 'github.com',
        title: 'Bug report',
        metadata: {},
        engagementRate: 0.8,
        duration: 120000,
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('work_communication');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Article Categorization', () => {
    it('should categorize tech articles as learning_reading', () => {
      const pageVisit = {
        url: 'https://medium.com/article',
        domain: 'medium.com',
        title: 'Understanding JavaScript Closures',
        metadata: {
          schemaType: 'Article',
          keywords: 'javascript, programming, closures',
          articleSection: 'Technology',
        },
        engagementRate: 0.8,
        duration: 180000, // 3 minutes
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('learning_reading');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should categorize news articles as news', () => {
      const pageVisit = {
        url: 'https://example.com/article',
        domain: 'example.com',
        title: 'Breaking News',
        metadata: {
          schemaType: 'NewsArticle',
        },
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('news');
      expect(result.confidence).toBe(0.95);
    });
  });

  describe('Domain-Based Categorization', () => {
    it('should categorize Stack Overflow as learning_reading', () => {
      const pageVisit = {
        url: 'https://stackoverflow.com/questions/12345',
        domain: 'stackoverflow.com',
        title: 'How to fix error',
        metadata: {},
        engagementRate: 0.8,
        duration: 120000,
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('learning_reading');
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should categorize Twitter as social_media', () => {
      const pageVisit = {
        url: 'https://twitter.com/user/status/123',
        domain: 'twitter.com',
        title: 'Tweet',
        metadata: {},
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('social_media');
      expect(result.confidence).toBe(0.9);
    });

    it('should categorize Amazon as shopping', () => {
      const pageVisit = {
        url: 'https://amazon.com/product/123',
        domain: 'amazon.com',
        title: 'Product page',
        metadata: {},
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('shopping');
      expect(result.confidence).toBe(0.9);
    });

    it('should categorize Wikipedia as reference', () => {
      const pageVisit = {
        url: 'https://en.wikipedia.org/wiki/Topic',
        domain: 'wikipedia.org',
        title: 'Topic - Wikipedia',
        metadata: {},
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('reference');
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('Documentation Sites', () => {
    it('should categorize Google Docs editing as work_documentation', () => {
      const pageVisit = {
        url: 'https://docs.google.com/document/d/123/edit',
        domain: 'docs.google.com',
        title: 'My Document',
        metadata: { isEditing: true },
        engagementRate: 0.9,
        duration: 300000, // 5 minutes
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('work_documentation');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should categorize Notion as work_documentation', () => {
      const pageVisit = {
        url: 'https://notion.so/page',
        domain: 'notion.so',
        title: 'My Notes',
        metadata: {},
        engagementRate: 0.8,
        duration: 180000,
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('work_documentation');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Unclassified Pages', () => {
    it('should mark pages with no metadata as unclassified', () => {
      const pageVisit = {
        url: 'https://unknown-site.com/page',
        domain: 'unknown-site.com',
        title: 'Some Page',
        metadata: {},
      };

      const result = PageCategorizer.categorize(pageVisit);

      expect(result.category).toBe('unclassified');
      expect(result.confidence).toBe(0);
      expect(result.method).toBe('unclassified');
    });
  });

  describe('Confidence Threshold', () => {
    it('should use CONFIDENCE_THRESHOLD constant', () => {
      expect(PageCategorizer.CONFIDENCE_THRESHOLD).toBe(0.6);
    });
  });

  describe('Duration Parsing', () => {
    it('should parse ISO 8601 duration correctly', () => {
      expect(PageCategorizer.parseDuration('PT45M30S')).toBe(2730);
      expect(PageCategorizer.parseDuration('PT1H')).toBe(3600);
      expect(PageCategorizer.parseDuration('PT2H30M')).toBe(9000);
      expect(PageCategorizer.parseDuration('PT30S')).toBe(30);
      expect(PageCategorizer.parseDuration(null)).toBe(0);
      expect(PageCategorizer.parseDuration('invalid')).toBe(0);
    });
  });
});
