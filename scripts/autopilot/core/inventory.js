import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const BLOG_DIR = path.join(ROOT_DIR, 'src', 'content', 'blog');
const PAGES_DIR = path.join(ROOT_DIR, 'src', 'pages');

/**
 * Parses frontmatter and markdown body from raw file contents.
 * Supports standard YAML delimiters (---).
 */
export function parseMarkdownFile(fileContent) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      rawFrontmatter: '',
      body: fileContent.trim(),
      hasValidFrontmatter: false
    };
  }

  const rawFrontmatter = match[1];
  const body = match[2];

  let frontmatter = {};
  try {
    frontmatter = yaml.load(rawFrontmatter) || {};
  } catch (err) {
    return {
      frontmatter: {},
      rawFrontmatter,
      body,
      hasValidFrontmatter: false,
      yamlError: err.message
    };
  }

  return {
    frontmatter,
    rawFrontmatter,
    body,
    hasValidFrontmatter: true
  };
}

/**
 * Calculates prose word count from markdown body by stripping code blocks,
 * markdown symbols, and whitespace.
 */
export function calculateWordCount(body) {
  if (!body || typeof body !== 'string') return 0;

  // Remove code blocks
  let cleanText = body.replace(/```[\s\S]*?```/g, ' ');
  // Remove HTML comments
  cleanText = cleanText.replace(/<!--[\s\S]*?-->/g, ' ');
  // Remove markdown links but keep text: [text](url) -> text
  cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove markdown headers, bold, italics, quotes
  cleanText = cleanText.replace(/[#*`_~>]/g, ' ');
  // Remove HTML tags
  cleanText = cleanText.replace(/<\/?[^>]+(>|$)/g, ' ');

  // Split on whitespace
  const words = cleanText.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Extracts markdown links, HTML links, and anchor references.
 */
export function extractLinks(body) {
  const internalLinks = [];
  const externalLinks = [];

  if (!body) return { internalLinks, externalLinks };

  // Markdown links: [anchor text](url "optional title")
  const mdLinkRegex = /\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  let match;
  while ((match = mdLinkRegex.exec(body)) !== null) {
    const text = match[1].trim();
    const url = match[2].trim();

    if (url.startsWith('http://') || url.startsWith('https://')) {
      externalLinks.push({ text, url, type: 'markdown' });
    } else if (url.startsWith('/') || url.startsWith('#') || url.startsWith('./') || url.startsWith('../')) {
      internalLinks.push({ text, url, type: 'markdown' });
    }
  }

  // HTML links: <a href="url">text</a>
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  while ((match = htmlLinkRegex.exec(body)) !== null) {
    const url = match[1].trim();
    const text = match[2].replace(/<\/?[^>]+(>|$)/g, '').trim();

    if (url.startsWith('http://') || url.startsWith('https://')) {
      externalLinks.push({ text, url, type: 'html' });
    } else if (url.startsWith('/') || url.startsWith('#') || url.startsWith('./') || url.startsWith('../')) {
      internalLinks.push({ text, url, type: 'html' });
    }
  }

  return { internalLinks, externalLinks };
}

/**
 * Extracts heading hierarchy from markdown body.
 */
export function extractHeadings(body) {
  const headings = [];
  if (!body) return headings;

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(body)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const anchor = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    headings.push({ level, text, anchor });
  }

  return headings;
}

/**
 * Discovers all known static and dynamic site routes by inspecting src/pages/.
 */
export function getKnownSiteRoutes(options = {}) {
  const pagesDir = options.pagesDir || PAGES_DIR;
  const knownRoutes = new Set([
    '/',
    '/blog'
  ]);

  function scanPages(dir, baseRoute = '') {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        scanPages(path.join(dir, entry.name), `${baseRoute}/${entry.name}`);
      } else if (entry.isFile() && (entry.name.endsWith('.astro') || entry.name.endsWith('.md'))) {
        const basename = entry.name.replace(/\.(astro|md)$/, '');
        if (basename === 'index') {
          if (baseRoute) knownRoutes.add(baseRoute);
        } else if (basename === '404') {
          knownRoutes.add('/404');
        } else if (basename.startsWith('[') && basename.endsWith(']')) {
          // Dynamic route placeholder
          knownRoutes.add(`${baseRoute}/*`);
        } else {
          knownRoutes.add(`${baseRoute}/${basename}`);
        }
      }
    }
  }

  scanPages(pagesDir);
  return Array.from(knownRoutes);
}

/**
 * Builds a complete content inventory of all blog articles in src/content/blog/.
 */
export function buildContentInventory(options = {}) {
  const blogDir = options.blogDir || BLOG_DIR;

  if (!fs.existsSync(blogDir)) {
    throw new Error(`Blog content directory does not exist: ${blogDir}`);
  }

  const files = fs.readdirSync(blogDir).filter((file) => file.endsWith('.md'));
  const articles = [];

  for (const filename of files) {
    const filePath = path.join(blogDir, filename);
    const slug = filename.replace(/\.md$/, '');
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    const { frontmatter, rawFrontmatter, body, hasValidFrontmatter, yamlError } = parseMarkdownFile(rawContent);
    const wordCount = calculateWordCount(body);
    const { internalLinks, externalLinks } = extractLinks(body);
    const headings = extractHeadings(body);

    let pubDateIso = null;
    if (frontmatter.pubDate) {
      const parsedDate = new Date(frontmatter.pubDate);
      if (!isNaN(parsedDate.getTime())) {
        pubDateIso = parsedDate.toISOString().split('T')[0];
      } else if (typeof frontmatter.pubDate === 'string') {
        pubDateIso = frontmatter.pubDate;
      }
    }

    articles.push({
      slug,
      route: `/blog/${slug}`,
      filePath: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
      absolutePath: filePath,
      title: frontmatter.title || null,
      description: frontmatter.description || null,
      pubDate: pubDateIso,
      rawPubDate: frontmatter.pubDate,
      author: frontmatter.author || null,
      category: frontmatter.category || null,
      readTime: frontmatter.readTime || null,
      tags: frontmatter.tags || [],
      faqs: Array.isArray(frontmatter.faqs) ? frontmatter.faqs : [],
      hasFaqs: Array.isArray(frontmatter.faqs) && frontmatter.faqs.length > 0,
      wordCount,
      internalLinks,
      externalLinks,
      headings,
      hasValidFrontmatter,
      yamlError: yamlError || null,
      rawFrontmatter,
      bodyPreview: body.slice(0, 200).trim()
    });
  }

  // Sort by pubDate descending (latest first)
  articles.sort((a, b) => {
    const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return timeB - timeA;
  });

  const knownRoutes = getKnownSiteRoutes(options);
  // Add all blog routes to known routes
  const allRoutes = Array.from(new Set([...knownRoutes, ...articles.map((a) => a.route)]));

  return {
    scannedAt: new Date().toISOString(),
    totalArticles: articles.length,
    articles,
    categories: Array.from(new Set(articles.map((a) => a.category).filter(Boolean))),
    knownRoutes: allRoutes
  };
}

// CLI test output if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inventory = buildContentInventory();
  console.log(`\n======================================================`);
  console.log(` CONTENT INVENTORY: ACCURATE OVULATION CALCULATOR`);
  console.log(`======================================================`);
  console.log(`Scanned At:     ${inventory.scannedAt}`);
  console.log(`Total Articles: ${inventory.totalArticles}`);
  console.log(`Categories:     ${inventory.categories.join(', ')}`);
  console.log(`Known Routes:   ${inventory.knownRoutes.length}`);
  console.log(`\nArticles:`);
  inventory.articles.forEach((a, i) => {
    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. [${a.pubDate || 'NO DATE'}] ${a.title} (${a.wordCount} words, ${a.category}) -> ${a.route}`);
  });
}
