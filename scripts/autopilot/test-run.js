import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContentInventory } from './core/inventory.js';
import { validateAllArticles } from './core/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runAutopilotTests(options = {}) {
  console.log(`\n======================================================================`);
  console.log(` SEO AUTOPILOT: PHASE 2 TEST RUNNER (DETERMINISTIC VALIDATION)`);
  console.log(`======================================================================`);

  // Step 1: Content Inventory
  console.log(`\n[1/2] Building Content Inventory...`);
  const inventory = buildContentInventory(options);
  console.log(`✓ Scanned ${inventory.totalArticles} blog articles in src/content/blog/`);
  console.log(`✓ Discovered ${inventory.knownRoutes.length} site routes across Astro pages & collections`);
  console.log(`✓ Active Categories: ${inventory.categories.join(' | ')}`);

  // Step 2: Deterministic Blog Validation
  console.log(`\n[2/2] Running Validation Engine on All Articles...`);
  const validationSummary = validateAllArticles(inventory, options);

  console.log(`\n----------------------------------------------------------------------`);
  console.log(` ARTICLE VALIDATION BREAKDOWN`);
  console.log(`----------------------------------------------------------------------`);

  for (const res of validationSummary.results) {
    const statusIcon = res.passed ? (res.hasWarnings ? '🟡' : '✅') : '❌';
    const statusLabel = res.passed ? (res.hasWarnings ? 'PASSED WITH WARNINGS' : 'PASSED (CLEAN)') : 'FAILED (CRITICAL)';

    console.log(`\n${statusIcon} [${statusLabel}] ${res.title || res.slug}`);
    console.log(`   File: ${res.filePath} | Words: ${res.stats.wordCount} | Internal Links: ${res.stats.internalLinksCount} | FAQs: ${res.stats.faqCount}`);

    if (res.results.critical.length > 0) {
      console.log(`   🚨 CRITICAL ISSUES:`);
      for (const err of res.results.critical) {
        console.log(`      - [${err.rule}] ${err.message}`);
      }
    }

    if (res.results.warnings.length > 0) {
      console.log(`   ⚠️  WARNINGS:`);
      for (const warn of res.results.warnings) {
        console.log(`      - [${warn.rule}] ${warn.message}`);
      }
    }

    if (res.results.info.length > 0) {
      console.log(`   ℹ️  INFO:`);
      for (const inf of res.results.info) {
        console.log(`      - [${inf.rule}] ${inf.message}`);
      }
    }
  }

  console.log(`\n======================================================================`);
  console.log(` TEST RUNNER SUMMARY`);
  console.log(`======================================================================`);
  console.log(` Total Articles Scanned:  ${validationSummary.totalScanned}`);
  console.log(` Articles Passing:        ${validationSummary.totalPassed} / ${validationSummary.totalScanned}`);
  console.log(` Articles with Critical:  ${validationSummary.totalCritical}`);
  console.log(` Articles with Warnings:  ${validationSummary.totalWarnings}`);
  console.log(` System Status:           ${validationSummary.totalCritical === 0 ? '✓ ALL PASS (ZERO CRITICAL DEFECTS)' : '❌ VALIDATION FAILURES DETECTED'}`);
  console.log(`======================================================================\n`);

  return {
    inventory,
    validationSummary
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAutopilotTests();
}
