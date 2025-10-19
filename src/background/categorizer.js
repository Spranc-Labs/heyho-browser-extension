/**
 * Page Categorization Service
 *
 * Categorizes page visits based on extracted metadata.
 * Uses rule-based approach with confidence scoring.
 */

class PageCategorizer {
  /**
   * Get confidence threshold
   */
  static get CONFIDENCE_THRESHOLD() {
    return 0.6;
  }

  /**
   * Get category constants
   */
  static get CATEGORIES() {
    return {
      WORK_CODING: 'work_coding',
      WORK_CODE_REVIEW: 'work_code_review',
      WORK_COMMUNICATION: 'work_communication',
      WORK_DOCUMENTATION: 'work_documentation',
      LEARNING_VIDEO: 'learning_video',
      LEARNING_READING: 'learning_reading',
      ENTERTAINMENT_VIDEO: 'entertainment_video',
      ENTERTAINMENT_BROWSING: 'entertainment_browsing',
      ENTERTAINMENT_SHORT_FORM: 'entertainment_short_form',
      SOCIAL_MEDIA: 'social_media',
      NEWS: 'news',
      SHOPPING: 'shopping',
      REFERENCE: 'reference',
      UNCLASSIFIED: 'unclassified'
    };
  }

  /**
   * Categorize a page visit based on metadata
   * @param {Object} pageVisit - Page visit object with metadata
   * @returns {Object} { category, confidence, method }
   */
  static categorize(pageVisit) {
    const { url, domain, title, metadata = {} } = pageVisit;

    // Step 1: Try Schema.org type (highest confidence)
    let result = this.categorizeBySchema(metadata, pageVisit);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 2: Try Open Graph + URL patterns
    result = this.categorizeByOpenGraph(metadata, url, domain, title);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 3: Try domain + URL patterns
    result = this.categorizeByDomain(domain, url, metadata, title);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 4: Try content signals
    result = this.categorizeByContent(metadata, pageVisit);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Low confidence - mark as unclassified
    return {
      category: this.CATEGORIES.UNCLASSIFIED,
      confidence: 0,
      method: 'unclassified'
    };
  }

  /**
   * Categorize based on Schema.org type
   */
  static categorizeBySchema(metadata, pageVisit) {
    const { schemaType } = metadata;
    if (!schemaType) {return null;}

    switch (schemaType) {
    case 'VideoObject':
      return this.categorizeVideo(metadata, pageVisit);
    case 'Movie':
    case 'TVSeries':
    case 'TVEpisode':
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.95 };
    case 'SoftwareSourceCode':
      return { category: this.CATEGORIES.WORK_CODING, confidence: 0.9 };
    case 'Course':
      return { category: this.CATEGORIES.LEARNING_VIDEO, confidence: 0.95 };
    case 'NewsArticle':
      return { category: this.CATEGORIES.NEWS, confidence: 0.95 };
    case 'Article':
    case 'BlogPosting':
      return this.categorizeArticle(metadata, pageVisit);
    case 'Product':
      return { category: this.CATEGORIES.SHOPPING, confidence: 0.85 };
    default:
      return null;
    }
  }

  /**
   * Categorize video content
   */
  static categorizeVideo(metadata, pageVisit) {
    const title = (pageVisit.title || '').toLowerCase();
    const url = pageVisit.url || '';
    const duration = this.parseDuration(metadata.schemaData?.duration);

    // Short video (<60s) or shorts URL = short-form
    if (duration > 0 && duration < 60) {
      return { category: this.CATEGORIES.ENTERTAINMENT_SHORT_FORM, confidence: 0.9 };
    }

    if (url.includes('/shorts') || url.includes('/reels')) {
      return { category: this.CATEGORIES.ENTERTAINMENT_SHORT_FORM, confidence: 0.95 };
    }

    // Learning keywords
    const learningKeywords = ['tutorial', 'course', 'lecture', 'learn', 'how to',
      'guide', 'lesson', 'training', 'workshop', 'education'];

    if (learningKeywords.some(kw => title.includes(kw))) {
      return { category: this.CATEGORIES.LEARNING_VIDEO, confidence: 0.95 };
    }

    // Educational genre
    if (metadata.schemaData?.genre?.toLowerCase() === 'education') {
      return { category: this.CATEGORIES.LEARNING_VIDEO, confidence: 0.9 };
    }

    // Entertainment keywords
    const entertainmentKeywords = ['trailer', 'movie', 'episode', 'stream', 'season'];
    if (entertainmentKeywords.some(kw => title.includes(kw))) {
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.85 };
    }

    // Long video without learning = likely entertainment
    if (duration > 1800) {
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.75 };
    }

    // Default video
    return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.7 };
  }

  /**
   * Categorize article content
   */
  static categorizeArticle(metadata, pageVisit) {
    const title = (pageVisit.title || '').toLowerCase();
    const keywords = (metadata.keywords || '').toLowerCase();
    const section = (metadata.articleSection || '').toLowerCase();

    // Tech/learning keywords
    const learningKeywords = ['programming', 'coding', 'development', 'software',
      'tutorial', 'guide', 'documentation', 'tech'];

    if (learningKeywords.some(kw =>
      title.includes(kw) || keywords.includes(kw) || section.includes(kw)
    )) {
      return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.85 };
    }

    // Long-form content
    if (metadata.wordCount > 2000) {
      return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.75 };
    }

    // Default article
    return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.65 };
  }

  /**
   * Categorize based on Open Graph tags
   */
  static categorizeByOpenGraph(metadata, url, domain, title) {
    const { ogType } = metadata;
    if (!ogType) {return null;}

    if (ogType === 'video.movie' || ogType === 'video.episode') {
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.95 };
    }

    if (ogType === 'article') {
      return this.categorizeArticle(metadata, { title, url, domain });
    }

    return null;
  }

  /**
   * Categorize based on domain and URL patterns
   */
  static categorizeByDomain(domain, url, metadata, _title) {
    // GitHub
    if (domain === 'github.com') {
      if (url.includes('/pull/')) {
        return { category: this.CATEGORIES.WORK_CODE_REVIEW, confidence: 0.95 };
      }
      if (url.includes('/issues/') || url.includes('/discussions/')) {
        return { category: this.CATEGORIES.WORK_COMMUNICATION, confidence: 0.85 };
      }
      if (url.includes('/blob/') || url.includes('/tree/') || url.includes('/commit/')) {
        return { category: this.CATEGORIES.WORK_CODING, confidence: 0.9 };
      }
      return { category: this.CATEGORIES.WORK_CODING, confidence: 0.75 };
    }

    // GitLab
    if (domain.includes('gitlab')) {
      if (url.includes('/merge_requests/')) {
        return { category: this.CATEGORIES.WORK_CODE_REVIEW, confidence: 0.95 };
      }
      if (url.includes('/issues/')) {
        return { category: this.CATEGORIES.WORK_COMMUNICATION, confidence: 0.85 };
      }
      return { category: this.CATEGORIES.WORK_CODING, confidence: 0.75 };
    }

    // Code editor platforms
    const codeDomains = ['vscode.dev', 'codesandbox.io', 'replit.com', 'codepen.io', 'jsfiddle.net'];
    if (codeDomains.some(d => domain.includes(d))) {
      return { category: this.CATEGORIES.WORK_CODING, confidence: 0.9 };
    }

    // Communication tools
    const commDomains = ['slack.com', 'teams.microsoft.com', 'discord.com',
      'zoom.us', 'meet.google.com'];
    if (commDomains.some(d => domain.includes(d))) {
      return { category: this.CATEGORIES.WORK_COMMUNICATION, confidence: 0.9 };
    }

    // Project management
    if (domain.includes('atlassian.net') || domain === 'linear.app' || domain === 'asana.com') {
      return { category: this.CATEGORIES.WORK_COMMUNICATION, confidence: 0.9 };
    }

    // Documentation tools
    const docDomains = ['notion.so', 'coda.io', 'roamresearch.com', 'obsidian.md'];
    if (docDomains.some(d => domain.includes(d))) {
      if (metadata.isEditing) {
        return { category: this.CATEGORIES.WORK_DOCUMENTATION, confidence: 0.9 };
      }
      return { category: this.CATEGORIES.WORK_DOCUMENTATION, confidence: 0.75 };
    }

    // Google Docs
    if (domain === 'docs.google.com') {
      if (url.includes('/edit')) {
        return { category: this.CATEGORIES.WORK_DOCUMENTATION, confidence: 0.9 };
      }
      return { category: this.CATEGORIES.WORK_DOCUMENTATION, confidence: 0.75 };
    }

    // Documentation sites
    const techDocDomains = ['stackoverflow.com', 'docs.python.org', 'developer.mozilla.org',
      'reactjs.org', 'vuejs.org', 'nodejs.org', 'go.dev'];
    if (techDocDomains.some(d => domain.includes(d))) {
      return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.9 };
    }

    // Social media
    const socialDomains = ['twitter.com', 'x.com', 'facebook.com', 'instagram.com',
      'linkedin.com', 'tiktok.com'];
    if (socialDomains.some(d => domain.includes(d))) {
      // LinkedIn articles = learning
      if (domain === 'linkedin.com' && url.includes('/pulse/')) {
        return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.8 };
      }
      return { category: this.CATEGORIES.SOCIAL_MEDIA, confidence: 0.9 };
    }

    // Reddit (check subreddit)
    if (domain === 'reddit.com') {
      const workSubreddits = ['/r/programming', '/r/coding', '/r/webdev',
        '/r/learnprogramming', '/r/javascript', '/r/python'];
      if (workSubreddits.some(sub => url.includes(sub))) {
        return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.7 };
      }
      return { category: this.CATEGORIES.SOCIAL_MEDIA, confidence: 0.9 };
    }

    // News sites
    const newsDomains = ['nytimes.com', 'bbc.com', 'cnn.com', 'theguardian.com',
      'reuters.com', 'apnews.com', 'techcrunch.com', 'theverge.com',
      'arstechnica.com', 'news.ycombinator.com', 'lobste.rs'];
    if (newsDomains.some(d => domain.includes(d))) {
      return { category: this.CATEGORIES.NEWS, confidence: 0.85 };
    }

    // Shopping sites
    const shopDomains = ['amazon.com', 'ebay.com', 'etsy.com', 'aliexpress.com',
      'walmart.com', 'target.com'];
    if (shopDomains.some(d => domain.includes(d))) {
      return { category: this.CATEGORIES.SHOPPING, confidence: 0.9 };
    }

    // Reference sites
    const referenceDomains = ['wikipedia.org', 'dictionary.com', 'translate.google.com',
      'weather.com', 'maps.google.com'];
    if (referenceDomains.some(d => domain.includes(d))) {
      return { category: this.CATEGORIES.REFERENCE, confidence: 0.9 };
    }

    // YouTube
    if (domain === 'youtube.com') {
      // Not a specific video page = browsing
      if (!url.includes('/watch') && !url.includes('/shorts')) {
        return { category: this.CATEGORIES.ENTERTAINMENT_BROWSING, confidence: 0.8 };
      }
    }

    // Streaming platforms
    const streamingDomains = ['netflix.com', 'hulu.com', 'disneyplus.com', 'hbo.com'];
    if (streamingDomains.some(d => domain.includes(d))) {
      if (!url.includes('/watch') && !url.includes('/play')) {
        return { category: this.CATEGORIES.ENTERTAINMENT_BROWSING, confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * Categorize based on page content signals
   */
  static categorizeByContent(metadata, _pageVisit) {
    // Has code editor = work coding
    if (metadata.hasCodeEditor) {
      return { category: this.CATEGORIES.WORK_CODING, confidence: 0.85 };
    }

    // Social feed
    if (metadata.hasFeed) {
      return { category: this.CATEGORIES.SOCIAL_MEDIA, confidence: 0.75 };
    }

    return null;
  }

  /**
   * Apply behavioral adjustments based on engagement and duration
   */
  static applyBehavioralAdjustments(result, pageVisit) {
    const { engagementRate = 0, duration = 0 } = pageVisit;

    // Very low engagement + short duration = potential distraction
    if (engagementRate < 0.2 && duration < 60000) {
      if (result.category.includes('work_') || result.category.includes('learning_')) {
        // Downgrade confidence
        return { ...result, confidence: result.confidence * 0.7 };
      }
    }

    // Editing mode increases documentation confidence
    if (result.category === this.CATEGORIES.WORK_DOCUMENTATION && pageVisit.metadata?.isEditing) {
      return { ...result, confidence: Math.min(result.confidence + 0.1, 1.0) };
    }

    return result;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  static parseDuration(duration) {
    if (!duration) {return 0;}

    try {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) {return 0;}

      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);
      const seconds = parseInt(match[3] || 0);

      return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
      return 0;
    }
  }
}

// Export for browser environment
self.PageCategorizer = PageCategorizer;
