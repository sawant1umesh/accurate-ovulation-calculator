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
  // Helper to generate a realistic long-form markdown article (>1500 words)
  const generateLongMockArticle = (title) => {
    const sections = [
      `# ${title}\n\nUnderstanding the physiological mechanics of the menstrual cycle is essential for anyone trying to conceive or manage their reproductive health. Among the various phases of the monthly cycle, the post-ovulatory window—known clinically as the luteal phase—plays a critical role in supporting embryo implantation and sustaining early pregnancy.\n\nWhen this phase is truncated or fails to produce sufficient progesterone, it is referred to as a short luteal phase or luteal phase defect. This guide provides an evidence-based clinical overview of what defines a short luteal phase, how to calculate its duration, its underlying hormonal causes, and what steps you can take to optimize your fertility.`,
      `## Table of Contents\n\n1. [What Is the Luteal Phase?](#what-is-the-luteal-phase)\n2. [Defining a Short Luteal Phase](#defining-a-short-luteal-phase)\n3. [The Biological Role of Progesterone](#the-biological-role-of-progesterone)\n4. [Common Causes of Luteal Phase Deficiency](#common-causes-of-luteal-phase-deficiency)\n5. [Recognizing Symptoms and Warning Signs](#recognizing-symptoms-and-warning-signs)\n6. [How to Calculate Your Luteal Phase Length](#how-to-calculate-your-luteal-phase-length)\n7. [Clinical Diagnostic Approaches](#clinical-diagnostic-approaches)\n8. [Evidence-Based Treatment Options](#evidence-based-treatment-options)\n9. [When to Consult a Fertility Specialist](#when-to-consult-a-fertility-specialist)\n10. [Frequently Asked Questions](#frequently-asked-questions)\n11. [Related Articles](#related-articles)\n12. [Medical References](#medical-references)\n13. [Medical Disclaimer](#medical-disclaimer)`,
      `## What Is the Luteal Phase?\n\nThe menstrual cycle consists of two primary operational segments separated by ovulation: the follicular phase and the luteal phase. During the follicular phase, the ovaries recruit and mature a dominant follicle under the stimulation of follicle-stimulating hormone (FSH). Once estrogen reaches a critical threshold, a surge of luteinizing hormone (LH) triggers the release of a mature oocyte into the fallopian tube.\n\nFollowing ovulation, the ruptured follicle undergoes a remarkable structural transformation, reorganizing into a temporary endocrine gland known as the corpus luteum. The lifespan and synthetic function of the corpus luteum define the luteal phase. Under normal conditions, the luteal phase remains remarkably constant across individuals, typically lasting between 12 and 14 days. During this time, the corpus luteum secretes substantial quantities of progesterone alongside modest amounts of estradiol to prepare the endometrium for potential blastocyst attachment.`,
      `## Defining a Short Luteal Phase\n\nIn reproductive endocrinology, a short luteal phase—frequently termed luteal phase deficiency (LPD) or luteal phase defect—is clinically characterized as a post-ovulatory interval lasting fewer than 10 to 11 days. When the interval between ovulation and the onset of the subsequent menses is less than 10 days, the uterine lining may begin to destabilize and shed before an incoming fertilized embryo has sufficient time to complete the complex process of implantation.\n\nBecause human blastocyst implantation typically occurs between 6 and 10 days post-ovulation (DPO), a premature drop in progesterone truncates the receptive window of the endometrium. This can prevent viable conception from establishing or result in very early pregnancy loss before a standard urine pregnancy test registers a positive result. Tracking your personal cycle metrics using our [Accurate Ovulation Calculator](/ovulation-calculator) and [Fertility Calendar](/fertility-calendar) allows you to monitor whether your luteal duration consistently falls within healthy clinical parameters.`,
      `## The Biological Role of Progesterone\n\nProgesterone is the master regulatory hormone of the second half of the menstrual cycle. Its primary physiological tasks include:\n\n- **Endometrial Transformation:** Shifting the uterine lining from a proliferative, estrogen-driven state into a vascularized, secretory state equipped with glycogen glands to nourish the early embryo.\n- **Immunological Modulation:** Suppressing maternal immune responses to prevent the maternal immune system from rejecting the semi-allogeneic embryo.\n- **Myometrial Quiescence:** Relaxing the muscular walls of the uterus, preventing premature contractions that could dislodge an implanting blastocyst.\n- **Basal Metabolic Elevation:** Stimulating the thermoregulatory center in the hypothalamus, which produces the characteristic 0.5°F to 1.0°F thermal shift observed on basal body temperature charts.\n\nWhen the corpus luteum produces inadequate progesterone or regresses prematurely, the endometrial lining fails to achieve full secretory differentiation, significantly lowering the statistical likelihood of successful implantation.`,
      `## Common Causes of Luteal Phase Deficiency\n\nLuteal phase shortening can stem from several physiological, hormonal, and environmental factors:\n\n1. **Poor Follicular Development:** The quality of the corpus luteum directly mirrors the quality of the follicle from which it originated. Suboptimal FSH stimulation or compromised egg maturation during the follicular phase frequently leads to an underperforming corpus luteum.\n2. **Polycystic Ovary Syndrome (PCOS):** Hormonal imbalances, insulin resistance, and elevated baseline LH levels can impair consistent ovulation and corpus luteum longevity.\n3. **Thyroid Dysfunction:** Both hypothyroidism and hyperthyroidism disrupt the hypothalamic-pituitary-ovarian (HPO) axis, frequently contributing to luteal phase shortening and anovulatory cycles.\n4. **Hyperprolactinemia:** Elevated prolactin levels suppress gonadotropin-releasing hormone (GnRH) pulsatility, dampening FSH and LH release.\n5. **Excessive Physical or Psychological Stress:** Chronic stress elevates cortisol and corticotropin-releasing hormone, which can downregulate reproductive hormone secretion.\n6. **Perimenopause:** As ovarian reserve diminishes, fluctuating gonadotropin patterns commonly produce shortened luteal phases.`,
      `## Recognizing Symptoms and Warning Signs\n\nMany individuals with a short luteal phase experience regular periods and remain asymptomatic until they encounter difficulties conceiving. However, common indicators include:\n\n- **Pre-Menstrual Spotting:** Brownish or pinkish spotting beginning 2 to 4 days before full menstrual bleeding begins.\n- **Shortened Overall Cycle Length:** Total menstrual cycle duration dropping below 24 to 26 days.\n- **Early Menstrual Bleeding Post-LH Surge:** Menstruation commencing within 7 to 9 days of a positive ovulation test.\n- **Unsustained BBT Rise:** A basal body temperature rise that drops back to baseline after only a few days rather than remaining elevated for 12 to 14 days.\n- **Difficulty Conceiving or Recurrent Early Losses:** Experiencing multiple cycles of well-timed intercourse without successful pregnancy.`,
      `## How to Calculate Your Luteal Phase Length\n\nCalculating your luteal phase requires accurately identifying two discrete biological events: the day of ovulation and the first day of full menstrual flow.\n\n1. **Identify Ovulation Day:** Use daily Basal Body Temperature (BBT) charting paired with Ovulation Predictor Kits (OPKs). Ovulation typically occurs 24 to 36 hours after your peak LH surge, and is confirmed when your BBT remains elevated for three consecutive mornings higher than the previous six days.\n2. **Identify Cycle Day 1:** Record the first day of full, red menstrual flow (do not count light pre-period spotting days).\n3. **Calculate the Interval:** Count the total number of days starting from the day after ovulation up to the day before your period begins. For example, if you ovulate on Cycle Day 14 and your period begins on Cycle Day 24, your luteal phase is 9 days—which qualifies as a short luteal phase.`,
      `## Clinical Diagnostic Approaches\n\nIf you suspect a shortened luteal phase, healthcare professionals utilize several diagnostic tools:\n\n- **Mid-Luteal Serum Progesterone:** A blood test performed approximately 7 days post-ovulation (commonly Cycle Day 21 in a 28-day cycle). A progesterone level above 10 ng/mL in natural cycles indicates robust ovulation and corpus luteum function.\n- **Serial Progesterone Monitoring:** Because progesterone is secreted in pulsatile bursts, multiple blood draws across the luteal phase provide a more comprehensive assessment.\n- **Endometrial Biopsy:** Historically used to assess histological dating of the endometrium, though less common today.\n- **Comprehensive Hormone Panel:** Evaluating TSH, free T4, prolactin, FSH, LH, and estradiol to identify systemic endocrine contributors.`,
      `## Evidence-Based Treatment Options\n\nMedical treatments for luteal phase defects are highly effective and tailored to the underlying cause:\n\n- **Supplemental Progesterone:** Administering micronized vaginal progesterone capsules or suppositories starting 2 to 3 days after confirmed ovulation helps sustain endometrial integrity.\n- **Ovulation Induction:** Medications such as clomiphene citrate or letrozole enhance follicular recruitment, leading to a healthier dominant follicle and a stronger corpus luteum post-ovulation.\n- **hCG Trigger Injections:** Administering human chorionic gonadotropin at mid-cycle stimulates final oocyte maturation and supports ongoing corpus luteum steroidogenesis.\n- **Nutritional and Lifestyle Support:** Ensuring adequate intake of vitamin B6, vitamin C, zinc, and magnesium supports natural steroidogenesis and hormonal balance.`,
      `## When to Consult a Fertility Specialist\n\nConsider scheduling a formal clinical consultation with an OB-GYN or reproductive endocrinologist if:\n\n- Your luteal phase consistently measures 10 days or fewer across three consecutive monitored cycles.\n- You experience recurrent mid-luteal spotting or very short menstrual cycles (< 24 days).\n- You are under 35 and have been trying to conceive for 12 months, or over 35 and trying for 6 months.\n- You have a confirmed history of PCOS, thyroid disorders, or previous early pregnancy losses.`,
      `## Frequently Asked Questions\n\n### 1. What is considered a short luteal phase?\n\nA luteal phase lasting fewer than 10 to 11 days between ovulation and the next period is clinically considered short and may compromise implantation.\n\n### 2. Can you get pregnant with a short luteal phase?\n\nYes, conception is possible, but a short luteal phase significantly reduces the window for blastocyst implantation and increases the risk of early loss.\n\n### 3. Does progesterone cream fix a short luteal phase?\n\nOver-the-counter creams generally lack standardized therapeutic concentrations. Prescription micronized progesterone administered vaginally is the evidence-based standard.\n\n### 4. How does stress affect the luteal phase?\n\nHigh cortisol levels can suppress GnRH pulsatility from the hypothalamus, leading to compromised LH surges and weaker corpus luteum function.\n\n### 5. Can an ovulation calculator detect a short luteal phase?\n\nAn ovulation calculator with customizable luteal phase settings helps you model your cycle variations and plan testing dates accurately.`,
      `## Related Articles\n\nExplore more clinically reviewed guides on fertility awareness and cycle health:\n\n- [How to Calculate Your Fertile Window Accurately: A Step-by-Step Guide](/blog/how-to-calculate-your-fertile-window)\n- [Understanding Ovulation: The Science of Your Cycle](/blog/understanding-ovulation)\n- [Basal Body Temperature (BBT) Charting: Confirming Ovulation](/blog/basal-body-temperature-bbt)\n- [The Cervical Mucus Tracker: How to Identify Fertile Fluid](/blog/cervical-mucus-guide)\n- [When Should You Take an Ovulation Test? A Practical Guide to OPKs and LH Surges](/blog/when-to-take-an-ovulation-test)\n- [How Long Does Ovulation Last? Understanding Your Fertile Window](/blog/how-long-does-ovulation-last)`,
      `## Medical References\n\n1. **American Society for Reproductive Medicine (ASRM).** *Diagnosis and treatment of luteal phase deficiency: a committee opinion.* Fertility and Sterility.\n2. **American College of Obstetricians and Gynecologists (ACOG).** *Optimizing Natural Fertility: Clinical Guidelines.*\n3. **Practice Committee of the American Society for Reproductive Medicine.** *Current clinical approaches to luteal phase support in natural and assisted reproduction.*\n4. **World Health Organization (WHO).** *Laboratory Manual for the Examination and Processing of Human Gametes and Reproductive Tissues.*`,
      `## Medical Disclaimer\n\n> **Medical Disclaimer:** This article is for informational and educational purposes only and does not constitute formal medical advice, diagnosis, or treatment. Always consult with a qualified physician or reproductive healthcare specialist regarding fertility concerns or hormonal treatments.`
    ];
    return sections.join('\n\n');
  };

  const mockSuccessPayload = {
    success: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    text: JSON.stringify({
      title: 'Short Luteal Phase: Causes, Symptoms, and How It Affects Conception',
      slug: 'short-luteal-phase-causes-conception-impact',
      description: 'Learn what a short luteal phase means for progesterone levels, implantation timing, and conception chances.',
      category: 'Fertility & Ovulation',
      readTime: '12 min read',
      author: 'Medical Editor Team',
      faqs: [
        { question: 'What is considered a short luteal phase?', answer: 'A luteal phase lasting fewer than 10 to 11 days between ovulation and the next period is clinically considered short and may compromise implantation.' },
        { question: 'Can you get pregnant with a short luteal phase?', answer: 'Yes, conception is possible, but a short luteal phase significantly reduces the window for blastocyst implantation and increases the risk of early loss.' },
        { question: 'Does progesterone cream fix a short luteal phase?', answer: 'Over-the-counter creams generally lack standardized therapeutic concentrations. Prescription micronized progesterone administered vaginally is the evidence-based standard.' },
        { question: 'How does stress affect the luteal phase?', answer: 'High cortisol levels can suppress GnRH pulsatility from the hypothalamus, leading to compromised LH surges and weaker corpus luteum function.' },
        { question: 'Can an ovulation calculator detect a short luteal phase?', answer: 'An ovulation calculator with customizable luteal phase settings helps you model your cycle variations and plan testing dates accurately.' }
      ],
      internalLinksUsed: ['/ovulation-calculator', '/fertility-calendar'],
      markdownBody: generateLongMockArticle('Short Luteal Phase: Causes, Symptoms, and How It Affects Conception')
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
