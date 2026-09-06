import fs from 'node:fs';
import { CONFIG } from './config.js';
import { calculateSimilarity } from './validator.js';

/**
 * Loads and validates topic seed candidates from data/topic-seeds.json.
 * Fails safely if the file is missing or contains malformed JSON.
 */
export function loadTopicSeeds(customFilePath = null) {
  const filePath = customFilePath || CONFIG.topicSeedsFile;

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `Topic seeds file not found at: ${filePath}`,
      topics: []
    };
  }

  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawContent);

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: `Topic seeds file must contain a JSON array of topics. Received: ${typeof parsed}`,
        topics: []
      };
    }

    // Validate individual topic schema
    const validTopics = [];
    const invalidTopics = [];

    parsed.forEach((topic, index) => {
      if (
        topic &&
        typeof topic.id === 'string' &&
        typeof topic.title === 'string' &&
        typeof topic.slug === 'string' &&
        typeof topic.category === 'string'
      ) {
        validTopics.push({
          id: topic.id.trim(),
          title: topic.title.trim(),
          slug: topic.slug.trim(),
          category: topic.category.trim(),
          targetIntent: topic.targetIntent || '',
          keywords: Array.isArray(topic.keywords) ? topic.keywords : [],
          suggestedInternalLinks: Array.isArray(topic.suggestedInternalLinks) ? topic.suggestedInternalLinks : []
        });
      } else {
        invalidTopics.push({ index, topic });
      }
    });

    if (validTopics.length === 0) {
      return {
        success: false,
        error: 'Topic seeds file contains zero valid topic objects.',
        topics: [],
        invalidCount: invalidTopics.length
      };
    }

    return {
      success: true,
      topics: validTopics,
      totalLoaded: validTopics.length,
      invalidCount: invalidTopics.length
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse topic seeds JSON: ${err.message}`,
      topics: []
    };
  }
}

/**
 * Curated default seed pool loaded safely from data/topic-seeds.json
 */
export const SEED_TOPIC_POOL = loadTopicSeeds().topics;

/**
 * Builds compact inventory context for AI reasoning and deterministic gap analysis.
 * Avoids sending full article bodies to save tokens and minimize API overhead.
 */
export function buildCompactInventoryContext(inventory) {
  return {
    siteName: CONFIG.site.name,
    niche: CONFIG.site.niche,
    totalExistingArticles: inventory.totalArticles,
    categories: inventory.categories,
    publishedCatalog: inventory.articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      category: a.category,
      pubDate: a.pubDate,
      wordCount: a.wordCount,
      hasFaqs: a.hasFaqs
    })),
    knownRoutes: inventory.knownRoutes
  };
}

/**
 * Extracts significant keyword tokens from text.
 */
function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'your', 'how', 'what', 'when', 'why'
  ]);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculates Jaccard similarity index between two keyword sets.
 */
function calculateJaccardIndex(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Evaluates a single candidate topic against all existing articles.
 * Classifies as SAFE, CAUTION, or REJECT with an explicit reason.
 */
export function evaluateCandidateTopic(candidate, inventory) {
  const existingArticles = inventory.articles || [];
  const candidateKeywords = extractKeywords(`${candidate.title} ${(candidate.keywords || []).join(' ')}`);

  let maxTitleSimilarity = 0;
  let mostSimilarArticle = null;
  let maxKeywordOverlap = 0;
  let keywordOverlapArticle = null;

  // 1. Check for exact slug collision
  const slugCollision = existingArticles.find((a) => a.slug === candidate.slug);
  if (slugCollision) {
    return {
      candidate,
      status: 'REJECT',
      reason: `Slug "${candidate.slug}" collides exactly with existing article in ${slugCollision.filePath}.`,
      maxSimilarity: 1.0,
      matchedArticle: slugCollision.title
    };
  }

  // 2. Check title similarity & keyword overlap against each existing article
  for (const existing of existingArticles) {
    const titleSim = calculateSimilarity(candidate.title, existing.title);
    if (titleSim > maxTitleSimilarity) {
      maxTitleSimilarity = titleSim;
      mostSimilarArticle = existing;
    }

    const existingKeywords = extractKeywords(`${existing.title} ${existing.description || ''}`);
    const overlap = calculateJaccardIndex(candidateKeywords, existingKeywords);
    if (overlap > maxKeywordOverlap) {
      maxKeywordOverlap = overlap;
      keywordOverlapArticle = existing;
    }
  }

  // 3. Classify based on thresholds
  if (maxTitleSimilarity >= CONFIG.similarityThresholds.rejectTitleSimilarity) {
    return {
      candidate,
      status: 'REJECT',
      reason: `High title similarity (${(maxTitleSimilarity * 100).toFixed(0)}%) to existing article "${mostSimilarArticle.title}". High risk of search cannibalization.`,
      maxSimilarity: maxTitleSimilarity,
      matchedArticle: mostSimilarArticle.title
    };
  }

  if (maxTitleSimilarity >= CONFIG.similarityThresholds.cautionTitleSimilarity || maxKeywordOverlap > 0.50) {
    return {
      candidate,
      status: 'CAUTION',
      reason: `Moderate overlap (${(maxTitleSimilarity * 100).toFixed(0)}% title similarity, ${(maxKeywordOverlap * 100).toFixed(0)}% keyword overlap) with "${mostSimilarArticle?.title || keywordOverlapArticle?.title}". Needs distinct angle.`,
      maxSimilarity: maxTitleSimilarity,
      matchedArticle: mostSimilarArticle?.title || keywordOverlapArticle?.title
    };
  }

  return {
    candidate,
    status: 'SAFE',
    reason: `Distinct search intent and low overlap (max similarity: ${(maxTitleSimilarity * 100).toFixed(0)}% with "${mostSimilarArticle?.title || 'none'}"). Non-cannibalizing educational gap.`,
    maxSimilarity: maxTitleSimilarity,
    matchedArticle: mostSimilarArticle?.title || null
  };
}

/**
 * Analyzes content inventory against candidate topics and selects the best
 * non-cannibalizing topic gap.
 *
 * Returns NO_STRONG_TOPIC_FOUND if no candidate is rated SAFE.
 */
export function selectBestTopicGap(inventory, candidatePool = SEED_TOPIC_POOL) {
  const evaluations = candidatePool.map((candidate) =>
    evaluateCandidateTopic(candidate, inventory)
  );

  const safeCandidates = evaluations.filter((e) => e.status === 'SAFE');
  const cautionCandidates = evaluations.filter((e) => e.status === 'CAUTION');
  const rejectedCandidates = evaluations.filter((e) => e.status === 'REJECT');

  if (safeCandidates.length === 0) {
    return {
      status: 'NO_STRONG_TOPIC_FOUND',
      selectedTopic: null,
      reason: 'No candidate topics passed the strict safety and cannibalization threshold.',
      evaluations,
      stats: {
        totalEvaluated: evaluations.length,
        safe: 0,
        caution: cautionCandidates.length,
        rejected: rejectedCandidates.length
      }
    };
  }

  // Pick the safest topic (lowest maximum similarity score)
  safeCandidates.sort((a, b) => a.maxSimilarity - b.maxSimilarity);
  const selected = safeCandidates[0];

  return {
    status: 'TOPIC_SELECTED',
    selectedTopic: selected.candidate,
    reason: selected.reason,
    evaluation: selected,
    evaluations,
    stats: {
      totalEvaluated: evaluations.length,
      safe: safeCandidates.length,
      caution: cautionCandidates.length,
      rejected: rejectedCandidates.length
    }
  };
}
