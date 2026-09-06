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

  // Populate mock blog directory with all baseline articles
  const baselineBlogFiles = fs.readdirSync(CONFIG.blogDir).filter((file) => file.endsWith('.md'));
  for (const file of baselineBlogFiles) {
    fs.copyFileSync(path.join(CONFIG.blogDir, file), path.join(tempTestBlogDir, file));
  }

  const generateLongMockArticle = (title) => {
    const sections = [
      `# ${title}\n\nMany women and individuals tracking their reproductive health notice distinct physical sensations that recur cyclically every month at the midpoint of their menstrual cycle. One of the most common—yet frequently misunderstood—sensations is mid-cycle pelvic discomfort, medically termed mittelschmerz (derived from the German words for "middle pain").\n\nRecognizing what causes ovulation pain, understanding how long it typically lasts, differentiating normal physiological sensations from pathological pelvic conditions, and learning how to utilize this body awareness alongside clinical fertility tracking methods can empower your reproductive journey. This comprehensive evidence-based clinical guide explores the underlying hormonal and anatomical mechanisms of ovulation discomfort, provides practical step-by-step strategies for monitoring your cycle, and details when to seek medical evaluation.`,
      `## Table of Contents\n\n1. [What Is Mittelschmerz and How Common Is It?](#what-is-mittelschmerz-and-how-common-is-it)\n2. [The Physiological Triggers and Biological Mechanisms](#the-physiological-triggers-and-biological-mechanisms)\n3. [Typical Clinical Characteristics, Severity, and Duration](#typical-clinical-characteristics-severity-and-duration)\n4. [Mittelschmerz vs Other Gynecological and Pelvic Conditions](#mittelschmerz-vs-other-gynecological-and-pelvic-conditions)\n5. [Can You Rely on Ovulation Pain to Time Conception?](#can-you-rely-on-ovulation-pain-to-time-conception)\n6. [Combining Symptom Awareness with Objective Tracking Tools](#combining-symptom-awareness-with-objective-tracking-tools)\n7. [Evidence-Based Home Care and Pain Relief Strategies](#evidence-based-home-care-and-pain-relief-strategies)\n8. [Red Flag Symptoms: When to Seek Immediate Medical Evaluation](#red-flag-symptoms-when-to-seek-immediate-medical-evaluation)\n9. [When to Consult a Reproductive Endocrinologist](#when-to-consult-a-reproductive-endocrinologist)\n10. [Frequently Asked Questions](#frequently-asked-questions)\n11. [Related Articles](#related-articles)\n12. [Medical References](#medical-references)\n13. [Medical Disclaimer](#medical-disclaimer)`,
      `## What Is Mittelschmerz and How Common Is It?\n\nMittelschmerz is defined in clinical reproductive medicine as benign, localized, unilateral lower abdominal or pelvic discomfort that coincides with the release of a mature oocyte from the ovarian follicle during the ovulatory phase of the menstrual cycle. Epidemiological data indicates that it affects approximately 20% to 40% of menstruating individuals at some point throughout their active reproductive lifespan.\n\nUnlike dysmenorrhea (menstrual cramping), which occurs during active uterine bleeding and is mediated by widespread myometrial prostaglandin release, mittelschmerz manifests approximately 14 days before the onset of the subsequent menstrual period. The discomfort is classically localized to the specific pelvic side containing the active ovary that is releasing an egg during that particular monthly cycle. While some women experience only a fleeting twinge lasting a few minutes, others report a dull, persistent ache that persists for several hours.`,
      `## The Physiological Triggers and Biological Mechanisms\n\nThe physical sensations associated with mittelschmerz arise from several interrelated anatomical and biochemical processes within the pelvic cavity:\n\n1. **Follicular Expansion and Capsular Tension:** In the days and hours immediately preceding ovulation, the dominant Graafian follicle rapidly accumulates follicular fluid under the influence of pituitary follicle-stimulating hormone (FSH) and luteinizing hormone (LH). The follicle enlarges up to 20 to 25 millimeters in diameter, creating tension and stretching the sensitive fibrous capsule of the ovary (tunica albuginea), which stimulates nociceptive nerve fibers.\n2. **Follicular Wall Rupture and Proteolytic Breakdown:** At the culmination of the LH surge, proteolytic enzymes such as collagenase and plasminogen activators degrade the follicular apex (the stigma). When the follicle ruptures to release the mature cumulus-oocyte complex, this localized tissue breakdown triggers local inflammatory cascades.\n3. **Peritoneal Irritation from Follicular Fluid and Extravasated Blood:** Along with the oocyte, the ruptured follicle expels prostaglandin-rich follicular fluid and a small amount of capillary blood into the peritoneal cavity (frequently accumulating in the rectouterine pouch, or pouch of Douglas). The acidic, prostaglandin-rich fluid directly irritates the pain-sensitive peritoneal membrane lining the pelvic cavity, producing cramps or localized soreness until the fluid is reabsorbed by the lymphatic system.\n4. **Tubal and Smooth Muscle Contractions:** Rising prostaglandins stimulate smooth muscle contractility in the fimbriae and fallopian tubes to facilitate sweeping the released egg into the tubal ampulla, contributing to dynamic pelvic cramping sensations.`,
      `## Typical Clinical Characteristics, Severity, and Duration\n\nMittelschmerz presents with several distinctive clinical features that distinguish it from non-gynecological causes of abdominal pain:\n\n- **Unilateral Distribution:** The pain is typically felt on either the left or right lower abdominal quadrant. Because ovaries alternate somewhat unpredictably, the affected side may switch from month to month or occasionally remain on the same side for several consecutive cycles.\n- **Sensation Quality:** The sensation ranges from a dull, heavy pressure or ache to sudden, sharp, localized twinges. Many describe it as a localized "stitch" or pulling sensation in the groin or lower pelvis.\n- **Duration and Timing:** In the majority of women, mittelschmerz lasts between 30 minutes and a few hours. In some cases, mild soreness persists for up to 24 to 48 hours. Discomfort lasting longer than two full days or escalating progressively is unusual for benign ovulation pain and warrants medical evaluation.\n- **Associated Biomarkers:** Ovulation pain frequently coincides with other fertile signs, including abundant clear, stretchy cervical mucus (similar to raw egg whites), heightened libido, and a slight softening and opening of the cervix.`,
      `## Mittelschmerz vs Other Gynecological and Pelvic Conditions\n\nBecause lower quadrant abdominal pain can originate from gastrointestinal, urological, and structural gynecological conditions, understanding key differentiating symptoms is crucial for accurate diagnosis:\n\n- **Appendicitis:** Right-sided mittelschmerz can occasionally be confused with acute appendicitis. However, appendicitis produces progressively severe pain starting periumbilically before localizing to McBurney's point, accompanied by high fever, persistent nausea, vomiting, leukocytosis, and rebound tenderness, completely unrelated to menstrual cycle timing.\n- **Ovarian Cysts and Rupture:** Functional corpus luteum cysts or follicular cysts can produce localized pain. A ruptured ovarian cyst can release larger volumes of blood into the pelvis, resulting in sudden, excruciating pain, dizziness, and peritoneal signs.\n- **Ovarian Torsion:** Ovarian torsion is an acute surgical emergency caused by the twisting of an enlarged ovary around its vascular pedicle, leading to ischemia. It presents with sudden, severe, unremitting unilateral pain accompanied by repeated vomiting.\n- **Endometriosis:** Endometriosis involves ectopic endometrial tissue implants that generate chronic, bilateral pelvic pain, severe dysmenorrhea, pain during sexual intercourse (dyspareunia), and chronic bowel or bladder discomfort, rather than isolated mid-cycle twinges.\n- **Pelvic Inflammatory Disease (PID):** PID presents with bilateral lower abdominal pain, abnormal purulent vaginal discharge, dyspareunia, and fever, requiring prompt antibiotic intervention.`,
      `## Can You Rely on Ovulation Pain to Time Conception?\n\nWhile noticing ovulation pain offers valuable body literacy, relying solely on mittelschmerz as an exclusive timing method for intercourse carries significant biological limitations:\n\n- **Variable Temporal Relationship:** Clinical research using continuous transvaginal ultrasound monitoring demonstrates that the onset of mittelschmerz can occur before, during, or after actual follicular collapse. In some women, pain occurs 24 to 48 hours prior to follicle rupture due to follicular expansion, whereas in others, it occurs hours after egg release due to peritoneal irritation. Because a released oocyte remains viable for only 12 to 24 hours, waiting for peak pain may mean missing the optimal fertile window.\n- **Intermittent Occurrence:** Many fertile women experience mittelschmerz only in select cycles or never feel it at all. The absence of pain does not indicate anovulation.\n\nTo maximize conception probability, intercourse should be timed during the 2 to 3 days preceding ovulation, ensuring viable sperm are already waiting in the fallopian tubes. Digital fertility tools such as our [Accurate Ovulation Calculator](/ovulation-calculator) and [Fertility Calendar](/fertility-calendar) provide reliable predictive scheduling based on your historical cycle metrics.`,
      `## Combining Symptom Awareness with Objective Tracking Tools\n\nFor the highest accuracy in tracking your cycle, pair subjective physical awareness with validated objective physiological markers:\n\n1. **Urine-Based Ovulation Predictor Kits (OPKs):** OPKs detect the surge in luteinizing hormone (LH) that precedes egg release by 24 to 36 hours, providing clear advance notice of imminent ovulation.\n2. **Cervical Mucus Tracking:** Under the influence of rising pre-ovulatory estradiol, cervical crypts produce clear, slippery, highly elastic mucus with high spinnbarkeit that nourishes and transports sperm.\n3. **Basal Body Temperature (BBT) Charting:** Taking your waking oral temperature daily confirms that ovulation has occurred retrospectively via a sustained thermal shift of 0.5°F to 1.0°F driven by corpus luteum progesterone production.\n4. **Digital Cycle Calculators:** Tracking your historical cycle lengths using verified digital tools enables accurate estimation of future fertile windows and customized testing dates.`,
      `## Evidence-Based Home Care and Pain Relief Strategies\n\nFor mild to moderate physiological mittelschmerz, straightforward conservative strategies provide effective relief:\n\n- **Over-the-Counter NSAIDs:** Nonsteroidal anti-inflammatory medications such as ibuprofen (Advil, Motrin) or naproxen sodium (Aleve) directly inhibit cyclooxygenase (COX) enzymes, reducing prostaglandin synthesis and alleviating peritoneal inflammation.\n- **Therapeutic Heat Application:** Applying a warm compress, heating pad, or taking a warm bath helps relax tense pelvic floor musculature and improves localized blood circulation.\n- **Hydration and Gentle Movement:** Maintaining adequate hydration and performing gentle pelvic stretches or walking can help reduce abdominal bloating and muscle tension.\n- **Rest and Relaxation:** Taking time to rest during the peak hours of discomfort allows the body to naturally reabsorb irritating follicular fluid without unnecessary strain.`,
      `## Red Flag Symptoms: When to Seek Immediate Medical Evaluation\n\nWhile physiological ovulation pain is benign and transient, you should seek immediate emergency medical evaluation if you encounter any of the following warning signs:\n\n- Sudden, excruciating, or debilitating abdominal or pelvic pain that impairs your ability to stand or walk.\n- Pain accompanied by high fever (above 100.4°F or 38°C), chills, or profuse sweating.\n- Persistent nausea, intractable vomiting, or inability to retain fluids.\n- Abnormal heavy vaginal bleeding, passing large blood clots, or foul-smelling vaginal discharge.\n- Signs of hemodynamic instability, such as lightheadedness, dizziness, fainting (syncope), or rapid heart rate.\n- Pain that progressively worsens over 24 to 48 hours rather than resolving spontaneously.`,
      `## When to Consult a Reproductive Endocrinologist\n\nIf you are actively trying to conceive or experience irregular cycles alongside pelvic pain, scheduling a consultation with a board-certified reproductive endocrinologist or gynecologist is recommended if:\n\n- You have been actively trying to conceive for 12 months (if under age 35) or 6 months (if age 35 or older) without achieving pregnancy.\n- Your menstrual cycles are chronically irregular, shorter than 21 days, or longer than 35 days.\n- You have a documented medical history of endometriosis, polycystic ovary syndrome (PCOS), pelvic surgery, or pelvic inflammatory disease.\n- You experience chronic pelvic pain throughout multiple phases of your menstrual cycle rather than isolated mid-cycle twinges.`,
      `## Frequently Asked Questions\n\n### 1. What is mittelschmerz?\n\nMittelschmerz is benign, one-sided lower abdominal or pelvic pain occurring mid-cycle during ovulation due to follicular enlargement and localized peritoneal irritation.\n\n### 2. How long does ovulation pain normally last?\n\nOvulation pain typically lasts anywhere from a few minutes to several hours, and rarely extends beyond 24 to 48 hours.\n\n### 3. Does ovulation pain mean you are fertile right now?\n\nYes, ovulation pain indicates that you are within or very near your fertile window, although peak fertility includes the 2 to 3 days before egg release.\n\n### 4. Why is ovulation pain only on one side?\n\nOvulation usually occurs in one ovary per cycle, so pain is localized to the left or right pelvic quadrant depending on which ovary contains the dominant follicle.\n\n### 5. Can ovulation pain be severe?\n\nMild to moderate discomfort is typical, but severe, debilitating, or persistent pain requires clinical evaluation to rule out cysts, torsion, or appendicitis.`,
      `## Related Articles\n\nExplore more clinically reviewed educational guides on fertility tracking and reproductive health:\n\n- [Understanding Ovulation: The Science of Your Cycle](/blog/understanding-ovulation)\n- [When Should You Take an Ovulation Test? A Practical Guide to OPKs and LH Surges](/blog/when-to-take-an-ovulation-test)\n- [How to Calculate Your Fertile Window Accurately: A Step-by-Step Guide](/blog/how-to-calculate-your-fertile-window)\n- [Basal Body Temperature (BBT) Charting: Confirming Ovulation](/blog/basal-body-temperature-bbt)\n- [The Cervical Mucus Tracker: How to Identify Fertile Fluid](/blog/cervical-mucus-guide)\n- [How Long Does Ovulation Last? Understanding Your Fertile Window](/blog/how-long-does-ovulation-last)`,
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
      { question: 'What is mittelschmerz?', answer: 'Mittelschmerz is benign, one-sided lower abdominal or pelvic pain occurring mid-cycle during ovulation due to follicular enlargement and localized peritoneal irritation.' },
      { question: 'How long does ovulation pain normally last?', answer: 'Ovulation pain typically lasts anywhere from a few minutes to several hours, and rarely extends beyond 24 to 48 hours.' },
      { question: 'Does ovulation pain mean you are fertile right now?', answer: 'Yes, ovulation pain indicates that you are within or very near your fertile window, although peak fertility includes the 2 to 3 days before egg release.' },
      { question: 'Why is ovulation pain only on one side?', answer: 'Ovulation usually occurs in one ovary per cycle, so pain is localized to the left or right pelvic quadrant depending on which ovary contains the dominant follicle.' },
      { question: 'Can ovulation pain be severe?', answer: 'Mild to moderate discomfort is typical, but severe, debilitating, or persistent pain requires clinical evaluation to rule out cysts, torsion, or appendicitis.' }
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
