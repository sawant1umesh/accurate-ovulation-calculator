import { CONFIG } from './core/config.js';
import { buildContentInventory } from './core/inventory.js';
import { loadTopicSeeds, evaluateCandidateTopic, selectBestTopicGap } from './core/gap-analyzer.js';
import { buildSystemPrompt, buildUserPrompt } from './core/prompt-builder.js';
import { getProviderStatus, generateText } from './core/ai-client.js';
import { extractJsonFromResponse, formatArticleToMarkdown, saveDraftLocally } from './core/draft-generator.js';
import { validateArticle } from './core/validator.js';
import { appendAuditLog } from './core/audit-logger.js';

/**
 * Parses command-line arguments into structured options.
 */
export function parseCliArgs(args = process.argv.slice(2)) {
  const options = {
    isDryRun: true, // Default to safe dry-run mode
    isGenerate: false,
    forcedTopic: null,
    showHelp: false
  };

  for (const arg of args) {
    if (arg === '--generate') {
      options.isGenerate = true;
      options.isDryRun = false;
    } else if (arg === '--dry-run') {
      options.isDryRun = true;
      options.isGenerate = false;
    } else if (arg.startsWith('--force-topic=')) {
      options.forcedTopic = arg.slice('--force-topic='.length).replace(/^["']|["']$/g, '').trim();
    } else if (arg === '--help' || arg === '-h') {
      options.showHelp = true;
    }
  }

  return options;
}

/**
 * Prints concise CLI help guide.
 */
function printHelp() {
  console.log(`
SEO Autopilot Orchestrator (Accurate Ovulation Calculator)

Usage:
  node scripts/autopilot/index.js [options]

Options:
  --dry-run             Run in safe planning mode (default). Builds inventory, evaluates
                        topic candidates, checks cannibalization, and previews prompts.
                        No AI calls, zero file writes.
  --generate            Execute live AI generation, validate article output, and save
                        local draft to scripts/autopilot/drafts/. Never writes to production.
  --force-topic="Title" Manually specify topic to evaluate. Must pass safety checks.
  --help, -h            Show this help guide.
`);
}

/**
 * Main SEO Autopilot Orchestrator Pipeline
 */
export async function runAutopilotPipeline(cliOptions = {}) {
  const options = {
    isDryRun: cliOptions.isDryRun ?? true,
    isGenerate: cliOptions.isGenerate ?? false,
    forcedTopic: cliOptions.forcedTopic || null,
    mockProviderResult: cliOptions.mockProviderResult || null // For testing
  };

  const runId = `run_${Date.now()}`;
  const mode = options.isGenerate ? 'GENERATE' : 'DRY_RUN';

  console.log(`\n======================================================================`);
  console.log(` SEO AUTOPILOT ORCHESTRATOR`);
  console.log(` Mode: ${mode} | Run ID: ${runId}`);
  console.log(`======================================================================`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 & 2: Content Inventory
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[1/6] Scanning Content Inventory...`);
  const inventory = buildContentInventory();
  console.log(`  ✓ Discovered ${inventory.totalArticles} published articles`);
  console.log(`  ✓ Verified ${inventory.knownRoutes.length} valid internal site routes`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Load Topic Seed Catalog
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[2/6] Loading Topic Seed Catalog...`);
  const seedResult = loadTopicSeeds();
  if (!seedResult.success || seedResult.topics.length === 0) {
    console.log(`  ❌ CONFIG ERROR: ${seedResult.error}`);
    appendAuditLog({
      runId,
      mode,
      isDryRun: options.isDryRun,
      status: 'CONFIG_ERROR',
      generationResult: { success: false, error: seedResult.error }
    });
    return { status: 'CONFIG_ERROR', error: seedResult.error };
  }
  console.log(`  ✓ Loaded ${seedResult.totalLoaded} topic candidates from data/topic-seeds.json`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4 & 5: Cannibalization Check & Topic Selection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[3/6] Running Duplicate & Cannibalization Shield...`);
  let selectedTopic = null;
  let topicEvaluation = null;

  if (options.forcedTopic) {
    console.log(`  ℹ️  Evaluating forced topic: "${options.forcedTopic}"`);
    // Find in seeds or create candidate object
    const matchedSeed = seedResult.topics.find(
      (t) => t.title.toLowerCase() === options.forcedTopic.toLowerCase() ||
             t.id.toLowerCase() === options.forcedTopic.toLowerCase()
    );

    const candidate = matchedSeed || {
      id: options.forcedTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: options.forcedTopic,
      slug: options.forcedTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: 'Fertility & Ovulation',
      targetIntent: 'User-specified forced topic',
      keywords: []
    };

    topicEvaluation = evaluateCandidateTopic(candidate, inventory);

    if (topicEvaluation.status === 'REJECT') {
      console.log(`  ❌ FORCED TOPIC REJECTED: ${topicEvaluation.reason}`);
      appendAuditLog({
        runId,
        mode,
        isDryRun: options.isDryRun,
        topic: candidate,
        topicEvaluation,
        status: 'FORCED_TOPIC_REJECTED'
      });
      return { status: 'FORCED_TOPIC_REJECTED', evaluation: topicEvaluation };
    }

    selectedTopic = candidate;
    console.log(`  ✓ Forced topic accepted (${topicEvaluation.status}): "${selectedTopic.title}"`);
  } else {
    const gapAnalysis = selectBestTopicGap(inventory, seedResult.topics);

    console.log(`  ✓ Candidate Evaluation: ${gapAnalysis.stats.safe} SAFE | ${gapAnalysis.stats.caution} CAUTION | ${gapAnalysis.stats.rejected} REJECTED`);

    if (gapAnalysis.status === 'NO_STRONG_TOPIC_FOUND' || !gapAnalysis.selectedTopic) {
      console.log(`  ⚠️  NO STRONG TOPIC FOUND. Halting run safely to avoid cannibalization.`);
      appendAuditLog({
        runId,
        mode,
        isDryRun: options.isDryRun,
        status: 'NO_STRONG_TOPIC_FOUND'
      });
      return { status: 'NO_STRONG_TOPIC_FOUND' };
    }

    selectedTopic = gapAnalysis.selectedTopic;
    topicEvaluation = gapAnalysis.evaluation;
    console.log(`  ✓ Selected Topic: "${selectedTopic.title}" (Category: ${selectedTopic.category})`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Build Prompt
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[4/6] Constructing Structured Editorial Prompt...`);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(selectedTopic, inventory);
  console.log(`  ✓ Injected ${inventory.knownRoutes.length} whitelisted internal routes`);
  console.log(`  ✓ Enforced ACOG/ASRM medical citation standards & disclaimer constraints`);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Check Execution Mode (Dry Run vs Generate)
  // ─────────────────────────────────────────────────────────────────────────────
  if (options.isDryRun) {
    console.log(`\n[5/6] Dry-Run Mode Active (Skipping AI Generation)...`);
    console.log(`  ✓ Zero API calls made`);
  }

  const providerStatus = getProviderStatus();
  console.log(`\n[6/6] AI Provider Status:`);
  console.log(`  - Gemini (Primary): ${providerStatus.gemini.available ? 'Configured' : 'Missing Key'} (${providerStatus.gemini.model})`);
  console.log(`  - Groq (Fallback):  ${providerStatus.groq.available ? 'Configured' : 'Missing Key'} (${providerStatus.groq.model})`);

  if (options.isDryRun) {
    appendAuditLog({
      runId,
      mode: 'DRY_RUN',
      isDryRun: true,
      topic: selectedTopic,
      topicEvaluation,
      status: 'DRY_RUN'
    });

    console.log(`\n======================================================================`);
    console.log(` DRY-RUN COMPLETED SUCCESSFULLY`);
    console.log(` Planning verified. Use --generate for live draft generation.`);
    console.log(`======================================================================\n`);

    return {
      status: 'DRY_RUN',
      selectedTopic,
      topicEvaluation
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8: AI Generation (Live Generate Mode)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Live Generation] Calling AI Provider Pipeline...`);

  let aiResponse = options.mockProviderResult || null;
  if (!aiResponse) {
    aiResponse = await generateText({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.7
    });
  }

  if (!aiResponse || !aiResponse.success) {
    const errorMsg = aiResponse?.error || 'AI generation failed across all providers.';
    console.log(`  ❌ GENERATION FAILED: ${errorMsg}`);
    appendAuditLog({
      runId,
      mode: 'GENERATE',
      isDryRun: false,
      topic: selectedTopic,
      topicEvaluation,
      generationResult: { success: false, error: errorMsg },
      status: 'GENERATION_FAILED'
    });
    return { status: 'GENERATION_FAILED', error: errorMsg };
  }

  console.log(`  ✓ Generation Succeeded via ${aiResponse.provider.toUpperCase()} (${aiResponse.model})`);

  // Parse structured article JSON
  let articleData;
  try {
    articleData = extractJsonFromResponse(aiResponse.text);
  } catch (err) {
    console.log(`  ❌ PARSING FAILED: ${err.message}`);
    appendAuditLog({
      runId,
      mode: 'GENERATE',
      isDryRun: false,
      topic: selectedTopic,
      topicEvaluation,
      provider: { name: aiResponse.provider, model: aiResponse.model },
      generationResult: { success: false, error: err.message },
      status: 'GENERATION_FAILED'
    });
    return { status: 'GENERATION_FAILED', error: err.message };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 9: Draft Formatting & Validation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[Validation] Validating Generated Draft...`);
  const markdownFormatted = formatArticleToMarkdown(articleData);
  const validationResult = validateArticle(markdownFormatted, {
    inventory,
    isNewArticle: true
  });

  console.log(`  - Word Count:     ${validationResult.stats.wordCount} words`);
  console.log(`  - Internal Links: ${validationResult.stats.internalLinksCount} links`);
  console.log(`  - FAQs:           ${validationResult.stats.faqCount} items`);
  console.log(`  - Validation:     ${validationResult.passed ? 'PASSED' : 'FAILED'}`);

  // Save draft locally (scripts/autopilot/drafts/)
  const savedDraft = saveDraftLocally(articleData, validationResult, {
    providerInfo: { provider: aiResponse.provider, model: aiResponse.model }
  });
  console.log(`  ✓ Draft Saved: ${savedDraft.markdownPath}`);

  const finalStatus = validationResult.passed ? 'SUCCESS' : 'VALIDATION_FAILED';

  appendAuditLog({
    runId,
    mode: 'GENERATE',
    isDryRun: false,
    topic: selectedTopic,
    topicEvaluation,
    provider: {
      name: aiResponse.provider,
      model: aiResponse.model,
      fallbackTriggered: aiResponse.fallbackTriggered ?? false,
      attempts: aiResponse.attempts || 1
    },
    generationResult: { success: true },
    validationResult,
    draftPath: savedDraft.markdownPath,
    status: finalStatus
  });

  console.log(`\n======================================================================`);
  console.log(` RUN RESULT: ${finalStatus}`);
  console.log(` Draft Location: ${savedDraft.markdownPath}`);
  console.log(` Production Content Untouched: 100% Isolated`);
  console.log(`======================================================================\n`);

  return {
    status: finalStatus,
    selectedTopic,
    validationResult,
    draftPath: savedDraft.markdownPath
  };
}

// CLI Execution Entry Point
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const cliOptions = parseCliArgs();
  if (cliOptions.showHelp) {
    printHelp();
    process.exit(0);
  }
  runAutopilotPipeline(cliOptions).catch((err) => {
    console.error('Fatal Pipeline Exception:', err.message);
    process.exit(1);
  });
}
