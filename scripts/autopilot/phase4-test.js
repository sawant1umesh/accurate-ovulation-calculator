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
  // Helper to generate a realistic long-form markdown article (>1800 validator-counted words)
  const generateLongMockArticle = (title) => {
    const sections = [
      `# ${title}\n\nUnderstanding the complex physiological mechanics of the human menstrual cycle is essential for anyone actively trying to conceive or seeking a clearer perspective on their reproductive health. Among the distinct phases that comprise the monthly cycle, the post-ovulatory window—known clinically in reproductive endocrinology as the luteal phase—plays a paramount role in facilitating embryo implantation and sustaining early pregnancy development.\n\nWhen this critical phase is abnormally truncated or fails to generate sufficient circulating progesterone concentrations, it is clinically identified as a short luteal phase or luteal phase defect. This in-depth clinical guide provides an evidence-based overview of what defines a short luteal phase, how to calculate its exact duration across consecutive cycles, its underlying hormonal and follicular causes, and the practical evidence-based medical and lifestyle strategies available to optimize your reproductive outcomes.`,
      `## Table of Contents\n\n1. [What Is the Luteal Phase?](#what-is-the-luteal-phase)\n2. [Defining a Short Luteal Phase and Clinical Thresholds](#defining-a-short-luteal-phase-and-clinical-thresholds)\n3. [The Biological Role and Mechanism of Progesterone](#the-biological-role-and-mechanism-of-progesterone)\n4. [Primary Etiologies and Hormonal Causes of Luteal Deficiency](#primary-etiologies-and-hormonal-causes-of-luteal-deficiency)\n5. [Recognizing Symptoms, Warning Signs, and Body Indicators](#recognizing-symptoms-warning-signs-and-body-indicators)\n6. [Step-by-Step Method to Calculate Your Luteal Phase](#step-by-step-method-to-calculate-your-luteal-phase)\n7. [Clinical Diagnostic Procedures and Testing Protocols](#clinical-diagnostic-procedures-and-testing-protocols)\n8. [Evidence-Based Medical and Nutritional Interventions](#evidence-based-medical-and-nutritional-interventions)\n9. [When to Consult a Licensed Reproductive Endocrinologist](#when-to-consult-a-licensed-reproductive-endocrinologist)\n10. [Frequently Asked Questions](#frequently-asked-questions)\n11. [Related Articles](#related-articles)\n12. [Medical References](#medical-references)\n13. [Medical Disclaimer](#medical-disclaimer)`,
      `## What Is the Luteal Phase?\n\nThe typical human menstrual cycle operates across two primary physiological segments separated by ovulation: the follicular phase and the luteal phase. During the follicular phase, the ovaries recruit and mature a cohort of follicles under the continuous stimulation of pituitary follicle-stimulating hormone (FSH). As the dominant Graafian follicle matures, it synthesizes increasing quantities of estradiol. Once systemic estrogen levels attain a sustained critical threshold, the anterior pituitary releases an acute surge of luteinizing hormone (LH), triggering the physical release of the mature oocyte into the fallopian tube.\n\nImmediately following the rupture of the follicle during ovulation, the remaining granulosa and theca cells undergo rapid vascularization and luteinization, reorganizing into a specialized temporary endocrine structure termed the corpus luteum. The lifespan, metabolic health, and synthetic capacity of this temporary gland govern the luteal phase. Under optimal physiological conditions, the luteal phase exhibits remarkable consistency across cycles, typically spanning between 12 and 14 days. Throughout this vital window, the corpus luteum synthesizes high levels of progesterone alongside secondary estradiol to prepare the endometrium for potential blastocyst attachment and early placentation.`,
      `## Defining a Short Luteal Phase and Clinical Thresholds\n\nIn contemporary clinical reproductive medicine, a short luteal phase—often termed luteal phase defect (LPD) or luteal phase deficiency—is formally characterized as a post-ovulatory duration spanning fewer than 10 to 11 days. When the interval between verified ovulation and the onset of the subsequent menstrual period falls below this threshold, the uterine lining frequently lacks the structural maturity and biochemical stability required to support an incoming fertilized blastocyst.\n\nBecause mammalian embryonic attachment and implantation occur between 6 and 10 days post-ovulation (DPO), a premature reduction in corpus luteum steroidogenesis destabilizes the endometrium before the developing trophoblast cells can successfully invade the maternal decidua and produce human chorionic gonadotropin (hCG). Consequently, this premature breakdown leads to either complete failure of implantation or very early subclinical pregnancy loss before routine urinary pregnancy tests can register positive confirmation. Using specialized digital fertility tracking tools like our [Accurate Ovulation Calculator](/ovulation-calculator) and [Fertility Calendar](/fertility-calendar) allows you to document your daily biomarkers and determine whether your luteal duration consistently falls within healthy clinical parameters.`,
      `## The Biological Role and Mechanism of Progesterone\n\nProgesterone is the chief regulatory steroid governing the second half of the female reproductive cycle. Following ovulation, circulating progesterone concentrations rise dramatically from baseline follicular levels (under 1 ng/mL) to mid-luteal peaks that frequently exceed 10 to 20 ng/mL in healthy ovulatory cycles. Progesterone exerts several critical biological functions:\n\n- **Decidualization of the Endometrium:** Progesterone converts estrogen-primed proliferative endometrial cells into mature secretory decidual cells rich in glycogen, stromal proteins, and specialized secretory vacuoles designed to nourish the pre-implantation embryo.\n- **Immunological Privilege:** Progesterone induces the synthesis of progesterone-induced blocking factor (PIBF) and modulates maternal uterine natural killer (uNK) cells, ensuring the maternal immune system does not reject the genetically semi-allogeneic embryo.\n- **Myometrial Quiescence and Vascular Support:** By inhibiting smooth muscle contractility in the uterine wall, progesterone prevents spontaneous uterine contractions that could otherwise dislodge an adhering blastocyst, while simultaneously promoting spiral artery remodeling to supply the early placenta with maternal blood.\n- **Thermoregulatory Reset:** Progesterone acts directly on the thermoregulatory control centers located in the preoptic nucleus of the hypothalamus, elevating basal metabolic rate and generating the characteristic 0.5°F to 1.0°F thermal shift tracked during basal body temperature monitoring.\n\nWhen the corpus luteum exhibits deficient steroidogenesis or undergoes premature apoptosis, the uterine lining fails to maintain its differentiated state, drastically impairing the likelihood of viable clinical conception.`,
      `## Primary Etiologies and Hormonal Causes of Luteal Deficiency\n\nA shortened luteal phase can arise from multiple interconnected endocrine, follicular, and environmental causes:\n\n1. **Compromised Folliculogenesis:** The biochemical capacity of the corpus luteum directly reflects the cellular health of the pre-ovulatory follicle from which it emerged. Insufficient FSH stimulation, diminished granulosa cell proliferation, or poor follicular vascularity during the follicular phase almost invariably produces an underperforming corpus luteum post-ovulation.\n2. **Polycystic Ovary Syndrome (PCOS):** Individuals with PCOS frequently exhibit chronic follicular arrest, irregular pulsatile LH secretion, hyperandrogenism, and elevated baseline insulin levels. These metabolic disruptions impair follicular maturation and frequently yield luteal phase defects when spontaneous ovulation occurs.\n3. **Thyroid Hormone Irregularities:** Thyroid receptors are abundantly expressed on ovarian granulosa cells. Subclinical hypothyroidism or autoimmune thyroiditis disrupts the hypothalamic-pituitary-ovarian (HPO) axis, dampening ovarian steroidogenesis and predisposing individuals to abbreviated luteal intervals.\n4. **Hyperprolactinemia:** Mildly or moderately elevated serum prolactin levels inhibit the pulsatile release of gonadotropin-releasing hormone (GnRH) from the hypothalamus, blunting downstream pituitary LH surges and compromising corpus luteum stability.\n5. **Psychological and Physiological Stress:** Chronic systemic stress elevates circulating cortisol and corticotropin-releasing hormone (CRH), which directly suppress central GnRH pulsatility and impair peripheral ovarian hormone production.\n6. **Advanced Maternal Age and Perimenopause:** As ovarian reserve declines with biological age, remaining follicles may exhibit reduced responsiveness to gonadotropins, resulting in diminished luteal phase steroid output and shorter cycle lengths.`,
      `## Recognizing Symptoms, Warning Signs, and Body Indicators\n\nWhile some individuals with an abbreviated luteal phase remain completely asymptomatic and experience seemingly regular monthly periods, many exhibit subtle physical and physiological indicators upon close daily tracking:\n\n- **Pre-Menstrual Spotting:** Brownish or light pinkish vaginal discharge beginning 2 to 4 days prior to the onset of full menstrual flow, reflecting premature endometrial shedding.\n- **Abnormally Short Overall Cycle Lengths:** Total menstrual cycle durations dropping consistently below 24 to 26 days across consecutive months.\n- **Rapid Onset of Menstruation Following LH Peak:** Menstrual bleeding initiating within 7 to 9 days after observing a peak positive result on an ovulation predictor kit.\n- **Unsustained Basal Body Temperature Rise:** A thermal shift that rises post-ovulation but drops precipitously back to follicular baseline after only 5 to 7 days rather than maintaining an elevated plateau for 11 to 14 days.\n- **Unexplained Conception Delays:** Experiencing multiple consecutive cycles of precisely timed intercourse during the peak fertile window without achieving clinical conception or encountering recurrent very early pregnancy losses.`,
      `## Step-by-Step Method to Calculate Your Luteal Phase\n\nAccurately calculating your luteal phase requires tracking two distinct physiological milestones across at least two to three consecutive menstrual cycles:\n\n1. **Pinpoint the Precise Day of Ovulation:** Utilize daily Basal Body Temperature (BBT) measurements taken immediately upon waking alongside urine-based Ovulation Predictor Kits (OPKs). Ovulation typically occurs 24 to 36 hours after the initiation of the LH surge, and is retrospectively confirmed when waking temperatures remain elevated for three consecutive mornings higher than the previous six baseline days.\n2. **Identify Cycle Day 1 of the Next Period:** Record the calendar date of the first day of full, bright red menstrual flow. Do not count light brownish spotting as Day 1.\n3. **Compute the Exact Day Difference:** Count the total number of calendar days starting from the day immediately following ovulation up through the day preceding the start of full menstrual bleeding. For example, if ovulation is confirmed on Cycle Day 15 and full menstrual bleeding begins on Cycle Day 24, your luteal phase measures exactly 8 days, which meets the clinical criteria for a short luteal phase.`,
      `## Clinical Diagnostic Procedures and Testing Protocols\n\nWhen evaluating a suspected luteal phase deficiency, medical clinicians utilize several standardized diagnostic testing strategies:\n\n- **Mid-Luteal Serum Progesterone Assay:** A single venipuncture blood draw performed roughly 7 days post-ovulation (typically Cycle Day 21 in a standard 28-day cycle). A serum concentration exceeding 10 ng/mL in unmedicated natural cycles indicates robust ovulation and adequate corpus luteum output, whereas values below 5 to 7 ng/mL suggest deficient luteal function.\n- **Serial Progesterone Profiling:** Because endogenous progesterone is released from the corpus luteum in episodic pulsatile bursts with significant diurnal variation, testing serum levels across three distinct luteal days provides a substantially more accurate clinical picture than a single draw.\n- **Pelvic Ultrasonography:** Transvaginal ultrasound enables clinicians to evaluate follicular growth kinetics, measure mid-cycle endometrial thickness (with an ideal trilaminar stripe of 7 to 12 mm), and assess corpus luteum vascularity using color Doppler imaging.\n- **Endocrine and Metabolic Screening:** Comprehensive laboratory panels measuring serum TSH, free T4, fasting glucose, fasting insulin, serum prolactin, AMH, and mid-follicular FSH and estradiol to uncover systemic causes of ovarian dysfunction.`,
      `## Evidence-Based Medical and Nutritional Interventions\n\nFortunately, luteal phase deficiencies respond exceptionally well to targeted evidence-based clinical and nutritional therapies:\n\n- **Exogenous Progesterone Supplementation:** Administering micronized natural progesterone (vaginal suppositories or oral capsules) starting 2 to 3 days following confirmed ovulation effectively maintains endometrial decidualization and supports blastocyst implantation until the placenta assumes endocrine production.\n- **Follicular Phase Ovulation Induction:** Prescribing oral letrozole or clomiphene citrate during the early follicular phase optimizes follicle recruitment and oocyte maturation, creating a significantly larger and more durable corpus luteum post-ovulation.\n- **hCG Mid-Cycle Trigger Injections:** Administering human chorionic gonadotropin at peak follicle maturity triggers final oocyte meiosis while providing prolonged luteotrophic support to the developing corpus luteum.\n- **Nutritional and Micronutrient Optimization:** Evidence suggests that ensuring optimal intake of vitamin B6 (pyridoxine), vitamin C, zinc, magnesium, and coenzyme Q10 enhances mitochondrial energy production within granulosa cells and supports natural ovarian steroidogenesis.`,
      `## When to Consult a Licensed Reproductive Endocrinologist\n\nYou should arrange a comprehensive clinical consultation with a qualified board-certified OB-GYN or reproductive endocrinologist if:\n\n- Your luteal phase consistently measures 10 days or fewer across three consecutive monitored cycles.\n- You observe chronic pre-menstrual spotting, mid-cycle pain, or cycles that fluctuate unpredictably in length.\n- You have been trying to conceive for 12 months (if under age 35) or 6 months (if age 35 or older) without success.\n- You have a personal medical history of thyroid disorders, PCOS, elevated prolactin, or recurrent early chemical pregnancies.`,
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
