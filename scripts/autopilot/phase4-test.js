import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from './core/config.js';
import { buildContentInventory } from './core/inventory.js';
import { loadTopicSeeds, evaluateCandidateTopic, selectBestTopicGap } from './core/gap-analyzer.js';
import { runAutopilotPipeline, parseCliArgs } from './index.js';
import { appendAuditLog, getAuditHistory } from './core/audit-logger.js';
import { sanitizeSlugForFilename } from './core/draft-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

export async function runPhase4Tests() {
  console.log(`\n======================================================================`);
  console.log(` SEO AUTOPILOT: PHASE 4 AUTOMATED TEST SUITE`);
  console.log(` Orchestrator, CLI Modes, Error Boundaries & Audit Log Verification`);
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
  // 1-3. Dry-Run Mode & Zero Side-Effects
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 1] Dry-Run Mode & Zero Side-Effects...`);
  const initialDraftsCount = fs.existsSync(CONFIG.draftsDir) ? fs.readdirSync(CONFIG.draftsDir).length : 0;
  const initialBlogCount = fs.readdirSync(CONFIG.blogDir).length;

  const dryRunResult = await runAutopilotPipeline({ isDryRun: true });
  assert('1. Dry-Run Executes Without API Keys', dryRunResult.status === 'DRY_RUN');

  const postDryRunDraftsCount = fs.existsSync(CONFIG.draftsDir) ? fs.readdirSync(CONFIG.draftsDir).length : 0;
  const postDryRunBlogCount = fs.readdirSync(CONFIG.blogDir).length;

  assert('2. Dry-Run Creates Zero Draft Files', initialDraftsCount === postDryRunDraftsCount);
  assert('3. Dry-Run Leaves Production Blog Untouched', initialBlogCount === postDryRunBlogCount && postDryRunBlogCount === 12);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4-6. Topic Seed JSON Loading & Error Boundaries
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 2] Topic Seed JSON & Error Boundaries...`);
  const seedLoad = loadTopicSeeds();
  assert('4. Topic Seeds Load Correctly from data/topic-seeds.json', seedLoad.success === true && seedLoad.topics.length >= 6);

  const missingSeed = loadTopicSeeds(path.join(ROOT_DIR, 'data', 'non-existent-seeds.json'));
  assert('5. Missing Topic Seed File Fails Safely', missingSeed.success === false && missingSeed.error.includes('not found'));

  const malformedTestFile = path.join(ROOT_DIR, 'data', 'temp-malformed.json');
  fs.writeFileSync(malformedTestFile, '{ invalid json }', 'utf-8');
  const malformedSeed = loadTopicSeeds(malformedTestFile);
  fs.unlinkSync(malformedTestFile);
  assert('6. Malformed Topic Seed JSON Fails Safely', malformedSeed.success === false && malformedSeed.error.includes('Failed to parse'));

  // ─────────────────────────────────────────────────────────────────────────────
  // 7-9. Topic Selection & Forced Topic Guardrails
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 3] Topic Selection & Forced Topic Guardrails...`);
  const inventory = buildContentInventory();
  const bestTopic = selectBestTopicGap(inventory, seedLoad.topics);
  assert('7. Safe Topic Selection Works', bestTopic.status === 'TOPIC_SELECTED' && bestTopic.selectedTopic !== null);

  // Forced topic with duplicate title
  const forcedDupResult = await runAutopilotPipeline({
    isDryRun: true,
    forcedTopic: 'When Should You Take an Ovulation Test? A Practical Guide to OPKs and LH Surges'
  });
  assert('8. REJECT Topic Cannot Be Forced', forcedDupResult.status === 'FORCED_TOPIC_REJECTED');

  // NO_STRONG_TOPIC_FOUND simulation
  const noTopicCandidates = [
    { id: '1', title: 'Ovulation Symptoms: 10 Signs You May Be Ovulating', slug: 'ovulation-symptoms', category: 'Fertility & Ovulation' }
  ];
  const noTopicGap = selectBestTopicGap(inventory, noTopicCandidates);
  assert('9. NO_STRONG_TOPIC_FOUND Halts Pipeline Safely', noTopicGap.status === 'NO_STRONG_TOPIC_FOUND');

  // ─────────────────────────────────────────────────────────────────────────────
  // 10-12. AI Flow & Safe Failure
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 4] AI Generation & Failure Handling...`);
  const mockSuccessPayload = {
    success: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    text: JSON.stringify({
      title: 'Short Luteal Phase: Causes, Symptoms, and How It Affects Conception',
      slug: 'short-luteal-phase-causes-conception-impact',
      description: 'Learn what a short luteal phase means for progesterone levels, implantation timing, and conception chances.',
      category: 'Fertility & Ovulation',
      readTime: '11 min read',
      author: 'Medical Editor Team',
      faqs: [
        { question: 'What is considered a short luteal phase?', answer: 'A luteal phase under 10 days is generally considered short.' },
        { question: 'Can you get pregnant with a short luteal phase?', answer: 'Yes, but it may take longer or require progesterone support.' }
      ],
      internalLinksUsed: ['/ovulation-calculator', '/fertility-calendar'],
      markdownBody: `# Short Luteal Phase: Causes, Symptoms, and How It Affects Conception\n\nUnderstanding luteal phase length helps optimize conception timing.\n\n## Table of Contents\n\n1. [What Is a Short Luteal Phase?](#what-is-a-short-luteal-phase)\n2. [Frequently Asked Questions](#frequently-asked-questions)\n3. [Related Articles](#related-articles)\n4. [Medical Disclaimer](#medical-disclaimer)\n\n## What Is a Short Luteal Phase?\n\nThe luteal phase is the post-ovulation phase. Use our [Ovulation Calculator](/ovulation-calculator) and [Fertility Calendar](/fertility-calendar) to track it.\n\n## Frequently Asked Questions\n\n### 1. What is considered a short luteal phase?\n\nA luteal phase under 10 days is generally considered short.\n\n### 2. Can you get pregnant with a short luteal phase?\n\nYes, but it may take longer or require progesterone support.\n\n## Related Articles\n\n- [How to Calculate Your Fertile Window Accurately](/blog/how-to-calculate-your-fertile-window)\n- [Understanding Ovulation: The Science of Your Cycle](/blog/understanding-ovulation)\n- [Basal Body Temperature (BBT) Charting: Confirming Ovulation](/blog/basal-body-temperature-bbt)\n- [The Cervical Mucus Tracker: How to Identify Fertile Fluid](/blog/cervical-mucus-guide)\n\n## Medical References\n\n1. **American Society for Reproductive Medicine (ASRM).** *Luteal Phase Deficiency Clinical Guideline.*\n\n## Medical Disclaimer\n\n> **Medical Disclaimer:** Educational information only. Not personal medical advice.`
    })
  };

  const generateRun = await runAutopilotPipeline({
    isGenerate: true,
    isDryRun: false,
    mockProviderResult: mockSuccessPayload
  });
  assert('10. Mocked Provider Success Generates Valid Draft', generateRun.status === 'SUCCESS');

  const mockFailurePayload = {
    success: false,
    error: 'Simulated 503 Provider Outage'
  };
  const failedRun = await runAutopilotPipeline({
    isGenerate: true,
    isDryRun: false,
    mockProviderResult: mockFailurePayload
  });
  assert('11. Provider Failure Halts Safely (GENERATION_FAILED)', failedRun.status === 'GENERATION_FAILED');

  const finalBlogCountAfterGen = fs.readdirSync(CONFIG.blogDir).length;
  assert('12. Production Content Untouched After Generate Runs', finalBlogCountAfterGen === 12);

  // ─────────────────────────────────────────────────────────────────────────────
  // 13-15. Draft Safety & Validation Enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 5] Draft Safety & Validation Enforcement...`);
  assert('13. Draft Created Exclusively in scripts/autopilot/drafts/', generateRun.draftPath.includes('drafts'));

  const mockInvalidDraftPayload = {
    success: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    text: JSON.stringify({
      title: 'Broken Draft Test',
      slug: 'broken-draft-test',
      description: 'Too short',
      category: 'Fertility & Ovulation',
      markdownBody: 'Almost empty body'
    })
  };
  const invalidGenRun = await runAutopilotPipeline({
    isGenerate: true,
    isDryRun: false,
    mockProviderResult: mockInvalidDraftPayload
  });
  assert('14. Draft Validation Failure Stops Pipeline (VALIDATION_FAILED)', invalidGenRun.status === 'VALIDATION_FAILED');

  // ─────────────────────────────────────────────────────────────────────────────
  // 16-19. Audit Logging & Sanitization
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 6] Audit Logging & Sanitization...`);
  const history = getAuditHistory(5);
  assert('15. Audit Log Written to data/autopilot-log.json', history.length > 0 && fs.existsSync(CONFIG.auditLogFile));

  const logContent = fs.readFileSync(CONFIG.auditLogFile, 'utf-8');
  assert('16. Audit Log Never Contains Raw Secret Keys', !logContent.includes('AIza') && !logContent.includes('gsk_'));

  // Test Log Rotation / Cap
  const testLogFile = path.join(ROOT_DIR, 'data', 'temp-test-log.json');
  for (let i = 0; i < 60; i++) {
    appendAuditLog({ runId: `test_${i}`, status: 'DRY_RUN' }, { auditLogFile: testLogFile });
  }
  const rotatedLog = JSON.parse(fs.readFileSync(testLogFile, 'utf-8'));
  fs.unlinkSync(testLogFile);
  assert('17. Log Rotation Bounds History (Max 50 Entries)', rotatedLog.length === 50);

  // ─────────────────────────────────────────────────────────────────────────────
  // 18-20. Filename Sanitization & CLI Parsing
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Group 7] Filename Sanitization & CLI Parsing...`);
  const dangerousSlug = '../../evil/path/../test??slug:name*';
  const cleanSlug = sanitizeSlugForFilename(dangerousSlug);
  assert('18. Draft Slug Sanitization Strips Traversal & Invalid Characters', cleanSlug === 'evil-path-test-slug-name' && !cleanSlug.includes('/'));

  const parsedCli = parseCliArgs(['--generate', '--force-topic=Test Topic']);
  assert('19. CLI Parser Interprets Flags Correctly', parsedCli.isGenerate === true && parsedCli.forcedTopic === 'Test Topic');

  // Final Summary
  console.log(`\n======================================================================`);
  console.log(` PHASE 4 TEST SUITE SUMMARY`);
  console.log(`======================================================================`);
  console.log(` Total Tests:   ${totalTests}`);
  console.log(` Tests Passed:  ${testsPassed} / ${totalTests} (${((testsPassed / totalTests) * 100).toFixed(0)}%)`);
  console.log(` Status:        ${testsPassed === totalTests ? '✓ ALL PHASE 4 TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log(`======================================================================\n`);

  return { totalTests, testsPassed, allPassed: testsPassed === totalTests };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPhase4Tests();
}
