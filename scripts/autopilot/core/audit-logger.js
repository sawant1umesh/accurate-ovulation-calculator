import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';

const MAX_LOG_ENTRIES = 50;

/**
 * Appends a structured run entry to data/autopilot-log.json.
 * Sanitizes all metadata to prevent secret leakage and bounds history to MAX_LOG_ENTRIES.
 */
export function appendAuditLog(entry, options = {}) {
  const logFilePath = options.auditLogFile || CONFIG.auditLogFile;
  const logDir = path.dirname(logFilePath);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  let history = [];
  if (fs.existsSync(logFilePath)) {
    try {
      const rawContent = fs.readFileSync(logFilePath, 'utf-8');
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        history = parsed;
      }
    } catch {
      // If log is corrupted, start fresh array
      history = [];
    }
  }

  // Sanitize entry (ensure no secret keys or bearer tokens)
  const sanitizedEntry = {
    runId: entry.runId || `run_${Date.now()}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    mode: entry.mode || 'DRY_RUN',
    isDryRun: entry.isDryRun ?? true,
    topic: entry.topic ? {
      id: entry.topic.id || null,
      title: entry.topic.title || null,
      slug: entry.topic.slug || null,
      category: entry.topic.category || null
    } : null,
    topicEvaluation: entry.topicEvaluation ? {
      status: entry.topicEvaluation.status,
      maxSimilarity: entry.topicEvaluation.maxSimilarity !== undefined ? parseFloat(entry.topicEvaluation.maxSimilarity.toFixed(3)) : null,
      reason: entry.topicEvaluation.reason
    } : null,
    provider: entry.provider ? {
      name: entry.provider.name || null,
      model: entry.provider.model || null,
      fallbackTriggered: entry.provider.fallbackTriggered ?? false,
      attempts: entry.provider.attempts || 1
    } : null,
    generationResult: entry.generationResult ? {
      success: entry.generationResult.success,
      error: entry.generationResult.error ? entry.generationResult.error.replace(/key=[^&\s]+/gi, 'key=REDACTED') : null
    } : null,
    validationResult: entry.validationResult ? {
      passed: entry.validationResult.passed,
      hasCritical: entry.validationResult.hasCritical,
      hasWarnings: entry.validationResult.hasWarnings,
      wordCount: entry.validationResult.stats?.wordCount || null,
      internalLinksCount: entry.validationResult.stats?.internalLinksCount || null,
      criticalErrorsCount: entry.validationResult.results?.critical?.length || 0,
      warningsCount: entry.validationResult.results?.warnings?.length || 0
    } : null,
    draftPath: entry.draftPath || null,
    status: entry.status || 'UNKNOWN'
  };

  // Prepend latest entry
  history.unshift(sanitizedEntry);

  // Bound history to MAX_LOG_ENTRIES (log rotation)
  if (history.length > MAX_LOG_ENTRIES) {
    history = history.slice(0, MAX_LOG_ENTRIES);
  }

  fs.writeFileSync(logFilePath, JSON.stringify(history, null, 2), 'utf-8');

  return sanitizedEntry;
}

/**
 * Reads recent audit history.
 */
export function getAuditHistory(limit = 10, options = {}) {
  const logFilePath = options.auditLogFile || CONFIG.auditLogFile;
  if (!fs.existsSync(logFilePath)) return [];
  try {
    const raw = fs.readFileSync(logFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}
