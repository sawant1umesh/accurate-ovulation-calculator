import { CONFIG } from '../config.js';

/**
 * Google Gemini Primary Provider Client
 * Uses native fetch against the Google Generative Language API.
 */
export async function generateWithGemini(options = {}) {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
  const model = options.model || CONFIG.models.gemini;
  const timeoutMs = options.timeoutMs || CONFIG.retries.timeoutMs;

  if (!apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY environment variable is not set.',
      isRetryable: false,
      provider: 'gemini'
    };
  }

  const prompt = options.prompt || '';
  const systemPrompt = options.systemPrompt || '';
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;

  // Prepare Gemini REST payload (API key passed securely in x-goog-api-key header)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const contents = [];
  if (prompt) {
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });
  }

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: 8192
    }
  };

  if (systemPrompt) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
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
        error: `Gemini API Error (${errorDetails})`,
        status,
        isRetryable,
        provider: 'gemini'
      };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      const blockReason = candidate?.finishReason || 'NO_CONTENT_RETURNED';
      return {
        success: false,
        error: `Gemini returned empty or blocked content (Finish Reason: ${blockReason})`,
        isRetryable: false,
        provider: 'gemini'
      };
    }

    const text = candidate.content.parts.map((p) => p.text || '').join('');
    return {
      success: true,
      text,
      provider: 'gemini',
      model,
      usage: data.usageMetadata || null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      error: isTimeout ? `Gemini request timed out after ${timeoutMs}ms` : `Gemini network error: ${err.message}`,
      isRetryable: true,
      provider: 'gemini'
    };
  }
}
