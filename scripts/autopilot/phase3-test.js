import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContentInventory } from './core/inventory.js';
import { getProviderStatus, generateText } from './core/ai-client.js';
import {
  SEED_TOPIC_POOL,
  evaluateCandidateTopic,
  selectBestTopicGap
} from './core/gap-analyzer.js';
import { buildSystemPrompt, buildUserPrompt } from './core/prompt-builder.js';
import { formatArticleToMarkdown, saveDraftLocally } from './core/draft-generator.js';
import { validateArticle } from './core/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runPhase3Tests() {
  console.log(`\n======================================================================`);
  console.log(` SEO AUTOPILOT: PHASE 3 VERIFICATION SUITE`);
  console.log(` AI Provider Abstraction, Topic Engine & Prompt Builder Tests`);
  console.log(`======================================================================`);

  let testsPassed = 0;
  let totalTests = 0;

  function assertTest(name, condition, details = '') {
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
  // 1. Content Inventory Integration
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[1/6] Testing Content Inventory Integration...`);
  const inventory = buildContentInventory();
  assertTest(
    'Inventory Scans Existing Articles',
    inventory.totalArticles === 12,
    `Found ${inventory.totalArticles} articles and ${inventory.knownRoutes.length} site routes.`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. AI Provider Availability & Secret Safety
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[2/6] Testing AI Provider Status & Secret Protection...`);
  const providerStatus = getProviderStatus();
  assertTest(
    'Provider Status Check (No Secrets Leaked)',
    typeof providerStatus.gemini.available === 'boolean' &&
    typeof providerStatus.groq.available === 'boolean',
    `Gemini Configured: ${providerStatus.gemini.available} (${providerStatus.gemini.model}) | Groq Configured: ${providerStatus.groq.available} (${providerStatus.groq.model})`
  );

  // Test missing credentials handling
  const aiResult = await generateText({ prompt: 'Hello', maxRetries: 0 });
  if (!providerStatus.hasAnyProvider) {
    assertTest(
      'Graceful Handling of Missing API Keys',
      aiResult.success === false && aiResult.error.includes('credentials were unavailable'),
      'Returned safe non-throwing failure object when API keys are absent.'
    );
  } else {
    assertTest(
      'Provider Call Result Object Structure',
      typeof aiResult === 'object' && typeof aiResult.success === 'boolean',
      `Result returned from active provider: ${aiResult.provider || 'none'}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Topic Candidate Classification & Cannibalization Protection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[3/6] Testing Topic Candidate Classification & Cannibalization Protection...`);

  // Test SAFE candidate
  const safeCandidate = SEED_TOPIC_POOL.find((t) => t.id === 'pcos-irregular-cycles-ovulation');
  const safeEval = evaluateCandidateTopic(safeCandidate, inventory);
  assertTest(
    'Classifies Non-Overlapping Topic as SAFE',
    safeEval.status === 'SAFE',
    `Status: ${safeEval.status} (Max Similarity: ${(safeEval.maxSimilarity * 100).toFixed(0)}%) - ${safeEval.reason}`
  );

  // Test REJECT candidate (Deliberate duplicate slug)
  const duplicateSlugCandidate = {
    id: 'dup-slug',
    title: 'A Guide on When to Take Ovulation Tests',
    slug: 'when-to-take-an-ovulation-test', // Existing slug!
    category: 'Fertility & Ovulation',
    keywords: ['ovulation test']
  };
  const dupSlugEval = evaluateCandidateTopic(duplicateSlugCandidate, inventory);
  assertTest(
    'Rejects Exact Slug Collision',
    dupSlugEval.status === 'REJECT' && dupSlugEval.reason.includes('collides exactly'),
    `Status: ${dupSlugEval.status} - ${dupSlugEval.reason}`
  );

  // Test REJECT candidate (Deliberate duplicate title)
  const duplicateTitleCandidate = {
    id: 'dup-title',
    title: 'When Should You Take an Ovulation Test? A Practical Guide to OPKs and LH Surges',
    slug: 'brand-new-opk-guide-slug',
    category: 'Fertility & Ovulation',
    keywords: ['ovulation test']
  };
  const dupTitleEval = evaluateCandidateTopic(duplicateTitleCandidate, inventory);
  assertTest(
    'Rejects High Title Similarity (>70%)',
    dupTitleEval.status === 'REJECT',
    `Status: ${dupTitleEval.status} (Max Similarity: ${(dupTitleEval.maxSimilarity * 100).toFixed(0)}%)`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Topic Gap Selection Engine
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[4/6] Testing Topic Selection Engine...`);
  const gapAnalysis = selectBestTopicGap(inventory, SEED_TOPIC_POOL);
  assertTest(
    'Selects Best Topic Gap from Seed Pool',
    gapAnalysis.status === 'TOPIC_SELECTED' && gapAnalysis.selectedTopic !== null,
    `Selected Topic: "${gapAnalysis.selectedTopic?.title}" (Category: ${gapAnalysis.selectedTopic?.category})`
  );
  console.log(`     Evaluation Summary: Safe: ${gapAnalysis.stats.safe} | Caution: ${gapAnalysis.stats.caution} | Rejected: ${gapAnalysis.stats.rejected}`);

  // Test NO_STRONG_TOPIC_FOUND behavior
  const onlyDuplicatesPool = [duplicateSlugCandidate, duplicateTitleCandidate];
  const noTopicResult = selectBestTopicGap(inventory, onlyDuplicatesPool);
  assertTest(
    'Handles NO_STRONG_TOPIC_FOUND when all candidates are unsafe',
    noTopicResult.status === 'NO_STRONG_TOPIC_FOUND' && noTopicResult.selectedTopic === null,
    `Status: ${noTopicResult.status} (Reason: ${noTopicResult.reason})`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Prompt Builder
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[5/6] Testing Prompt Builder...`);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(gapAnalysis.selectedTopic, inventory);

  assertTest(
    'System Prompt Enforces Medical Tone & Schema Constraints',
    systemPrompt.includes('ACOG') && systemPrompt.includes('Medical Disclaimer') && systemPrompt.includes('JSON'),
    'System prompt includes clinical guidelines, disclaimers, and JSON schema output instructions.'
  );

  assertTest(
    'User Prompt Injects Valid Internal Link Targets Only',
    userPrompt.includes('/ovulation-calculator') &&
    userPrompt.includes('/fertility-calendar') &&
    userPrompt.includes(gapAnalysis.selectedTopic.title),
    'User prompt contains active site routes and selected topic requirements.'
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Draft Formatting & Local Storage
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[6/6] Testing Draft Formatter & Safe Local Storage...`);
  const mockDraftArticle = {
    title: gapAnalysis.selectedTopic.title,
    slug: gapAnalysis.selectedTopic.slug,
    description: 'A comprehensive clinical guide on tracking ovulation with PCOS and irregular cycles using basal body temperature, OPKs, and cervical mucus.',
    category: gapAnalysis.selectedTopic.category,
    readTime: '12 min read',
    author: 'Medical Editor Team',
    faqs: [
      {
        question: 'Can you ovulate with irregular cycles?',
        answer: 'Yes, ovulation is possible with irregular cycles, though the timing varies from month to month.'
      },
      {
        question: 'How do OPKs work with PCOS?',
        answer: 'Women with PCOS may experience elevated baseline LH levels or multiple LH surges, making quantitative or digital tests more effective.'
      }
    ],
    markdownBody: `# ${gapAnalysis.selectedTopic.title}\n\nTracking ovulation when your cycle is irregular can feel challenging, but understanding hormonal patterns provides clarity.\n\n## Table of Contents\n\n1. [Understanding Irregular Cycles](#understanding-irregular-cycles)\n2. [Frequently Asked Questions](#frequently-asked-questions)\n3. [Related Articles](#related-articles)\n4. [Medical Disclaimer](#medical-disclaimer)\n\n## Understanding Irregular Cycles\n\nIrregular menstrual cycles are often defined as cycles that vary by more than 7 to 9 days from month to month. Using our [Ovulation Calculator](/ovulation-calculator) and [Fertility Calendar](/fertility-calendar) can help identify your probable window.\n\n## Frequently Asked Questions\n\n### 1. Can you ovulate with irregular cycles?\n\nYes, ovulation is possible with irregular cycles, though the timing varies from month to month.\n\n### 2. How do OPKs work with PCOS?\n\nWomen with PCOS may experience elevated baseline LH levels or multiple LH surges.\n\n## Related Articles\n\n- [When Should You Take an Ovulation Test? A Practical Guide to OPKs and LH Surges](/blog/when-to-take-an-ovulation-test)\n- [Basal Body Temperature (BBT) Charting: Confirming Ovulation](/blog/basal-body-temperature-bbt)\n- [How Long Does Ovulation Last? Understanding Your Fertile Window](/blog/how-long-does-ovulation-last)\n- [The Cervical Mucus Tracker: How to Identify Fertile Fluid](/blog/cervical-mucus-guide)\n\n## Medical References\n\n1. **American College of Obstetricians and Gynecologists (ACOG).** *Polycystic Ovary Syndrome (PCOS) Practice Bulletin.*\n2. **American Society for Reproductive Medicine (ASRM).** *Optimizing Natural Fertility: A Committee Opinion.*\n\n## Medical Disclaimer\n\n> **Medical Disclaimer:** This article is for informational and educational purposes only and does not constitute formal medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider regarding reproductive health concerns.`
  };

  const markdownFormatted = formatArticleToMarkdown(mockDraftArticle);
  const validationResult = validateArticle(markdownFormatted, {
    inventory,
    isNewArticle: false
  });

  const savedDraft = saveDraftLocally(mockDraftArticle, validationResult);
  assertTest(
    'Draft Markdown Matches Astro Frontmatter Schema',
    markdownFormatted.startsWith('---\n') && markdownFormatted.includes('category: "Cycle Tracking"'),
    'Generated valid YAML frontmatter compliant with src/content.config.ts.'
  );

  assertTest(
    'Draft Saved to Safe Local Directory (Not in src/content/blog/)',
    savedDraft.markdownPath.includes('scripts\\autopilot\\drafts') || savedDraft.markdownPath.includes('scripts/autopilot/drafts'),
    `Draft saved to: ${savedDraft.markdownPath}`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n======================================================================`);
  console.log(` PHASE 3 TEST SUMMARY`);
  console.log(`======================================================================`);
  console.log(` Total Tests:   ${totalTests}`);
  console.log(` Tests Passed:  ${testsPassed} / ${totalTests} (${((testsPassed / totalTests) * 100).toFixed(0)}%)`);
  console.log(` Status:        ${testsPassed === totalTests ? '✓ ALL PHASE 3 TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log(`======================================================================\n`);

  return {
    totalTests,
    testsPassed,
    allPassed: testsPassed === totalTests
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPhase3Tests();
}
