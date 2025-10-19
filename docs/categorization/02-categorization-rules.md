# Categorization Rules

## Overview

This document defines the **rule-based categorization logic** that uses extracted metadata to assign categories to page visits.

**Philosophy**: Be conservative. If we're not confident (>0.6), mark as `unclassified`.

## Confidence Scoring

**Confidence levels:**
- `0.9-1.0`: Very high confidence (e.g., Schema.org VideoObject + "tutorial" in title)
- `0.7-0.9`: High confidence (e.g., GitHub pull request URL)
- `0.6-0.7`: Medium confidence (e.g., article with keywords)
- `<0.6`: Low confidence → Mark as `unclassified`

## Categorization Flow

```
1. Check Schema.org type (highest confidence)
   ↓
2. Check Open Graph type + URL patterns
   ↓
3. Check domain + URL patterns
   ↓
4. Check page content signals
   ↓
5. Apply behavioral adjustments (engagement, duration)
   ↓
6. If confidence < 0.6 → unclassified
```

## Rule Definitions

### 1. Video Content

#### learning_video
```javascript
if (metadata.schemaType === 'VideoObject') {
  const duration = parseDuration(metadata.schemaData?.duration);
  const title = pageVisit.title.toLowerCase();

  // Learning keywords in title
  const learningKeywords = ['tutorial', 'course', 'lecture', 'learn', 'how to',
                             'guide', 'lesson', 'training', 'workshop'];

  if (learningKeywords.some(kw => title.includes(kw))) {
    return { category: 'learning_video', confidence: 0.95 };
  }

  // Educational genre
  if (metadata.schemaData?.genre?.toLowerCase() === 'education') {
    return { category: 'learning_video', confidence: 0.9 };
  }
}
```

#### entertainment_short_form
```javascript
// URL patterns for shorts
if (url.includes('/shorts') || url.includes('/reels') || url.includes('tiktok.com')) {
  return { category: 'entertainment_short_form', confidence: 0.95 };
}

// Short duration (<60 seconds)
if (metadata.schemaType === 'VideoObject') {
  const duration = parseDuration(metadata.schemaData?.duration);
  if (duration > 0 && duration < 60) {
    return { category: 'entertainment_short_form', confidence: 0.9 };
  }
}
```

#### entertainment_video
```javascript
// Schema.org Movie or TVSeries
if (metadata.schemaType === 'Movie' || metadata.schemaType === 'TVSeries') {
  return { category: 'entertainment_video', confidence: 0.95 };
}

// Open Graph video.movie or video.episode
if (metadata.ogType === 'video.movie' || metadata.ogType === 'video.episode') {
  return { category: 'entertainment_video', confidence: 0.95 };
}

// VideoObject without learning indicators
if (metadata.schemaType === 'VideoObject') {
  const title = pageVisit.title.toLowerCase();
  const entertainmentKeywords = ['trailer', 'movie', 'episode', 'season', 'stream'];

  if (entertainmentKeywords.some(kw => title.includes(kw))) {
    return { category: 'entertainment_video', confidence: 0.85 };
  }

  // Long video (>30 min) without learning keywords = likely entertainment
  const duration = parseDuration(metadata.schemaData?.duration);
  if (duration > 1800) {
    return { category: 'entertainment_video', confidence: 0.75 };
  }
}
```

### 2. Work/Code

#### work_coding
```javascript
// Schema.org SoftwareSourceCode
if (metadata.schemaType === 'SoftwareSourceCode') {
  return { category: 'work_coding', confidence: 0.9 };
}

// GitHub code URLs
if (domain === 'github.com') {
  if (url.includes('/blob/') || url.includes('/tree/') || url.includes('/commit/')) {
    return { category: 'work_coding', confidence: 0.9 };
  }
}

// Has code editor on page
if (metadata.hasCodeEditor) {
  return { category: 'work_coding', confidence: 0.85 };
}

// VS Code online, CodeSandbox, etc.
const codeDomains = ['vscode.dev', 'codesandbox.io', 'replit.com', 'codepen.io'];
if (codeDomains.includes(domain)) {
  return { category: 'work_coding', confidence: 0.9 };
}
```

#### work_code_review
```javascript
// GitHub pull requests
if (domain === 'github.com' && url.includes('/pull/')) {
  return { category: 'work_code_review', confidence: 0.95 };
}

// GitLab merge requests
if (domain.includes('gitlab') && url.includes('/merge_requests/')) {
  return { category: 'work_code_review', confidence: 0.95 };
}
```

#### work_communication
```javascript
// Communication tools
const commDomains = ['slack.com', 'teams.microsoft.com', 'discord.com',
                     'zoom.us', 'meet.google.com'];

if (commDomains.some(d => domain.includes(d))) {
  return { category: 'work_communication', confidence: 0.9 };
}

// GitHub issues, discussions
if (domain === 'github.com' && (url.includes('/issues/') || url.includes('/discussions/'))) {
  return { category: 'work_communication', confidence: 0.85 };
}

// Jira, Linear, etc.
if (domain.includes('atlassian.net') || domain === 'linear.app') {
  return { category: 'work_communication', confidence: 0.9 };
}

// Email
if (domain.includes('mail.google.com') || domain.includes('outlook')) {
  return { category: 'work_communication', confidence: 0.8 };
}
```

#### work_documentation
```javascript
// User is editing (contentEditable or textarea)
if (metadata.isEditing) {
  const docDomains = ['notion.so', 'docs.google.com', 'confluence.atlassian.com',
                      'coda.io', 'roamresearch.com'];

  if (docDomains.some(d => domain.includes(d))) {
    return { category: 'work_documentation', confidence: 0.9 };
  }
}

// Notion, Coda (even if not editing)
if (domain === 'notion.so' || domain === 'coda.io') {
  return { category: 'work_documentation', confidence: 0.75 };
}
```

### 3. Learning/Reading

#### learning_reading
```javascript
// Schema.org Article with tech keywords
if (metadata.schemaType === 'Article' || metadata.ogType === 'article') {
  const techKeywords = ['programming', 'coding', 'development', 'software',
                        'tutorial', 'guide', 'documentation'];

  const title = pageVisit.title.toLowerCase();
  const keywords = (metadata.keywords || '').toLowerCase();
  const section = (metadata.articleSection || '').toLowerCase();

  if (techKeywords.some(kw => title.includes(kw) || keywords.includes(kw) || section.includes(kw))) {
    return { category: 'learning_reading', confidence: 0.85 };
  }

  // Long-form content (>2000 words) = likely learning
  if (metadata.wordCount > 2000) {
    return { category: 'learning_reading', confidence: 0.75 };
  }
}

// Documentation sites
const docDomains = ['stackoverflow.com', 'docs.python.org', 'developer.mozilla.org',
                    'reactjs.org', 'vuejs.org', 'nodejs.org'];

if (docDomains.some(d => domain.includes(d))) {
  return { category: 'learning_reading', confidence: 0.9 };
}

// Medium, Dev.to with tech tags
if (domain === 'medium.com' || domain === 'dev.to') {
  const tags = (metadata.articleTags || '').toLowerCase();
  if (tags.includes('programming') || tags.includes('javascript')) {
    return { category: 'learning_reading', confidence: 0.8 };
  }
}
```

### 4. Entertainment/Social

#### social_media
```javascript
const socialDomains = ['twitter.com', 'x.com', 'facebook.com', 'instagram.com',
                       'linkedin.com', 'reddit.com'];

if (socialDomains.some(d => domain.includes(d))) {
  // LinkedIn article page = learning_reading (override)
  if (domain === 'linkedin.com' && url.includes('/pulse/')) {
    return { category: 'learning_reading', confidence: 0.8 };
  }

  // Reddit programming subreddit = learning/work
  if (domain === 'reddit.com') {
    const workSubreddits = ['/r/programming', '/r/coding', '/r/webdev',
                            '/r/learnprogramming', '/r/javascript'];

    if (workSubreddits.some(sub => url.includes(sub))) {
      return { category: 'learning_reading', confidence: 0.7 };
    }
  }

  return { category: 'social_media', confidence: 0.9 };
}

// Has social feed on page
if (metadata.hasFeed) {
  return { category: 'social_media', confidence: 0.75 };
}
```

#### entertainment_browsing
```javascript
// Generic browsing on entertainment sites
const entertainmentDomains = ['youtube.com', 'netflix.com', 'hulu.com',
                              'twitch.tv', 'spotify.com'];

if (entertainmentDomains.includes(domain)) {
  // Not a specific video page = browsing
  if (!url.includes('/watch') && !url.includes('/video/')) {
    return { category: 'entertainment_browsing', confidence: 0.8 };
  }
}
```

### 5. News

#### news
```javascript
// Schema.org NewsArticle
if (metadata.schemaType === 'NewsArticle') {
  return { category: 'news', confidence: 0.95 };
}

// News domains
const newsDomains = ['nytimes.com', 'bbc.com', 'cnn.com', 'theguardian.com',
                     'reuters.com', 'apnews.com', 'techcrunch.com', 'theverge.com',
                     'arstechnica.com'];

if (newsDomains.some(d => domain.includes(d))) {
  // Article URL pattern
  if (url.match(/\/\d{4}\/\d{2}\//)) {
    return { category: 'news', confidence: 0.9 };
  }

  return { category: 'news', confidence: 0.8 };
}

// Hacker News, Lobsters
if (domain === 'news.ycombinator.com' || domain === 'lobste.rs') {
  return { category: 'news', confidence: 0.85 };
}
```

### 6. Shopping

#### shopping
```javascript
// E-commerce domains
const shopDomains = ['amazon.com', 'ebay.com', 'etsy.com', 'aliexpress.com',
                     'walmart.com', 'target.com', 'shopify.com'];

if (shopDomains.some(d => domain.includes(d))) {
  return { category: 'shopping', confidence: 0.9 };
}

// Schema.org Product
if (metadata.schemaType === 'Product') {
  return { category: 'shopping', confidence: 0.85 };
}
```

### 7. Reference

#### reference
```javascript
// Utility/reference sites
const referenceDomains = ['wikipedia.org', 'dictionary.com', 'translate.google.com',
                          'weather.com', 'maps.google.com', 'calculator.net'];

if (referenceDomains.some(d => domain.includes(d))) {
  return { category: 'reference', confidence: 0.9 };
}

// Very short visits (<30 seconds) with low engagement = quick lookup
if (pageVisit.duration < 30000 && pageVisit.engagementRate < 0.3) {
  return { category: 'reference', confidence: 0.6 };
}
```

## Behavioral Adjustments

**Use engagement and duration to refine categories:**

```javascript
function applyBehavioralAdjustments(category, confidence, pageVisit) {
  const { engagementRate, duration } = pageVisit;

  // High engagement + long duration on entertainment = likely deep work or hyperfocus
  if (category === 'entertainment_video' && engagementRate > 0.8 && duration > 3600000) {
    // Could be learning (e.g., long conference talk)
    // But be conservative - keep as entertainment with note
    return { category, confidence: confidence * 0.9 };
  }

  // Very low engagement + short duration = distraction/browsing
  if (engagementRate < 0.2 && duration < 60000) {
    if (category.includes('work_') || category.includes('learning_')) {
      // Downgrade confidence
      return { category, confidence: confidence * 0.7 };
    }
  }

  // Editing mode significantly increases work_documentation confidence
  if (category === 'work_documentation' && pageVisit.metadata.isEditing) {
    return { category, confidence: Math.min(confidence + 0.1, 1.0) };
  }

  return { category, confidence };
}
```

## Implementation

```javascript
// src/background/categorizer.js

class PageCategorizer {
  /**
   * Categorize a page visit based on metadata
   * @param {PageVisit} pageVisit - Page visit object with metadata
   * @returns {Object} { category, confidence, method }
   */
  static categorize(pageVisit) {
    const { url, domain, title, metadata } = pageVisit;

    // Step 1: Try Schema.org type
    let result = this.categorizeBySchema(metadata, pageVisit);
    if (result && result.confidence >= 0.6) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 2: Try Open Graph + URL patterns
    result = this.categorizeByOpenGraph(metadata, url, domain);
    if (result && result.confidence >= 0.6) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 3: Try domain + URL patterns
    result = this.categorizeByDomain(domain, url, metadata);
    if (result && result.confidence >= 0.6) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 4: Try content signals
    result = this.categorizeByContent(metadata, pageVisit);
    if (result && result.confidence >= 0.6) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Low confidence - mark as unclassified
    return {
      category: 'unclassified',
      confidence: 0,
      method: 'unclassified'
    };
  }

  static categorizeBySchema(metadata, pageVisit) {
    const { schemaType, schemaData } = metadata;
    if (!schemaType) return null;

    switch (schemaType) {
      case 'VideoObject':
        return this.categorizeVideo(metadata, pageVisit);
      case 'Movie':
      case 'TVSeries':
      case 'TVEpisode':
        return { category: 'entertainment_video', confidence: 0.95 };
      case 'SoftwareSourceCode':
        return { category: 'work_coding', confidence: 0.9 };
      case 'Course':
        return { category: 'learning_video', confidence: 0.95 };
      case 'NewsArticle':
        return { category: 'news', confidence: 0.95 };
      case 'Article':
      case 'BlogPosting':
        return this.categorizeArticle(metadata, pageVisit);
      case 'Product':
        return { category: 'shopping', confidence: 0.85 };
      default:
        return null;
    }
  }

  static categorizeVideo(metadata, pageVisit) {
    const title = pageVisit.title.toLowerCase();
    const duration = this.parseDuration(metadata.schemaData?.duration);

    // Learning keywords
    const learningKeywords = ['tutorial', 'course', 'lecture', 'learn', 'how to',
                              'guide', 'lesson', 'training', 'workshop'];

    if (learningKeywords.some(kw => title.includes(kw))) {
      return { category: 'learning_video', confidence: 0.95 };
    }

    // Educational genre
    if (metadata.schemaData?.genre?.toLowerCase() === 'education') {
      return { category: 'learning_video', confidence: 0.9 };
    }

    // Short video (<60s) = shorts
    if (duration > 0 && duration < 60) {
      return { category: 'entertainment_short_form', confidence: 0.9 };
    }

    // Entertainment keywords
    const entertainmentKeywords = ['trailer', 'movie', 'episode', 'stream'];
    if (entertainmentKeywords.some(kw => title.includes(kw))) {
      return { category: 'entertainment_video', confidence: 0.85 };
    }

    // Long video without learning = likely entertainment
    if (duration > 1800) {
      return { category: 'entertainment_video', confidence: 0.75 };
    }

    // Default video
    return { category: 'entertainment_video', confidence: 0.7 };
  }

  static categorizeArticle(metadata, pageVisit) {
    const title = pageVisit.title.toLowerCase();
    const keywords = (metadata.keywords || '').toLowerCase();
    const section = (metadata.articleSection || '').toLowerCase();

    // Tech/learning keywords
    const learningKeywords = ['programming', 'coding', 'development', 'software',
                              'tutorial', 'guide', 'documentation'];

    if (learningKeywords.some(kw =>
      title.includes(kw) || keywords.includes(kw) || section.includes(kw)
    )) {
      return { category: 'learning_reading', confidence: 0.85 };
    }

    // Long-form content
    if (metadata.wordCount > 2000) {
      return { category: 'learning_reading', confidence: 0.75 };
    }

    // Default article
    return { category: 'learning_reading', confidence: 0.65 };
  }

  static categorizeByDomain(domain, url, metadata) {
    // Work domains
    if (domain === 'github.com') {
      if (url.includes('/pull/')) return { category: 'work_code_review', confidence: 0.95 };
      if (url.includes('/issues/')) return { category: 'work_communication', confidence: 0.85 };
      if (url.includes('/blob/')) return { category: 'work_coding', confidence: 0.9 };
    }

    // Social media
    const socialDomains = ['twitter.com', 'x.com', 'facebook.com', 'instagram.com'];
    if (socialDomains.includes(domain)) {
      return { category: 'social_media', confidence: 0.9 };
    }

    // News
    const newsDomains = ['nytimes.com', 'bbc.com', 'cnn.com', 'techcrunch.com'];
    if (newsDomains.some(d => domain.includes(d))) {
      return { category: 'news', confidence: 0.85 };
    }

    // Shopping
    const shopDomains = ['amazon.com', 'ebay.com', 'etsy.com'];
    if (shopDomains.some(d => domain.includes(d))) {
      return { category: 'shopping', confidence: 0.9 };
    }

    return null;
  }

  static applyBehavioralAdjustments(result, pageVisit) {
    // Implementation from above
    return result;
  }

  static parseDuration(duration) {
    // ISO 8601 parser (from metadata-extractor.js)
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }
}

// Export
self.PageCategorizer = PageCategorizer;
```

## Testing

```javascript
// Test cases
const testCases = [
  {
    name: 'YouTube Tutorial',
    pageVisit: {
      url: 'https://youtube.com/watch?v=xyz',
      title: 'React Tutorial for Beginners',
      domain: 'youtube.com',
      metadata: {
        schemaType: 'VideoObject',
        schemaData: { duration: 'PT45M30S' }
      }
    },
    expected: { category: 'learning_video', minConfidence: 0.9 }
  },
  {
    name: 'GitHub Pull Request',
    pageVisit: {
      url: 'https://github.com/user/repo/pull/123',
      domain: 'github.com',
      metadata: {}
    },
    expected: { category: 'work_code_review', minConfidence: 0.9 }
  },
  // ... more test cases
];
```

## Next Steps

- [Examples](./04-examples.md) - See real-world categorization examples
- [Implementation Plan](./03-implementation-plan.md) - Step-by-step guide

---

**Confidence Threshold**: 0.6 (anything below = unclassified)
**Categories**: 12 core + 1 unclassified
**Update Frequency**: Rules can be refined based on user feedback
