import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { CONFIG } from './config.js';
import { validateArticle } from './validator.js';

/**
 * Extracts JSON object from raw model output, stripping code blocks if present.
 */
export function extractJsonFromResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Raw response is empty or invalid.');
  }

  let cleaned = rawText.trim();
  // Strip markdown ```json ... ``` wrapper if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\r?\n/, '').replace(/\r?\n```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // If strict parse fails, attempt regex extraction between first '{' and last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const substring = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(substring);
    }
    throw new Error(`Failed to parse AI output as JSON: ${err.message}`);
  }
}

/**
 * Converts structured article JSON into the exact Astro Markdown frontmatter format
 * matching src/content.config.ts.
 */
export function formatArticleToMarkdown(articleData, options = {}) {
  const pubDate = options.pubDate || new Date().toISOString().split('T')[0];

  const frontmatterData = {
    title: articleData.title,
    description: articleData.description,
    pubDate: pubDate,
    author: articleData.author || CONFIG.site.author,
    category: articleData.category,
    readTime: articleData.readTime || '10 min read'
  };

  if (Array.isArray(articleData.faqs) && articleData.faqs.length > 0) {
    frontmatterData.faqs = articleData.faqs;
  }

  const yamlFrontmatter = yaml.dump(frontmatterData, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"'
  });

  const bodyContent = articleData.markdownBody || '';

  return `---\n${yamlFrontmatter}---\n\n${bodyContent.trim()}\n`;
}

/**
 * Sanitizes slug string for safe cross-platform filesystem use and prevents path traversal.
 */
export function sanitizeSlugForFilename(slug) {
  if (!slug || typeof slug !== 'string') return 'untitled-draft';
  const clean = slug
    .replace(/[/\\]/g, '-')
    .replace(/\.\.+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'untitled-draft';
}

/**
 * Saves a draft article safely inside scripts/autopilot/drafts/.
 * NEVER writes to src/content/blog/ in Phase 4.
 */
export function saveDraftLocally(articleData, validationResult, options = {}) {
  const draftsDir = options.draftsDir || CONFIG.draftsDir;

  if (!fs.existsSync(draftsDir)) {
    fs.mkdirSync(draftsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeSlug = sanitizeSlugForFilename(articleData.slug);

  const mdFileName = `${safeSlug}-${timestamp}.md`;
  const metaFileName = `${safeSlug}-${timestamp}.meta.json`;

  const mdFilePath = path.join(draftsDir, mdFileName);
  const metaFilePath = path.join(draftsDir, metaFileName);

  const markdownContent = formatArticleToMarkdown(articleData, options);

  fs.writeFileSync(mdFilePath, markdownContent, 'utf-8');
  fs.writeFileSync(metaFilePath, JSON.stringify({
    savedAt: new Date().toISOString(),
    slug: safeSlug,
    title: articleData.title,
    category: articleData.category,
    validationPassed: validationResult?.passed ?? false,
    validationSummary: validationResult,
    providerInfo: options.providerInfo || null,
    isDraft: true,
    published: false
  }, null, 2), 'utf-8');

  return {
    markdownPath: mdFilePath,
    metaPath: metaFilePath,
    slug: safeSlug,
    markdownContent
  };
}
