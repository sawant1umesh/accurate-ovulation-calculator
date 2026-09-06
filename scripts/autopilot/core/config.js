import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

/**
 * Autopilot Configuration
 * Reads secrets strictly from process.env without printing or storing keys.
 */
export const CONFIG = {
  // Directories
  rootDir: ROOT_DIR,
  blogDir: path.join(ROOT_DIR, 'src', 'content', 'blog'),
  pagesDir: path.join(ROOT_DIR, 'src', 'pages'),
  draftsDir: path.join(ROOT_DIR, 'scripts', 'autopilot', 'drafts'),
  dataDir: path.join(ROOT_DIR, 'data'),
  topicSeedsFile: path.join(ROOT_DIR, 'data', 'topic-seeds.json'),
  auditLogFile: path.join(ROOT_DIR, 'data', 'autopilot-log.json'),

  // Site Profile
  site: {
    name: 'Accurate Ovulation Calculator',
    domain: 'https://accurateovulationcalculator.com',
    niche: "Evidence-based fertility tracking, ovulation calculation, fertile window prediction, cycle health, and pregnancy timing",
    author: 'Medical Editor Team',
    standardCategories: [
      'Fertility & Ovulation',
      'Cycle Tracking',
      'Conception',
      'Pregnancy',
      'Physiology'
    ]
  },

  // AI Models
  models: {
    gemini: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  },

  // Retries & Timing
  retries: {
    maxRetries: parseInt(process.env.AUTOPILOT_MAX_RETRIES || '2', 10),
    retryDelayMs: parseInt(process.env.AUTOPILOT_RETRY_DELAY_MS || '1500', 10),
    timeoutMs: parseInt(process.env.AUTOPILOT_TIMEOUT_MS || '60000', 10)
  },

  // Article Quality Targets
  content: {
    minWords: 1800,
    targetWords: 2500,
    maxWords: 3500,
    minInternalLinks: 4,
    maxInternalLinks: 10,
    minFaqs: 5,
    maxFaqs: 8
  },

  // Candidate Classification Thresholds
  similarityThresholds: {
    rejectTitleSimilarity: 0.70, // >= 70% title similarity is REJECT
    cautionTitleSimilarity: 0.45 // >= 45% title similarity is CAUTION
  }
};

/**
 * Returns API keys from environment without printing them.
 */
export function getApiKeys() {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null,
    groqApiKey: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : null
  };
}
