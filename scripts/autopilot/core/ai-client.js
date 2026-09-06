import { CONFIG, getApiKeys } from './config.js';
import { generateWithGemini } from './providers/gemini.js';
import { generateWithGroq } from './providers/groq.js';

/**
 * Delays execution for a specified number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns safe availability status of AI providers without revealing keys.
 */
export function getProviderStatus() {
  const { geminiApiKey, groqApiKey } = getApiKeys();
  return {
    gemini: {
      available: Boolean(geminiApiKey),
      model: CONFIG.models.gemini
    },
    groq: {
      available: Boolean(groqApiKey),
      model: CONFIG.models.groq
    },
    hasAnyProvider: Boolean(geminiApiKey || groqApiKey)
  };
}

/**
 * Unified AI Generation Client with Automatic Retry and Fallback
 *
 * Flow:
 * 1. Gemini (Primary) with up to `maxRetries` for retryable errors.
 * 2. If Gemini fails or lacks API key -> Fallback to Groq.
 * 3. Groq with up to `maxRetries` for retryable errors.
 * 4. If both fail -> Safe non-throwing failure report.
 *
 * @param {object} options - Generation options (prompt, systemPrompt, temperature, maxRetries)
 */
export async function generateText(options = {}) {
  const maxRetries = options.maxRetries !== undefined ? options.maxRetries : CONFIG.retries.maxRetries;
  const baseDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : CONFIG.retries.retryDelayMs;

  const failureLog = [];
  const status = getProviderStatus();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PRIMARY: GOOGLE GEMINI
  // ─────────────────────────────────────────────────────────────────────────────
  if (status.gemini.available) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      const geminiResult = await generateWithGemini(options);
      if (geminiResult.success) {
        return {
          ...geminiResult,
          attempts: attempt + 1,
          fallbackTriggered: false
        };
      }

      failureLog.push({
        provider: 'gemini',
        attempt: attempt + 1,
        error: geminiResult.error,
        isRetryable: geminiResult.isRetryable
      });

      if (!geminiResult.isRetryable) {
        break; // Non-retryable error (e.g. invalid config), proceed directly to fallback
      }
    }
  } else {
    failureLog.push({
      provider: 'gemini',
      skipped: true,
      error: 'GEMINI_API_KEY is not configured.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FALLBACK: GROQ
  // ─────────────────────────────────────────────────────────────────────────────
  if (status.groq.available) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      const groqResult = await generateWithGroq(options);
      if (groqResult.success) {
        return {
          ...groqResult,
          attempts: attempt + 1,
          fallbackTriggered: true,
          primaryFailureReason: failureLog.filter((f) => f.provider === 'gemini').map((f) => f.error).join('; ')
        };
      }

      failureLog.push({
        provider: 'groq',
        attempt: attempt + 1,
        error: groqResult.error,
        isRetryable: groqResult.isRetryable
      });

      if (!groqResult.isRetryable) {
        break;
      }
    }
  } else {
    failureLog.push({
      provider: 'groq',
      skipped: true,
      error: 'GROQ_API_KEY is not configured.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SAFE TERMINATION IF ALL PROVIDERS FAILED
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    success: false,
    error: 'All configured AI providers failed or credentials were unavailable.',
    failureLog,
    status
  };
}
