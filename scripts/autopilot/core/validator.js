import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdownFile, calculateWordCount, extractLinks, extractHeadings, getKnownSiteRoutes } from './inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

/**
 * Standard categories recognized in the repository
 */
export const VALID_CATEGORIES = [
  'Fertility & Ovulation',
  'Cycle Tracking',
  'Conception',
  'Pregnancy',
  'Physiology'
];

/**
 * Simple Levenshtein distance string similarity calculator
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  return (maxLength - track[s2.length][s1.length]) / maxLength;
}

/**
 * Validates a single blog article against the repository's content schema,
 * structural conventions, internal linking rules, and medical standards.
 *
 * @param {object} article - Parsed article object or raw markdown string
 * @param {object} options - Validation configuration & inventory context
 */
export function validateArticle(articleInput, options = {}) {
  const inventory = options.inventory || { articles: [], knownRoutes: [] };
  const knownRoutes = new Set(inventory.knownRoutes || getKnownSiteRoutes());
  const existingArticles = inventory.articles || [];

  const isStrictAutopilotMode = options.isNewArticle === true;
  const minWords = options.minWords || (isStrictAutopilotMode ? 1500 : 150);

  let frontmatter = {};
  let body = '';
  let rawFrontmatter = '';
  let hasValidFrontmatter = false;
  let yamlError = null;
  let slug = options.slug || '';
  let filePath = options.filePath || '';

  if (typeof articleInput === 'string') {
    const parsed = parseMarkdownFile(articleInput);
    frontmatter = parsed.frontmatter;
    body = parsed.body;
    rawFrontmatter = parsed.rawFrontmatter;
    hasValidFrontmatter = parsed.hasValidFrontmatter;
    yamlError = parsed.yamlError;
  } else if (typeof articleInput === 'object' && articleInput !== null) {
    frontmatter = articleInput.frontmatter || articleInput;
    body = articleInput.body || '';
    rawFrontmatter = articleInput.rawFrontmatter || '';
    hasValidFrontmatter = articleInput.hasValidFrontmatter !== undefined ? articleInput.hasValidFrontmatter : true;
    yamlError = articleInput.yamlError || null;
    slug = slug || articleInput.slug || '';
    filePath = filePath || articleInput.filePath || '';
  }

  const critical = [];
  const warnings = [];
  const info = [];
  const checks = {};

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. FRONTMATTER & SCHEMA VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  if (!hasValidFrontmatter) {
    critical.push({
      rule: 'FRONTMATTER_SYNTAX',
      message: `Invalid frontmatter YAML syntax: ${yamlError || 'Malformed delimiters or YAML structure'}`
    });
    checks.frontmatterValid = false;
  } else {
    checks.frontmatterValid = true;
  }

  // Required Field: title
  if (!frontmatter.title || typeof frontmatter.title !== 'string' || frontmatter.title.trim().length === 0) {
    critical.push({ rule: 'REQUIRED_FIELD_TITLE', message: 'Frontmatter is missing required field "title" or it is empty.' });
    checks.title = false;
  } else {
    checks.title = true;
    if (frontmatter.title.length < 15) {
      warnings.push({ rule: 'SHORT_TITLE', message: `Title is unusually short (${frontmatter.title.length} characters): "${frontmatter.title}".` });
    } else if (frontmatter.title.length > 100) {
      warnings.push({ rule: 'LONG_TITLE', message: `Title exceeds 100 characters (${frontmatter.title.length} chars). Consider shortening for SERP readability.` });
    }
  }

  // Required Field: description
  if (!frontmatter.description || typeof frontmatter.description !== 'string' || frontmatter.description.trim().length === 0) {
    critical.push({ rule: 'REQUIRED_FIELD_DESCRIPTION', message: 'Frontmatter is missing required field "description" or it is empty.' });
    checks.description = false;
  } else {
    checks.description = true;
    const descLen = frontmatter.description.length;
    if (descLen < 60) {
      warnings.push({ rule: 'SHORT_DESCRIPTION', message: `Meta description is too short (${descLen} chars). Optimal target: 140–160 chars.` });
    } else if (descLen > 200) {
      warnings.push({ rule: 'LONG_DESCRIPTION', message: `Meta description is unusually long (${descLen} chars). May be truncated in Google search snippets.` });
    }
  }

  // Required Field: pubDate
  if (!frontmatter.pubDate) {
    critical.push({ rule: 'REQUIRED_FIELD_PUBDATE', message: 'Frontmatter is missing required field "pubDate".' });
    checks.pubDate = false;
  } else {
    const parsedDate = new Date(frontmatter.pubDate);
    if (isNaN(parsedDate.getTime())) {
      critical.push({ rule: 'INVALID_PUBDATE_FORMAT', message: `pubDate "${frontmatter.pubDate}" cannot be parsed into a valid Date.` });
      checks.pubDate = false;
    } else {
      checks.pubDate = true;
    }
  }

  // Required Field: author
  if (!frontmatter.author || typeof frontmatter.author !== 'string') {
    critical.push({ rule: 'REQUIRED_FIELD_AUTHOR', message: 'Frontmatter is missing required field "author".' });
    checks.author = false;
  } else {
    checks.author = true;
    if (frontmatter.author !== 'Medical Editor Team') {
      info.push({ rule: 'AUTHOR_CONVENTION', message: `Author is "${frontmatter.author}". Standard repository convention is "Medical Editor Team".` });
    }
  }

  // Required Field: category
  if (!frontmatter.category || typeof frontmatter.category !== 'string') {
    critical.push({ rule: 'REQUIRED_FIELD_CATEGORY', message: 'Frontmatter is missing required field "category".' });
    checks.category = false;
  } else {
    checks.category = true;
    if (!VALID_CATEGORIES.includes(frontmatter.category)) {
      info.push({ rule: 'NON_STANDARD_CATEGORY', message: `Category "${frontmatter.category}" is outside the standard taxonomy: ${VALID_CATEGORIES.join(', ')}.` });
    }
  }

  // Required Field: readTime
  if (!frontmatter.readTime || typeof frontmatter.readTime !== 'string') {
    critical.push({ rule: 'REQUIRED_FIELD_READTIME', message: 'Frontmatter is missing required field "readTime".' });
    checks.readTime = false;
  } else {
    checks.readTime = true;
    if (!/^\d+\s+min\s+read$/i.test(frontmatter.readTime.trim())) {
      warnings.push({ rule: 'READTIME_FORMAT', message: `readTime "${frontmatter.readTime}" does not match standard pattern "X min read".` });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DUPLICATE DETECTION
  // ─────────────────────────────────────────────────────────────────────────────
  if (slug && existingArticles.length > 0) {
    const slugDuplicates = existingArticles.filter((a) => a.slug === slug && a.filePath !== filePath);
    if (slugDuplicates.length > 0) {
      critical.push({ rule: 'DUPLICATE_SLUG', message: `Slug "${slug}" collides with existing article in ${slugDuplicates[0].filePath}.` });
      checks.uniqueSlug = false;
    } else {
      checks.uniqueSlug = true;
    }

    if (frontmatter.title) {
      for (const other of existingArticles) {
        if (other.slug === slug && other.filePath === filePath) continue;
        if (other.title && other.title.toLowerCase() === frontmatter.title.toLowerCase()) {
          critical.push({ rule: 'DUPLICATE_TITLE', message: `Exact title duplicate found: "${frontmatter.title}" already exists in ${other.filePath}.` });
          checks.uniqueTitle = false;
          break;
        }
        const similarity = calculateSimilarity(frontmatter.title, other.title);
        if (similarity > 0.85) {
          warnings.push({
            rule: 'HIGH_TITLE_SIMILARITY',
            message: `Title is ${(similarity * 100).toFixed(0)}% similar to "${other.title}" in ${other.filePath}. Risk of topic cannibalization.`
          });
        }
      }
      if (checks.uniqueTitle === undefined) checks.uniqueTitle = true;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. WORD COUNT & PROSE DEPTH
  // ─────────────────────────────────────────────────────────────────────────────
  const wordCount = calculateWordCount(body);
  checks.wordCount = wordCount;

  if (wordCount < 50) {
    critical.push({ rule: 'EMPTY_ARTICLE_BODY', message: `Article body is almost empty (${wordCount} words).` });
  } else if (wordCount < minWords) {
    if (isStrictAutopilotMode) {
      critical.push({ rule: 'INSUFFICIENT_WORD_COUNT', message: `Article word count (${wordCount} words) is below the strict autopilot minimum of ${minWords} words.` });
    } else {
      info.push({ rule: 'SHORT_LEGACY_POST', message: `Article word count is ${wordCount} words (standard long-form baseline: 1500+ words).` });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ARTICLE STRUCTURE & HEADINGS
  // ─────────────────────────────────────────────────────────────────────────────
  const headings = extractHeadings(body);
  const h2Count = headings.filter((h) => h.level === 2).length;
  checks.h2Count = h2Count;

  if (h2Count < 2 && wordCount > 300) {
    warnings.push({ rule: 'INSUFFICIENT_SECTIONS', message: `Article has only ${h2Count} H2 section headings. Long-form articles should have clear section hierarchy.` });
  }

  const hasToc = headings.some((h) => /table\s+of\s+contents/i.test(h.text));
  checks.hasTableOfContents = hasToc;
  if (!hasToc && wordCount >= 1000) {
    info.push({ rule: 'MISSING_TOC', message: 'Article exceeds 1000 words but has no "## Table of Contents" section.' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. FAQ VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  if (frontmatter.faqs !== undefined) {
    if (!Array.isArray(frontmatter.faqs)) {
      critical.push({ rule: 'MALFORMED_FAQS', message: 'Frontmatter "faqs" field must be an array of question/answer objects.' });
      checks.faqsValid = false;
    } else {
      checks.faqsValid = true;
      let invalidFaqItems = 0;
      frontmatter.faqs.forEach((faq, index) => {
        if (!faq || typeof faq.question !== 'string' || !faq.question.trim() ||
            typeof faq.answer !== 'string' || !faq.answer.trim()) {
          invalidFaqItems++;
          critical.push({ rule: 'INVALID_FAQ_ITEM', message: `FAQ item #${index + 1} is missing a valid "question" or "answer" string.` });
        }
      });

      if (frontmatter.faqs.length > 0 && invalidFaqItems === 0) {
        checks.faqCount = frontmatter.faqs.length;
        // Check if FAQs are also present in markdown body
        const hasFaqSection = headings.some((h) => /frequently\s+asked\s+questions/i.test(h.text));
        if (!hasFaqSection && wordCount >= 1000) {
          warnings.push({ rule: 'FAQ_SCHEMA_BODY_MISMATCH', message: `Frontmatter defines ${frontmatter.faqs.length} FAQs, but no "## Frequently Asked Questions" heading was found in the body.` });
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. INTERNAL LINK INTEGRITY
  // ─────────────────────────────────────────────────────────────────────────────
  const { internalLinks, externalLinks } = extractLinks(body);
  const brokenLinks = [];

  for (const link of internalLinks) {
    let targetPath = link.url;
    // Strip trailing hash/fragment: /blog/slug#anchor -> /blog/slug
    const hashIndex = targetPath.indexOf('#');
    if (hashIndex !== -1) {
      targetPath = targetPath.slice(0, hashIndex);
    }

    // Ignore empty/in-page pure anchor links: "#table-of-contents"
    if (!targetPath || targetPath === '') continue;

    // Normalize target path (remove trailing slash except for root '/')
    if (targetPath.length > 1 && targetPath.endsWith('/')) {
      targetPath = targetPath.slice(0, -1);
    }

    // Check against known routes
    if (!knownRoutes.has(targetPath)) {
      brokenLinks.push({ text: link.text, url: link.url, resolvedPath: targetPath });
      critical.push({
        rule: 'BROKEN_INTERNAL_LINK',
        message: `Broken internal link detected: "[${link.text}](${link.url})". Target route "${targetPath}" does not exist.`
      });
    }
  }

  checks.internalLinksTotal = internalLinks.length;
  checks.brokenLinksTotal = brokenLinks.length;
  checks.externalLinksTotal = externalLinks.length;

  if (isStrictAutopilotMode && internalLinks.length === 0) {
    warnings.push({ rule: 'NO_INTERNAL_LINKS', message: 'New article has 0 internal links. Articles must link to calculator pages and related blog posts.' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. MEDICAL DISCLAIMER & CITATIONS CONVENTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const hasMedicalDisclaimer = /medical\s+disclaimer/i.test(body) || /medical\s+advice/i.test(body);
  checks.hasMedicalDisclaimer = hasMedicalDisclaimer;

  if (!hasMedicalDisclaimer && wordCount > 500) {
    warnings.push({ rule: 'MISSING_MEDICAL_DISCLAIMER', message: 'Article does not contain an explicit Medical Disclaimer notice.' });
  }

  const hasReferences = /medical\s+references/i.test(body) || /references/i.test(body);
  checks.hasMedicalReferences = hasReferences;
  if (!hasReferences && wordCount >= 1500) {
    info.push({ rule: 'RECOMMENDED_REFERENCES', message: 'Long-form clinical guide is missing a "## Medical References" citation section.' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPILE FINAL RESULT
  // ─────────────────────────────────────────────────────────────────────────────
  const hasCritical = critical.length > 0;
  const hasWarnings = warnings.length > 0;
  const passed = !hasCritical;

  return {
    slug,
    filePath,
    title: frontmatter.title || null,
    passed,
    hasCritical,
    hasWarnings,
    results: {
      critical,
      warnings,
      info
    },
    checks,
    stats: {
      wordCount,
      headingCount: headings.length,
      internalLinksCount: internalLinks.length,
      externalLinksCount: externalLinks.length,
      faqCount: Array.isArray(frontmatter.faqs) ? frontmatter.faqs.length : 0
    }
  };
}

/**
 * Validates all articles in the provided inventory.
 */
export function validateAllArticles(inventory, options = {}) {
  const results = [];
  let totalPassed = 0;
  let totalCritical = 0;
  let totalWarnings = 0;

  for (const article of inventory.articles) {
    const validation = validateArticle(article, {
      ...options,
      inventory,
      slug: article.slug,
      filePath: article.filePath,
      isNewArticle: false
    });

    if (validation.passed) totalPassed++;
    if (validation.hasCritical) totalCritical++;
    if (validation.hasWarnings) totalWarnings++;

    results.push(validation);
  }

  return {
    scannedAt: new Date().toISOString(),
    totalScanned: inventory.articles.length,
    totalPassed,
    totalCritical,
    totalWarnings,
    results
  };
}
