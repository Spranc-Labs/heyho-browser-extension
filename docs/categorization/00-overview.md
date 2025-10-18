# Page Visit Categorization - Overview

## What is Page Categorization?

Page categorization is the process of automatically labeling each page visit with a **category** that describes what the user was doing. This enables powerful insights like:

- "You spent 3 hours on `work_coding` today"
- "Your most productive time is 9am-12pm for `deep_work`"
- "You were distracted by `social_media` for 45 minutes during work hours"

## Why Categorize?

### Problem
Without categorization, we only know:
- ✅ You visited `youtube.com` for 30 minutes
- ❌ We don't know if you were:
  - Watching a coding tutorial (`learning_video`)
  - Watching movie trailers (`entertainment_video`)
  - Scrolling shorts (`entertainment_short_form`)

### Solution
With categorization, we can provide ADHD-friendly insights:
- **Pattern Detection**: "You tend to procrastinate on Slack after 3pm"
- **Focus Tracking**: "You achieved 2 hours of deep work today"
- **Context Switching**: "You switched between 15 different categories in 1 hour"
- **Productivity Analytics**: "Your best focus sessions are Monday mornings"

## Categories

We use **12 core categories** that cover most browsing behaviors:

| Category | Description | Examples |
|----------|-------------|----------|
| `work_coding` | Writing/reviewing code | GitHub pull requests, VS Code online, CodeSandbox |
| `work_communication` | Work-related communication | Slack, email, Jira, meetings |
| `work_documentation` | Writing docs, notes, planning | Notion, Google Docs (editing), Confluence |
| `learning_video` | Educational video content | YouTube tutorials, Udemy courses, conference talks |
| `learning_reading` | Reading articles, docs | Medium tech articles, documentation, Stack Overflow |
| `entertainment_video` | Movies, TV, long-form video | Netflix, YouTube movies, Twitch streams |
| `entertainment_browsing` | Casual browsing for fun | Reddit, YouTube homepage, Twitter feed |
| `entertainment_short_form` | Short-form video content | YouTube Shorts, TikTok, Instagram Reels |
| `social_media` | Social networking | Twitter, Facebook, Instagram, LinkedIn feed |
| `news` | News articles and updates | News sites, RSS feeds, Hacker News |
| `shopping` | E-commerce browsing | Amazon, eBay, product research |
| `reference` | Quick lookups, utilities | Dictionary, calculator, weather, maps |

### Special Category
| Category | Description | Usage |
|----------|-------------|-------|
| `unclassified` | Cannot determine category | Used when confidence < 0.6 or no metadata available |

## How It Works

```
User visits page
    ↓
Extract metadata
    ↓ (Schema.org, Open Graph, meta tags)
Apply categorization rules
    ↓
High confidence? (>0.6)
    ├─ YES → Assign category
    └─ NO  → Mark as "unclassified"
    ↓
Store with page visit
```

## Metadata-First Approach

**We use metadata extraction instead of ML models** because:

✅ **Faster**: Instant categorization (no network calls, no compute)
✅ **Free**: No API costs, no server resources
✅ **Accurate**: Schema.org and Open Graph are very reliable (90%+ accuracy)
✅ **Privacy**: No data sent externally
✅ **Offline**: Works even without internet

**Example: YouTube Video**
```javascript
// Page has this metadata:
<script type="application/ld+json">
{
  "@type": "VideoObject",
  "name": "React Tutorial for Beginners",
  "duration": "PT45M30S",
  "genre": "Education"
}
</script>

// Our system extracts:
{
  schema_type: "VideoObject",
  title: "React Tutorial for Beginners",
  duration: 2730, // seconds
  genre: "Education"
}

// Categorization rule:
if (schema_type === "VideoObject" && title.includes("tutorial")) {
  category = "learning_video"
  confidence = 0.95
}
```

## When ML Might Be Needed (Future)

**Rare cases where metadata is insufficient** (~5-10% of pages):
- Generic blog posts without Schema.org markup
- Internal company tools with no metadata
- New/unknown websites

For these cases, we mark as `unclassified` and can optionally add ML categorization in Phase 3.

## Benefits for ADHD Users

### 1. Pattern Recognition
"You tend to get distracted by `social_media` around 2pm. Consider a focus session then."

### 2. Hyperfocus Detection
"You spent 4 hours in `deep_work` on GitHub. Great job! Remember to take breaks."

### 3. Context Switching Awareness
"You switched between 20 different categories in the last hour. Try focusing on one task."

### 4. Productive Hours
"Your best `work_coding` sessions are 9am-12pm. Schedule important work then."

### 5. Procrastination Insights
"You spent 45 minutes on `entertainment_browsing` during planned work time."

## Architecture

```
Browser Extension (Client-Side)
    ↓
Page loads
    ↓
Content script extracts metadata
    ↓
Categorization service applies rules
    ↓
PageVisit object includes category
    ↓
Sync to backend with category
    ↓
Backend stores categorized data
    ↓
Insights API aggregates by category
```

## Data Structure

### PageVisit with Category
```javascript
{
  id: "pv_1234567890_42",
  url: "https://youtube.com/watch?v=xyz",
  title: "React Tutorial for Beginners",
  domain: "youtube.com",
  timestamp: 1234567890,
  duration: 2700,
  engagementRate: 0.85,

  // NEW: Categorization fields
  category: "learning_video",
  categoryConfidence: 0.95,
  categoryMethod: "metadata", // or "unclassified"

  // NEW: Metadata used for categorization
  metadata: {
    schemaType: "VideoObject",
    ogType: "video.other",
    videoDuration: 2730,
    keywords: ["react", "tutorial", "javascript"]
  }
}
```

## Success Criteria

- ✅ **90%+ categorization rate** (only 10% `unclassified`)
- ✅ **95%+ accuracy** (correct category for pages we categorize)
- ✅ **<10ms categorization time** (no user impact)
- ✅ **Zero external dependencies** (no API calls)
- ✅ **Works offline**

## Next Steps

1. Read [Metadata Extraction](./01-metadata-extraction.md) to understand how we extract page metadata
2. Read [Categorization Rules](./02-categorization-rules.md) to see the categorization logic
3. Read [Implementation Plan](./03-implementation-plan.md) for step-by-step implementation guide
4. Check [Examples](./04-examples.md) for real-world categorization scenarios

## FAQ

**Q: What if a page has no metadata?**
A: Mark as `unclassified`. This is rare (<10% of pages).

**Q: What about ambiguous pages (e.g., GitHub homepage)?**
A: If confidence < 0.6, mark as `unclassified`. Better safe than wrong.

**Q: Can users manually override categories?**
A: Not in Phase 1. This could be a Phase 3 feature.

**Q: How do we handle new sites we've never seen?**
A: Most modern sites use Schema.org or Open Graph. If not, mark as `unclassified`.

**Q: Will this slow down browsing?**
A: No. Metadata extraction happens asynchronously and takes <10ms.

---

**Status**: Ready for Implementation
**Timeline**: 1-2 weeks
**Dependencies**: None (metadata is already in DOM)
**Next**: [Metadata Extraction Details](./01-metadata-extraction.md)
