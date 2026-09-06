import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from './core/config.js';
import { buildContentInventory } from './core/inventory.js';
import { validateArticle } from './core/validator.js';
import { sanitizeSlugForFilename } from './core/draft-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Finds the latest valid draft in scripts/autopilot/drafts/.
 */
export function findLatestValidatedDraft(draftsDir = CONFIG.draftsDir) {
  if (!fs.existsSync(draftsDir)) {
    return null;
  }

  const files = fs.readdirSync(draftsDir);
  const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

  if (metaFiles.length === 0) {
    return null;
  }

  // Sort by mtime descending (most recent first)
  metaFiles.sort((a, b) => {
    const timeA = fs.statSync(path.join(draftsDir, a)).mtimeMs;
    const timeB = fs.statSync(path.join(draftsDir, b)).mtimeMs;
    return timeB - timeA;
  });

  for (const metaFileName of metaFiles) {
    try {
      const metaPath = path.join(draftsDir, metaFileName);
      const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

      if (metaContent && metaContent.validationPassed === true) {
        const mdFileName = metaFileName.replace(/\.meta\.json$/, '.md');
        const mdFilePath = path.join(draftsDir, mdFileName);

        if (fs.existsSync(mdFilePath)) {
          return {
            metaPath,
            mdFilePath,
            meta: metaContent,
            slug: metaContent.slug
          };
        }
      }
    } catch {
      // Continue to next
    }
  }

  return null;
}

/**
 * Safely promotes a single validated draft from scripts/autopilot/drafts/
 * into src/content/blog/. Never overwrites existing articles.
 */
export function promoteDraftToProduction(options = {}) {
  const draftsDir = options.draftsDir || CONFIG.draftsDir;
  const blogDir = options.blogDir || CONFIG.blogDir;
  const targetDraftPath = options.draftPath || null;

  console.log(`[Promotion Engine] Checking for validated draft in: ${draftsDir}`);

  let draftInfo = null;

  if (targetDraftPath) {
    // Verify target draft is strictly inside draftsDir
    const resolvedPath = path.resolve(targetDraftPath);
    const resolvedDraftsDir = path.resolve(draftsDir);

    if (!resolvedPath.startsWith(resolvedDraftsDir)) {
      throw new Error(`Security Violation: Target draft path "${targetDraftPath}" is outside drafts directory.`);
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Draft file not found: ${resolvedPath}`);
    }

    const baseName = path.basename(resolvedPath, '.md');
    // Extract slug
    const slug = baseName.replace(/-\d{4}-\d{2}-\d{2}T[\d-]+Z?$/, '');

    draftInfo = {
      mdFilePath: resolvedPath,
      slug: sanitizeSlugForFilename(slug)
    };
  } else {
    draftInfo = findLatestValidatedDraft(draftsDir);
  }

  if (!draftInfo) {
    throw new Error('No validated draft available in drafts directory for promotion.');
  }

  const rawMarkdown = fs.readFileSync(draftInfo.mdFilePath, 'utf-8');
  const safeSlug = sanitizeSlugForFilename(draftInfo.slug);

  if (!safeSlug || safeSlug === 'untitled-draft') {
    throw new Error(`Invalid slug for promotion: "${draftInfo.slug}"`);
  }

  // Check target destination
  const targetProdPath = path.join(blogDir, `${safeSlug}.md`);
  const resolvedBlogDir = path.resolve(blogDir);
  const resolvedTarget = path.resolve(targetProdPath);

  if (!resolvedTarget.startsWith(resolvedBlogDir)) {
    throw new Error(`Security Violation: Target production path "${targetProdPath}" escapes blog directory.`);
  }

  if (fs.existsSync(targetProdPath)) {
    throw new Error(`Safety Violation: Target article "${safeSlug}.md" already exists in production blog. Overwriting is forbidden.`);
  }

  // Re-validate draft content against current inventory before promotion
  const inventory = buildContentInventory({ blogDir });
  const validationResult = validateArticle(rawMarkdown, {
    inventory,
    isNewArticle: true,
    slug: safeSlug
  });

  if (!validationResult.passed) {
    const errorDetails = validationResult.results.critical.map((c) => `[${c.rule}] ${c.message}`).join('; ');
    throw new Error(`Pre-promotion validation failed: ${errorDetails}`);
  }

  // Perform safe copy to src/content/blog/
  fs.writeFileSync(targetProdPath, rawMarkdown, 'utf-8');

  // Relative paths for logging
  const relativeProdPath = path.relative(CONFIG.rootDir, targetProdPath).replace(/\\/g, '/');

  console.log(`[Promotion Engine] ✓ Successfully promoted draft to production!`);
  console.log(`PROMOTED_FILE: ${relativeProdPath}`);
  console.log(`PROMOTED_SLUG: ${safeSlug}`);

  return {
    success: true,
    promotedFile: relativeProdPath,
    promotedSlug: safeSlug,
    targetPath: targetProdPath,
    validationResult
  };
}

// CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    promoteDraftToProduction();
  } catch (err) {
    console.error(`PROMOTION_FAILED: ${err.message}`);
    process.exit(1);
  }
}
