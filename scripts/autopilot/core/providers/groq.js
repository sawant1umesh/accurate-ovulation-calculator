import { CONFIG } from '../config.js';

/**
 * Groq Fallback Provider Client
 * Uses native fetch against the Groq OpenAI-compatible Chat Completions API.
 */
export async function generateWithGroq(options = {}) {
  const apiKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : null;
  const model = options.model || CONFIG.models.groq;
  const timeoutMs = options.timeoutMs || CONFIG.retries.timeoutMs;

  if (!apiKey) {
    return {
      success: false,
      error: 'GROQ_API_KEY environment variable is not set.',
      isRetryable: false,
      provider: 'groq'
    };
  }

  const prompt = options.prompt || '';
  const systemPrompt = options.systemPrompt || '';
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (prompt) {
    messages.push({ role: 'user', content: prompt });
  }

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: 8192
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      let errorDetails = `HTTP ${status}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorDetails += `: ${errorJson.error.message}`;
        }
      } catch {
        // Non-JSON response
      }

      const isRetryable = status === 429 || status === 500 || status === 503 || status === 504;
      return {
        success: false,
        error: `Groq API Error (${errorDetails})`,
        status,
        isRetryable,
        provider: 'groq'
      };
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return {
        success: false,
        error: 'Groq returned empty response content.',
        isRetryable: false,
        provider: 'groq'
      };
    }

    return {
      success: true,
      text: messageContent,
      provider: 'groq',
      model,
      usage: data.usage || null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      error: isTimeout ? `Groq request timed out after ${timeoutMs}ms` : `Groq network error: ${err.message}`,
      isRetryable: true,
      provider: 'groq'
    };
  }
}
