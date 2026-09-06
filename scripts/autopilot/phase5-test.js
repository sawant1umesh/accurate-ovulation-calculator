import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { CONFIG } from './core/config.js';
import { promoteDraftToProduction, findLatestValidatedDraft } from './promote-draft.js';
import { formatArticleToMarkdown, saveDraftLocally } from './core/draft-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

export async function runPhase5Tests() {
  console.log(`\n======================================================================`);
  console.log(` SEO AUTOPILOT: PHASE 5 AUTOMATED VERIFICATION SUITE`);
  console.log(` GitHub Actions Workflow, Safe Promotion & Deployment Verification`);
  console.log(`======================================================================`);

  let totalTests = 0;
  let testsPassed = 0;

  function assert(name, condition, details = '') {
    totalTests++;
    if (condition) {
      testsPassed++;
      console.log(`  ✅ PASS: ${name}`);
      if (details) console.log(`     └─ ${details}`);
    } else {
      console.log(`  ❌ FAIL: ${name}`);
      if (details) console.log(`     └─ ${details}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1-6. Workflow File Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 1] GitHub Actions Workflow Verification...`);
  const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'seo-autopilot.yml');
  assert('1. Workflow File Exists (.github/workflows/seo-autopilot.yml)', fs.existsSync(workflowPath));

  const workflowRaw = fs.readFileSync(workflowPath, 'utf-8');
  let workflowParsed = null;
  try {
    workflowParsed = yaml.load(workflowRaw);
  } catch (err) {
    workflowParsed = null;
  }
  assert('2. Workflow YAML Syntax is Valid', workflowParsed !== null);

  const cronSchedule = workflowParsed?.on?.schedule?.[0]?.cron;
  assert('3. Cron Schedule Matches Saturday 8:00 AM IST (30 2 * * 6)', cronSchedule === '30 2 * * 6');

  const dispatchInputs = workflowParsed?.on?.workflow_dispatch?.inputs;
  assert('4. Workflow Dispatch Inputs Defined (mode & force_topic)',
    dispatchInputs?.mode?.default === 'dry-run' &&
    dispatchInputs?.mode?.options?.includes('dry-run') &&
    dispatchInputs?.mode?.options?.includes('publish') &&
    dispatchInputs?.force_topic !== undefined
  );

  const concurrencyGroup = workflowParsed?.concurrency?.group;
  const cancelInProgress = workflowParsed?.concurrency?.['cancel-in-progress'];
  assert('5. Concurrency Group Configured to Prevent Overlaps',
    concurrencyGroup === 'seo-autopilot-pipeline' && cancelInProgress === false
  );

  const permissions = workflowParsed?.permissions;
  assert('6. Minimum Scoped Permissions (contents: write)', permissions?.contents === 'write');

  // ─────────────────────────────────────────────────────────────────────────────
  // 7-10. Cloudflare & Secret Wiring
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 2] Cloudflare & Secret Configuration in Workflow...`);
  assert('7. AI Secrets Wired via Environment (GEMINI_API_KEY, GROQ_API_KEY)',
    workflowRaw.includes('GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}') &&
    workflowRaw.includes('GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}')
  );

  assert('8. Cloudflare Secrets Wired via Environment',
    workflowRaw.includes('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}') &&
    workflowRaw.includes('CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}')
  );

  assert('9. Exact Cloudflare Project Name (accurate-ovulation-calculator)',
    workflowRaw.includes('--project-name=accurate-ovulation-calculator')
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 11-16. Safe Draft Promotion Engine
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 3] Safe Draft Promotion Engine...`);
  const tempTestDraftsDir = path.join(ROOT_DIR, 'scripts', 'autopilot', 'test_drafts_temp');
  const tempTestBlogDir = path.join(ROOT_DIR, 'scripts', 'autopilot', 'test_blog_temp');

  if (fs.existsSync(tempTestDraftsDir)) fs.rmSync(tempTestDraftsDir, { recursive: true });
  if (fs.existsSync(tempTestBlogDir)) fs.rmSync(tempTestBlogDir, { recursive: true });

  fs.mkdirSync(tempTestDraftsDir, { recursive: true });
  fs.mkdirSync(tempTestBlogDir, { recursive: true });

  // Copy one existing article as mock blog base
  fs.copyFileSync(
    path.join(CONFIG.blogDir, 'understanding-ovulation.md'),
    path.join(tempTestBlogDir, 'understanding-ovulation.md')
  );

  const mockValidArticle = {
    title: 'Ovulation Pain (Mittelschmerz): Causes, Duration, and What It Means',
    slug: 'ovulation-pain-mittelschmerz-guide',
    description: 'Learn all about ovulation pain or mittelschmerz, including typical duration, normal vs abnormal twinges, and conception timing.',
    category: 'Physiology',
    readTime: '10 min read',
    author: 'Medical Editor Team',
    faqs: [
      { question: 'What is mittelschmerz?', answer: 'Mittelschmerz is one-sided lower abdominal pain associated with normal ovulation.' }
    ],
    markdownBody: '# Ovulation Pain (Mittelschmerz): Causes, Duration, and What It Means\n\nUnderstanding ovulation pain.\n\n## Table of Contents\n\n1. [Overview](#overview)\n2. [Frequently Asked Questions](#frequently-asked-questions)\n3. [Related Articles](#related-articles)\n4. [Medical References](#medical-references)\n5. [Medical Disclaimer](#medical-disclaimer)\n\n## Overview\n\nOvulation pain happens during follicle rupture. Use our [Ovulation Calculator](/ovulation-calculator) for timing.\n\n## Frequently Asked Questions\n\n### 1. What is mittelschmerz?\n\nMittelschmerz is one-sided lower abdominal pain associated with normal ovulation.\n\n## Related Articles\n\n- [Understanding Ovulation: The Science of Your Cycle](/blog/understanding-ovulation)\n\n## Medical References\n\n1. **ACOG.** *Ovulation Assessment Guideline.*\n\n## Medical Disclaimer\n\n> **Medical Disclaimer:** Educational information only.'
  };

  saveDraftLocally(mockValidArticle, { passed: true }, { draftsDir: tempTestDraftsDir });

  // Test 10: Promotion succeeds in isolated mock environment
  const promoResult = promoteDraftToProduction({
    draftsDir: tempTestDraftsDir,
    blogDir: tempTestBlogDir
  });
  assert('10. Valid Draft Promotes Successfully',
    promoResult.success === true &&
    fs.existsSync(path.join(tempTestBlogDir, 'ovulation-pain-mittelschmerz-guide.md'))
  );

  // Test 11: Attempt to overwrite existing article is rejected
  let overwriteError = null;
  try {
    promoteDraftToProduction({
      draftsDir: tempTestDraftsDir,
      blogDir: tempTestBlogDir
    });
  } catch (err) {
    overwriteError = err.message;
  }
  assert('11. Overwriting Existing Production Article is Blocked',
    overwriteError !== null && overwriteError.includes('already exists')
  );

  // Test 12: Path traversal attack is rejected
  let traversalError = null;
  try {
    promoteDraftToProduction({
      draftsDir: tempTestDraftsDir,
      blogDir: tempTestBlogDir,
      draftPath: path.join(ROOT_DIR, 'package.json') // Outside drafts dir
    });
  } catch (err) {
    traversalError = err.message;
  }
  assert('12. Path Traversal Draft Path is Rejected',
    traversalError !== null && traversalError.includes('Security Violation')
  );

  // Cleanup temp test directories
  fs.rmSync(tempTestDraftsDir, { recursive: true });
  fs.rmSync(tempTestBlogDir, { recursive: true });

  // ─────────────────────────────────────────────────────────────────────────────
  // 13-16. Production Integrity Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 4] Production Integrity & Build Safety...`);
  const blogCount = fs.readdirSync(CONFIG.blogDir).length;
  assert('13. Live Content in src/content/blog/ Remains 100% Untouched (12 Articles)', blogCount === 12);

  assert('14. Production Output Directory dist/ Intact', fs.existsSync(path.join(ROOT_DIR, 'dist')));

  // Final Summary
  console.log(`\n======================================================================`);
  console.log(` PHASE 5 TEST SUITE SUMMARY`);
  console.log(`======================================================================`);
  console.log(` Total Tests:   ${totalTests}`);
  console.log(` Tests Passed:  ${testsPassed} / ${totalTests} (${((testsPassed / totalTests) * 100).toFixed(0)}%)`);
  console.log(` Status:        ${testsPassed === totalTests ? '✓ ALL PHASE 5 TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log(`======================================================================\n`);

  return { totalTests, testsPassed, allPassed: testsPassed === totalTests };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPhase5Tests();
}
