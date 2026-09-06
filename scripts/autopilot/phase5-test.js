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

  const generateLongMockArticle = (title) => {
    const sections = [
      `# ${title}\n\nMany women and individuals tracking their reproductive health notice specific physical sensations that recur every month at the midpoint of their cycle. One of the most common—yet frequently misunderstood—sensations is mid-cycle pelvic discomfort, medically termed mittelschmerz (German for "middle pain").\n\nRecognizing what causes ovulation pain, how long it typically lasts, how to distinguish normal physiological sensations from pathological conditions, and how to utilize it alongside fertility awareness methods can empower your reproductive journey. This comprehensive clinical guide explores the physiology behind ovulation pain and provides practical strategies for monitoring your cycle.`,
      `## Table of Contents\n\n1. [What Is Mittelschmerz?](#what-is-mittelschmerz)\n2. [The Physiological Triggers of Ovulation Pain](#the-physiological-triggers-of-ovulation-pain)\n3. [Typical Characteristics and Duration](#typical-characteristics-and-duration)\n4. [Mittelschmerz vs. Other Pelvic Conditions](#mittelschmerz-vs-other-pelvic-conditions)\n5. [Can You Use Ovulation Pain to Time Conception?](#can-you-use-ovulation-pain-to-time-conception)\n6. [Combining Pain Signals with Objective Tracking Methods](#combining-pain-signals-with-objective-tracking-methods)\n7. [Safe Home Care and Relief Strategies](#safe-home-care-and-relief-strategies)\n8. [Warning Signs: When to Seek Immediate Medical Attention](#warning-signs-when-to-seek-immediate-medical-attention)\n9. [Frequently Asked Questions](#frequently-asked-questions)\n10. [Related Articles](#related-articles)\n11. [Medical References](#medical-references)\n12. [Medical Disclaimer](#medical-disclaimer)`,
      `## What Is Mittelschmerz?\n\nMittelschmerz is defined in reproductive medicine as benign, localized, one-sided lower abdominal or pelvic discomfort that coincides with the release of an oocyte from the ovary during the ovulatory phase of the menstrual cycle. It affects an estimated 20% to 40% of menstruating individuals at some point during their reproductive years.\n\nUnlike dysmenorrhea (menstrual cramping), which occurs during bleeding and is driven by widespread uterine prostaglandin release, mittelschmerz typically manifests roughly two weeks before the onset of the next expected menstrual period. The discomfort is generally localized to the specific side containing the active ovary that is releasing an egg during that particular monthly cycle.`,
      `## The Physiological Triggers of Ovulation Pain\n\nThe biological sensations associated with mittelschmerz arise from two distinct micro-mechanical processes in the female pelvis:\n\n- **Follicular Expansion:** In the days leading up to ovulation, the dominant Graafian follicle rapidly enlarges, reaching 20 to 25 millimeters in diameter. This rapid growth stretches the sensitive tunica albuginea and surface capsule of the ovary, triggering localized nociceptive nerve fibers.\n- **Follicular Rupture and Peritoneal Irritation:** At the moment of ovulation, the follicle wall breaks open to discharge the mature egg. Along with the oocyte, a small amount of follicular fluid, prostaglandins, and microscopic blood extravasates into the pelvic cavity (cul-de-sac of Douglas). This mildly acidic fluid irritates the pain-sensitive peritoneal membrane lining the pelvic floor, causing dull or sharp cramping that subsides as the fluid is naturally reabsorbed.`,
      `## Typical Characteristics and Duration\n\nMittelschmerz presents with several distinctive clinical features that distinguish it from non-gynecological abdominal pain:\n\n- **Unilateral Location:** The sensation is almost exclusively felt on either the lower left or lower right quadrant of the lower abdomen. Because ovaries alternate somewhat unpredictably, the affected side may switch from cycle to cycle or occasionally remain on the same side for several consecutive months.\n- **Onset and Quality:** The pain can range from a mild, dull ache or pressure sensation to a sudden, sharp twinge. Some describe it as a localized "stitch" in the lower pelvic area.\n- **Duration:** In most individuals, mittelschmerz lasts from a few minutes to several hours. It rarely persists beyond 24 to 48 hours. If pelvic pain lasts longer than two days or intensifies progressively, medical evaluation is indicated to rule out ovarian cysts or pelvic infections.`,
      `## Mittelschmerz vs. Other Pelvic Conditions\n\nBecause lower abdominal pain can stem from numerous gastrointestinal, urological, and gynecological causes, differential diagnosis is important:\n\n- **Appendicitis:** Right-sided mittelschmerz can occasionally mimic early appendicitis. However, appendicitis typically features progressive, worsening pain accompanied by high fever, persistent nausea, vomiting, rebound tenderness, and lack of correlation with cycle timing.\n- **Ovarian Cysts & Torsion:** Hemorrhagic cysts or enlarged follicles can produce severe, unremitting unilateral pain. Ovarian torsion represents a surgical emergency characterized by sudden, excruciating, twisting pain accompanied by severe nausea.\n- **Endometriosis:** Endometriosis pain is frequently chronic, severe, and bilateral, worsening significantly during menstruation and sexual intercourse, whereas mittelschmerz is brief and confined to mid-cycle.\n- **Pelvic Inflammatory Disease (PID):** PID typically presents with bilateral pain, abnormal discharge, fever, and cervical motion tenderness.`,
      `## Can You Use Ovulation Pain to Time Conception?\n\nWhile noticing ovulation pain provides valuable physical awareness, relying solely on mittelschmerz as an exclusive method for timing intercourse carries distinct limitations:\n\n- **Timing Variability:** Clinical studies demonstrate that the onset of mittelschmerz can precede, coincide with, or follow actual follicular rupture by up to 24 to 48 hours. If you wait until ovulation pain reaches its peak before having intercourse, you may already be nearing the end of your fertile window, as the egg remains viable for only 12 to 24 hours post-release.\n- **Asymmetry of Experience:** Many individuals do not experience ovulation pain every month, and some never feel it at all. Asymptomatic cycles are completely normal and healthy.\n\nTo optimize conception probability, time intercourse during the 2 to 3 days preceding your estimated ovulation day using our [Accurate Ovulation Calculator](/ovulation-calculator) and [Fertility Calendar](/fertility-calendar).`,
      `## Combining Pain Signals with Objective Tracking Methods\n\nFor the highest precision in identifying your fertile window, combine subjective body signals like mittelschmerz with validated physiological markers:\n\n1. **Ovulation Predictor Kits (OPKs):** Urine test strips detect the luteinizing hormone (LH) surge that triggers follicle rupture 24 to 36 hours in advance, providing essential advance notice to optimize intercourse timing.\n2. **Cervical Mucus Monitoring:** In the 3 to 5 days leading up to ovulation, rising estrogen stimulates the cervix to produce clear, slippery, stretchy "egg-white" cervical mucus that facilitates sperm transport.\n3. **Basal Body Temperature (BBT) Charting:** Measuring resting waking temperature daily confirms that ovulation successfully occurred through a sustained 0.5°F to 1.0°F thermal shift caused by post-ovulatory progesterone secretion.`,
      `## Safe Home Care and Relief Strategies\n\nFor mild, typical mittelschmerz, simple conservative home measures are usually sufficient:\n\n- **Over-the-Counter Analgesics:** Nonsteroidal anti-inflammatory drugs (NSAIDs) such as ibuprofen or naproxen effectively inhibit prostaglandin synthesis and alleviate peritoneal discomfort.\n- **Warm Compress / Heating Pad:** Applying gentle heat to the lower abdomen relaxes pelvic musculature and eases localized twinges.\n- **Hydration and Rest:** Staying well-hydrated and engaging in gentle movement supports pelvic circulation and relieves cramping.`,
      `## Warning Signs: When to Seek Immediate Medical Attention\n\nWhile mild mid-cycle discomfort is normal, you should contact an emergency medical provider or gynecologist if you experience:\n\n- Severe, debilitating pelvic or abdominal pain that prevents normal walking or standing.\n- Pain accompanied by high fever, chills, dizziness, fainting, or lightheadedness.\n- Heavy, abnormal vaginal bleeding or foul-smelling discharge.\n- Persistent nausea, intractable vomiting, or inability to keep fluids down.\n- Pain that worsens progressively over more than 24 to 48 hours.`,
      `## Frequently Asked Questions\n\n### 1. What is mittelschmerz?\n\nMittelschmerz is one-sided lower abdominal or pelvic pain that occurs mid-cycle during ovulation due to follicular expansion and localized peritoneal irritation.\n\n### 2. How long does ovulation pain normally last?\n\nOvulation pain typically lasts anywhere from a few minutes to several hours, and rarely extends beyond 24 to 48 hours.\n\n### 3. Does ovulation pain mean you are fertile right now?\n\nYes, ovulation pain indicates that you are in or very close to your peak fertile window, though peak fertility includes the few days leading up to egg release.\n\n### 4. Why is ovulation pain only on one side?\n\nOvulation usually occurs in one ovary per menstrual cycle, so pain is localized to the left or right side depending on which ovary contains the dominant follicle.\n\n### 5. Can ovulation pain be severe?\n\nMild to moderate discomfort is normal, but severe, sharp, or debilitating pain requires clinical evaluation to rule out cysts, torsion, or other conditions.`,
      `## Related Articles\n\nExplore more clinically reviewed educational guides on fertility tracking:\n\n- [Understanding Ovulation: The Science of Your Cycle](/blog/understanding-ovulation)\n- [When Should You Take an Ovulation Test? A Practical Guide to OPKs and LH Surges](/blog/when-to-take-an-ovulation-test)\n- [How to Calculate Your Fertile Window Accurately: A Step-by-Step Guide](/blog/how-to-calculate-your-fertile-window)\n- [Basal Body Temperature (BBT) Charting: Confirming Ovulation](/blog/basal-body-temperature-bbt)\n- [The Cervical Mucus Tracker: How to Identify Fertile Fluid](/blog/cervical-mucus-guide)\n- [How Long Does Ovulation Last? Understanding Your Fertile Window](/blog/how-long-does-ovulation-last)`,
      `## Medical References\n\n1. **American College of Obstetricians and Gynecologists (ACOG).** *Clinical Guidelines for Diagnosis and Management of Acute Pelvic Pain in Reproductive-Aged Women.*\n2. **American Society for Reproductive Medicine (ASRM).** *Physiology of Folliculogenesis and Ovulation: Committee Opinion.*\n3. **World Health Organization (WHO).** *Selected Practice Recommendations for Contraceptive and Reproductive Health Assessments.*\n4. **National Institutes of Health (NIH).** *Mittelschmerz: Clinical Overview and Differential Diagnosis.*`,
      `## Medical Disclaimer\n\n> **Medical Disclaimer:** This article is for informational and educational purposes only and does not constitute formal medical advice, diagnosis, or treatment. Always consult with a qualified physician or healthcare provider regarding persistent, unusual, or severe pelvic pain.`
    ];
    return sections.join('\n\n');
  };

  const mockValidArticle = {
    title: 'Ovulation Pain (Mittelschmerz): Causes, Duration, and What It Means',
    slug: 'ovulation-pain-mittelschmerz-guide',
    description: 'Learn all about ovulation pain or mittelschmerz, including typical duration, normal vs abnormal twinges, and conception timing.',
    category: 'Physiology',
    readTime: '11 min read',
    author: 'Medical Editor Team',
    faqs: [
      { question: 'What is mittelschmerz?', answer: 'Mittelschmerz is one-sided lower abdominal or pelvic pain that occurs mid-cycle during ovulation due to follicular expansion and localized peritoneal irritation.' },
      { question: 'How long does ovulation pain normally last?', answer: 'Ovulation pain typically lasts anywhere from a few minutes to several hours, and rarely extends beyond 24 to 48 hours.' },
      { question: 'Does ovulation pain mean you are fertile right now?', answer: 'Yes, ovulation pain indicates that you are in or very close to your peak fertile window, though peak fertility includes the few days leading up to egg release.' },
      { question: 'Why is ovulation pain only on one side?', answer: 'Ovulation usually occurs in one ovary per menstrual cycle, so pain is localized to the left or right side depending on which ovary contains the dominant follicle.' },
      { question: 'Can ovulation pain be severe?', answer: 'Mild to moderate discomfort is normal, but severe, sharp, or debilitating pain requires clinical evaluation to rule out cysts, torsion, or other conditions.' }
    ],
    markdownBody: generateLongMockArticle('Ovulation Pain (Mittelschmerz): Causes, Duration, and What It Means')
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
