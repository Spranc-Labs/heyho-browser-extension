/**
 * Page Categorization Service
 *
 * Categorizes page visits based on extracted metadata.
 * Uses rule-based approach with confidence scoring.
 */

class PageCategorizer {
  /**
   * Duration and time constants (in seconds)
   */
  static get DURATION_CONSTANTS() {
    return {
      SHORT_VIDEO_THRESHOLD: 60, // Videos under 60s are short-form
      LONG_ARTICLE_THRESHOLD: 1800, // Articles over 30min are long-form
      LONG_VIDEO_THRESHOLD: 3600, // Videos over 1 hour
      IDLE_ENGAGEMENT_THRESHOLD: 60000, // 60 seconds in milliseconds
      MIN_ACTIVE_DURATION: 60, // Minimum 60s for productivity calculation
    };
  }

  /**
   * Confidence score constants
   */
  static get CONFIDENCE_SCORES() {
    return {
      THRESHOLD: 0.6, // Minimum confidence to use category
      VERY_HIGH: 0.95,
      HIGH: 0.9,
      MEDIUM_HIGH: 0.85,
      MEDIUM: 0.8,
      MEDIUM_LOW: 0.7,
      LOW: 0.6,
      // Behavioral adjustments
      IDLE_PENALTY: 0.2, // Reduce confidence by 20% for idle sessions
      SHORT_DURATION_MULTIPLIER: 0.7, // 70% confidence for very short visits
      NEGATIVE_ENGAGEMENT_MULTIPLIER: 0.1, // 10% confidence for negative engagement
    };
  }

  /**
   * Content size thresholds
   */
  static get CONTENT_THRESHOLDS() {
    return {
      MIN_ARTICLE_WORDS: 2000, // Articles should have 2000+ words
    };
  }

  /**
   * Get confidence threshold
   */
  static get CONFIDENCE_THRESHOLD() {
    return this.CONFIDENCE_SCORES.THRESHOLD;
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
      UNCLASSIFIED: 'unclassified',
    };
  }

  /**
   * Categorize a page visit based on metadata
   * @param {Object} pageVisit - Page visit object with metadata
   * @returns {Object} { category, confidence, method }
   */
  static categorize(pageVisit) {
    const { url, domain, title, metadata = {} } = pageVisit;

    const IS_DEV_MODE = self.ConfigModule?.IS_DEV_MODE || false;

    if (IS_DEV_MODE) {
      console.log('[Categorizer] Analyzing:', {
        url,
        domain,
        title,
        hasMetadata: !!metadata && Object.keys(metadata).length > 0,
        schemaType: metadata.schemaType,
        ogType: metadata.ogType,
      });
    }

    // Step 1: Try Schema.org type (highest confidence)
    let result = this.categorizeBySchema(metadata, pageVisit);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      if (IS_DEV_MODE) {
        console.log('[Categorizer] ✅ Step 1 (Schema):', result);
      }
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 2: Try Open Graph + URL patterns
    result = this.categorizeByOpenGraph(metadata, url, domain, title);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      if (IS_DEV_MODE) {
        console.log('[Categorizer] ✅ Step 2 (OpenGraph):', result);
      }
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 3: Try domain + URL patterns
    result = this.categorizeByDomain(domain, url, metadata, title);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      if (IS_DEV_MODE) {
        console.log('[Categorizer] ✅ Step 3 (Domain):', result);
      }
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Step 4: Try content signals
    result = this.categorizeByContent(metadata, pageVisit);
    if (result && result.confidence >= this.CONFIDENCE_THRESHOLD) {
      if (IS_DEV_MODE) {
        console.log('[Categorizer] ✅ Step 4 (Content/Keywords):', result);
      }
      result = this.applyBehavioralAdjustments(result, pageVisit);
      return { ...result, method: 'metadata' };
    }

    // Low confidence - mark as unclassified
    if (IS_DEV_MODE) {
      console.warn('[Categorizer] ❌ No match - marking as unclassified for:', {
        domain,
        title,
        metadataKeys: Object.keys(metadata),
      });
    }

    return {
      category: this.CATEGORIES.UNCLASSIFIED,
      confidence: 0,
      method: 'unclassified',
    };
  }

  /**
   * Categorize based on Schema.org type
   */
  static categorizeBySchema(metadata, pageVisit) {
    const { schemaType } = metadata;
    if (!schemaType) {
      return null;
    }

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
    const { SHORT_VIDEO_THRESHOLD } = this.DURATION_CONSTANTS;
    const { HIGH, VERY_HIGH } = this.CONFIDENCE_SCORES;

    // Short video (<60s) or shorts URL = short-form
    if (duration > 0 && duration < SHORT_VIDEO_THRESHOLD) {
      return { category: this.CATEGORIES.ENTERTAINMENT_SHORT_FORM, confidence: HIGH };
    }

    if (url.includes('/shorts') || url.includes('/reels')) {
      return { category: this.CATEGORIES.ENTERTAINMENT_SHORT_FORM, confidence: VERY_HIGH };
    }

    // Learning keywords
    const learningKeywords = [
      'tutorial',
      'course',
      'lecture',
      'learn',
      'how to',
      'guide',
      'lesson',
      'training',
      'workshop',
      'education',
    ];

    if (learningKeywords.some((kw) => title.includes(kw))) {
      return { category: this.CATEGORIES.LEARNING_VIDEO, confidence: 0.95 };
    }

    // Educational genre
    if (metadata.schemaData?.genre?.toLowerCase() === 'education') {
      return { category: this.CATEGORIES.LEARNING_VIDEO, confidence: 0.9 };
    }

    // Entertainment keywords
    const { MEDIUM_HIGH, MEDIUM_LOW } = this.CONFIDENCE_SCORES;
    const { LONG_ARTICLE_THRESHOLD } = this.DURATION_CONSTANTS;
    const entertainmentKeywords = ['trailer', 'movie', 'episode', 'stream', 'season'];
    if (entertainmentKeywords.some((kw) => title.includes(kw))) {
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: MEDIUM_HIGH };
    }

    // Long video without learning = likely entertainment
    if (duration > LONG_ARTICLE_THRESHOLD) {
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.75 };
    }

    // Default video
    return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: MEDIUM_LOW };
  }

  /**
   * Categorize article content
   */
  static categorizeArticle(metadata, pageVisit) {
    const title = (pageVisit.title || '').toLowerCase();
    const keywords = (metadata.keywords || '').toLowerCase();
    const section = (metadata.articleSection || '').toLowerCase();
    const { MEDIUM_HIGH } = this.CONFIDENCE_SCORES;
    const { MIN_ARTICLE_WORDS } = this.CONTENT_THRESHOLDS;

    // Tech/learning keywords
    const learningKeywords = [
      'programming',
      'coding',
      'development',
      'software',
      'tutorial',
      'guide',
      'documentation',
      'tech',
    ];

    if (
      learningKeywords.some(
        (kw) => title.includes(kw) || keywords.includes(kw) || section.includes(kw)
      )
    ) {
      return { category: this.CATEGORIES.LEARNING_READING, confidence: MEDIUM_HIGH };
    }

    // Long-form content
    if (metadata.wordCount > MIN_ARTICLE_WORDS) {
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
    if (!ogType) {
      return null;
    }

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
    const codeDomains = [
      'vscode.dev',
      'codesandbox.io',
      'replit.com',
      'codepen.io',
      'jsfiddle.net',
    ];
    if (codeDomains.some((d) => domain.includes(d))) {
      return { category: this.CATEGORIES.WORK_CODING, confidence: 0.9 };
    }

    // Communication tools
    const commDomains = [
      'slack.com',
      'teams.microsoft.com',
      'discord.com',
      'zoom.us',
      'meet.google.com',
      'mail.google.com',
      'outlook.live.com',
      'outlook.office.com',
    ];
    if (commDomains.some((d) => domain.includes(d))) {
      return { category: this.CATEGORIES.WORK_COMMUNICATION, confidence: 0.9 };
    }

    // Project management
    if (domain.includes('atlassian.net') || domain === 'linear.app' || domain === 'asana.com') {
      return { category: this.CATEGORIES.WORK_COMMUNICATION, confidence: 0.9 };
    }

    // Documentation tools
    const docDomains = ['notion.so', 'coda.io', 'roamresearch.com', 'obsidian.md'];
    if (docDomains.some((d) => domain.includes(d))) {
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
    const techDocDomains = [
      'stackoverflow.com',
      'docs.python.org',
      'developer.mozilla.org',
      'reactjs.org',
      'vuejs.org',
      'nodejs.org',
      'go.dev',
    ];
    if (techDocDomains.some((d) => domain.includes(d))) {
      return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.9 };
    }

    // Social media
    const socialDomains = [
      'twitter.com',
      'x.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'tiktok.com',
    ];
    if (socialDomains.some((d) => domain.includes(d))) {
      // LinkedIn articles = learning
      if (domain === 'linkedin.com' && url.includes('/pulse/')) {
        return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.8 };
      }
      return { category: this.CATEGORIES.SOCIAL_MEDIA, confidence: 0.9 };
    }

    // Reddit (check subreddit)
    if (domain === 'reddit.com') {
      const workSubreddits = [
        '/r/programming',
        '/r/coding',
        '/r/webdev',
        '/r/learnprogramming',
        '/r/javascript',
        '/r/python',
      ];
      if (workSubreddits.some((sub) => url.includes(sub))) {
        return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.7 };
      }
      return { category: this.CATEGORIES.SOCIAL_MEDIA, confidence: 0.9 };
    }

    // News sites
    const newsDomains = [
      'nytimes.com',
      'bbc.com',
      'cnn.com',
      'theguardian.com',
      'reuters.com',
      'apnews.com',
      'techcrunch.com',
      'theverge.com',
      'arstechnica.com',
      'news.ycombinator.com',
      'lobste.rs',
    ];
    if (newsDomains.some((d) => domain.includes(d))) {
      return { category: this.CATEGORIES.NEWS, confidence: 0.85 };
    }

    // Shopping sites
    const shopDomains = [
      'amazon.com',
      'ebay.com',
      'etsy.com',
      'aliexpress.com',
      'walmart.com',
      'target.com',
    ];
    if (shopDomains.some((d) => domain.includes(d))) {
      return { category: this.CATEGORIES.SHOPPING, confidence: 0.9 };
    }

    // Reference sites
    const referenceDomains = [
      'wikipedia.org',
      'dictionary.com',
      'translate.google.com',
      'weather.com',
      'maps.google.com',
    ];
    if (referenceDomains.some((d) => domain.includes(d))) {
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
    if (streamingDomains.some((d) => domain.includes(d))) {
      if (!url.includes('/watch') && !url.includes('/play')) {
        return { category: this.CATEGORIES.ENTERTAINMENT_BROWSING, confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * Categorize based on page content signals
   */
  static categorizeByContent(metadata, pageVisit) {
    // Has code editor = work coding
    if (metadata.hasCodeEditor) {
      return { category: this.CATEGORIES.WORK_CODING, confidence: 0.85 };
    }

    // Social feed
    if (metadata.hasFeed) {
      return { category: this.CATEGORIES.SOCIAL_MEDIA, confidence: 0.75 };
    }

    // Keyword-based categorization from text content
    // Combine all text sources for analysis
    const textSources = [
      pageVisit.title,
      metadata.description,
      metadata.preview?.siteName,
      metadata.preview?.description,
      metadata.applicationName,
      metadata.keywords,
    ];

    const text = textSources.filter(Boolean).join(' ').toLowerCase();

    // Skip if no meaningful text content
    if (text.length < 10) {
      return null;
    }

    // Music/Entertainment streaming keywords
    if (
      /\b(music|songs|albums?|playlist|artist|streaming|spotify|soundcloud|audio|listen|tracks?)\b/i.test(
        text
      )
    ) {
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.7 };
    }

    // Video streaming (if hasVideo or video keywords)
    if (
      metadata.hasVideo ||
      /\b(video|watch|stream|episode|movie|series|tv show|cinema)\b/i.test(text)
    ) {
      return { category: this.CATEGORIES.ENTERTAINMENT_VIDEO, confidence: 0.7 };
    }

    // Shopping keywords
    if (
      /\b(shop|buy|cart|checkout|price|product|store|purchase|sale|order|marketplace)\b/i.test(text)
    ) {
      return { category: this.CATEGORIES.SHOPPING, confidence: 0.7 };
    }

    // Social media keywords
    if (
      /\b(social|friends|followers?|posts?|likes?|shares?|community|profile|feed|timeline)\b/i.test(
        text
      )
    ) {
      return { category: this.CATEGORIES.SOCIAL_MEDIA, confidence: 0.7 };
    }

    // News/journalism keywords
    if (
      /\b(news|breaking|headlines?|journalism|reporter|article|press|media|current events)\b/i.test(
        text
      )
    ) {
      return { category: this.CATEGORIES.NEWS, confidence: 0.7 };
    }

    // Communication/email keywords
    if (
      /\b(email|mail|inbox|message|gmail|outlook|compose|reply|send|conversation)\b/i.test(text)
    ) {
      return { category: this.CATEGORIES.WORK_COMMUNICATION, confidence: 0.7 };
    }

    // Work/productivity keywords
    if (
      /\b(document|spreadsheet|presentation|editor|collaborate|workspace|office|productivity)\b/i.test(
        text
      )
    ) {
      return { category: this.CATEGORIES.WORK_DOCUMENTATION, confidence: 0.7 };
    }

    // Learning/education keywords
    if (
      /\b(tutorial|course|learn|education|training|guide|lesson|teach|study|class|university)\b/i.test(
        text
      )
    ) {
      return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.7 };
    }

    // Tech documentation keywords
    if (
      /\b(documentation|docs|api|reference|developer|programming|code|sdk|library)\b/i.test(text)
    ) {
      return { category: this.CATEGORIES.LEARNING_READING, confidence: 0.7 };
    }

    return null;
  }

  /**
   * Apply behavioral adjustments based on engagement and duration
   */
  static applyBehavioralAdjustments(result, pageVisit) {
    const { engagementRate = 0, duration = 0 } = pageVisit;
    const { IDLE_PENALTY, SHORT_DURATION_MULTIPLIER, NEGATIVE_ENGAGEMENT_MULTIPLIER } =
      this.CONFIDENCE_SCORES;
    const { IDLE_ENGAGEMENT_THRESHOLD } = this.DURATION_CONSTANTS;

    // Very low engagement + short duration = potential distraction
    if (engagementRate < IDLE_PENALTY && duration < IDLE_ENGAGEMENT_THRESHOLD) {
      if (result.category.includes('work_') || result.category.includes('learning_')) {
        // Downgrade confidence
        return { ...result, confidence: result.confidence * SHORT_DURATION_MULTIPLIER };
      }
    }

    // Editing mode increases documentation confidence
    if (result.category === this.CATEGORIES.WORK_DOCUMENTATION && pageVisit.metadata?.isEditing) {
      return {
        ...result,
        confidence: Math.min(result.confidence + NEGATIVE_ENGAGEMENT_MULTIPLIER, 1.0),
      };
    }

    return result;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  static parseDuration(duration) {
    if (!duration) {
      return 0;
    }

    const SECONDS_PER_HOUR = 3600;
    const SECONDS_PER_MINUTE = 60;

    try {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) {
        return 0;
      }

      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);
      const seconds = parseInt(match[3] || 0);

      return hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE + seconds;
    } catch (error) {
      return 0;
    }
  }
}

// Export for browser environment
self.PageCategorizer = PageCategorizer;
