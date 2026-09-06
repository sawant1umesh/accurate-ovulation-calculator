import { CONFIG } from './config.js';
import { buildCompactInventoryContext } from './gap-analyzer.js';

/**
 * Builds system prompt enforcing medical editorial standards,
 * schema constraints, and human-first tone.
 */
export function buildSystemPrompt() {
  return `You are an expert reproductive health medical science writer and SEO editorial specialist for "${CONFIG.site.name}" (${CONFIG.site.domain}).

EDITORIAL & CLINICAL GUIDELINES:
1. HUMAN-FIRST WRITING:
   - Write clearly, empathetically, and conversationally for individuals and couples tracking fertility, ovulation, and pregnancy.
   - Avoid generic AI fluff, clichés (e.g., "In the vast landscape", "Delve into", "Tapestry", "Crucial journey"), and robotic repetitive sentence structures.
   - Explain biological mechanisms in plain, accessible language with clinical accuracy.

2. MEDICAL ACCURACY & SAFETY:
   - Educational and informational purposes only. Do NOT provide personal clinical diagnoses or prescriptive treatment protocols.
   - Do NOT make unsupported medical claims or guarantee conception timing.
   - Cite established reproductive health authorities only (e.g., ACOG - American College of Obstetricians and Gynecologists, ASRM - American Society for Reproductive Medicine, WHO - World Health Organization, Endocrine Society).
   - NEVER fabricate studies, DOI numbers, author names, or clinical statistics.

3. INTERNAL LINKING:
   - You must ONLY use the provided valid site routes for internal links. Do NOT invent new URLs or link to non-existent blog posts.
   - Format internal links using standard root-relative markdown: [Anchor Text](/route).

4. RICH FORMATTING:
   - Use comparison tables (| Column 1 | Column 2 |) where comparing parameters (e.g. spotting vs flow, tests sensitivity, symptom timelines).
   - Use structured bullet lists and step-by-step numbered processes.
   - Include an in-depth "## Table of Contents" with anchor links.
   - Include an explicit "## Frequently Asked Questions" section.
   - Include a "## Related Articles" section with 4-6 valid internal links.
   - Include a "## Medical References" numbered citation list.
   - Include a "## Medical Disclaimer" blockquote at the very end.

5. OUTPUT FORMAT:
   - You MUST respond with a valid JSON object only (no markdown code fence around the JSON if possible, or standard \`\`\`json format).`;
}

/**
 * Builds user prompt combining topic specifics, compact inventory context,
 * valid routes, and structured JSON requirements.
 */
export function buildUserPrompt(topic, inventory, options = {}) {
  const compactContext = buildCompactInventoryContext(inventory);
  const minWords = options.minWords || CONFIG.content.minWords;
  const targetWords = options.targetWords || CONFIG.content.targetWords;

  // Compile valid link targets
  const validLinkTargets = compactContext.knownRoutes
    .filter((r) => !r.includes('*') && r !== '/404')
    .map((r) => `- \`${r}\``)
    .join('\n');

  const existingTitles = compactContext.publishedCatalog
    .map((a) => `- "${a.title}" (/blog/${a.slug})`)
    .join('\n');

  return `TASK: Write a comprehensive, high-ranking, medically accurate blog article for the topic below.

SELECTED TOPIC:
- Title: "${topic.title}"
- Slug: "${topic.slug}"
- Category: "${topic.category}"
- Target Intent: ${topic.targetIntent}
- Suggested Keywords: ${(topic.keywords || []).join(', ')}

TARGET WORD COUNT:
- Minimum: ${minWords} words
- Target: ${targetWords} words (comprehensive long-form guide)

VALID INTERNAL LINK ROUTES (Use ONLY these exact paths):
${validLinkTargets}

ALREADY PUBLISHED ARTICLES (For "Related Articles" section and cross-references):
${existingTitles}

MANDATORY RESPONSE JSON SCHEMA:
{
  "title": "${topic.title}",
  "slug": "${topic.slug}",
  "description": "Engaging meta description between 140-160 characters with primary keywords",
  "category": "${topic.category}",
  "readTime": "12 min read",
  "author": "${CONFIG.site.author}",
  "faqs": [
    {
      "question": "Clear, search-intent-focused question?",
      "answer": "Concise, medically sound direct answer (2-4 sentences)."
    }
  ],
  "internalLinksUsed": ["/route1", "/route2"],
  "markdownBody": "# ${topic.title}\\n\\n[Full article markdown content with ## Table of Contents, H2 sections, tables, lists, ## Frequently Asked Questions matching frontmatter FAQs, ## Related Articles, ## Medical References, and ## Medical Disclaimer blockquote]"
}

Generate the complete JSON object now. Ensure the markdownBody is exhaustive, deeply detailed, and contains all required sections.`;
}
