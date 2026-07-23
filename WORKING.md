# Accurate Ovulation Calculator - Project Context & Documentation (WORKING.md)

This document serves as the permanent, definitive AI context file for the **Accurate Ovulation Calculator** project. Any AI assistant or developer working on this codebase can read this file to immediately understand the project structure, design system, SEO rules, mathematical formulas, component architecture, and development guidelines.

---

# Project Overview

- **Project Name:** Accurate Ovulation Calculator
- **Repository Directory:** `wretched-wavelength`
- **Purpose:** Clinically-precise cycle projections, fertile window calculations, ovulation prediction, pregnancy due date estimation, pregnancy test timing, and interactive fertility calendar tracking — engineered with a 100% privacy-first, client-side architecture.
- **Tech Stack:**
  - **Framework:** Astro 7.0.9
  - **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) + Custom CSS Variables (`src/styles/global.css`)
  - **Date Utilities:** `date-fns` v4.1.0
  - **Integrations:** `@astrojs/sitemap` v3.2.1, `@tailwindcss/typography` v0.5.15
  - **Language:** TypeScript / HTML5 / JavaScript (ESNext)
- **Folder Structure:**
```text
wretched-wavelength/
├── .vscode/
├── public/
│   ├── fonts/
│   │   ├── inter-400.woff2
│   │   ├── inter-500.woff2
│   │   ├── inter-600.woff2
│   │   └── jetbrains-mono-400.woff2
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── logo-optimized.png
│   ├── logo.webp
│   └── robots.txt
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Calendar.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── SEO.astro
│   │   ├── Timeline.astro
│   │   └── Welcome.astro
│   ├── content/
│   │   └── blog/
│   │       ├── basal-body-temperature-bbt.md
│   │       ├── cervical-mucus-guide.md
│   │       ├── early-pregnancy-symptoms.md
│   │       ├── fertility-tips-to-conceive.md
│   │       ├── finding-fertile-window.md
│   │       └── understanding-ovulation.md
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── blog/
│   │   │   ├── [...slug].astro
│   │   │   └── index.astro
│   │   ├── 404.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── due-date-calculator.astro
│   │   ├── fertility-calendar.astro
│   │   ├── index.astro
│   │   ├── medical-disclaimer.astro
│   │   ├── ovulation-calculator.astro
│   │   ├── pregnancy-test-calculator.astro
│   │   ├── privacy.astro
│   │   └── terms.astro
│   ├── styles/
│   │   └── global.css
│   └── content.config.ts
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── AGENTS.md
├── CLAUDE.md
└── WORKING.md
```
- **Current Version:** `0.0.1`
- **Project Status:** `95% Complete` (Production-ready core calculators, SEO infrastructure, layout components, content collections, and legal pages fully implemented).

---

# Features Implemented

1. **Multi-Method Ovulation Calculation Engine:**
   - **LMP Mode:** Standard cycle calculation using Last Menstrual Period date and cycle length.
   - **Custom Luteal Phase Mode:** Customizable luteal phase (10–18 days) for women with short or long luteal phases.
   - **Irregular Cycle Mode:** Evidence-based Ogino-Knaus algorithm calculating conservative fertile windows based on shortest and longest cycles over 6–12 months.

2. **Comprehensive Pregnancy Due Date Calculator:**
   - **LMP Dating Method:** Naegele's rule with automatic cycle length variance adjustment.
   - **Conception Date Method:** 266-day post-conception calculation.
   - **IVF Embryo Transfer Method:** Specialized algorithms for 3-day cleavage and 5-day blastocyst embryo transfers based on ASRM/SART guidelines.
   - **Trimester Tracker & Milestones:** Gestational age output with progress indicator and key milestone dates (heartbeat, movement, viability, full term).

3. **Multi-Tiered Pregnancy Test Timing Calculator:**
   - Detailed sensitivity breakdown for Quantitative Blood Tests ($2\text{--}5\text{ mIU/mL}$), Early Detection Urine Tests ($10\text{ mIU/mL}$), and Standard Home Urine Tests ($20\text{--}25\text{ mIU/mL}$).
   - Clear DPO (Days Past Ovulation) timeline and hCG doubling guidance.

4. **Interactive Fertility Calendar & Exporter:**
   - Two-month interactive grid rendering period days, fertile window, peak ovulation day, implantation window, and pregnancy test dates.
   - **ICS Calendar Exporter:** Single-click export (`.ics` file) for Google Calendar, Apple Calendar, and Outlook.
   - **Local Storage Persistence:** Remembers user calculation data locally without external server transmission.

5. **Day-by-Day Symptom & Cervical Mucus Inspector:**
   - Side inspector card updated dynamically when clicking any calendar day.
   - Provides physical sign predictions, cervical mucus changes (paste $\rightarrow$ creamy $\rightarrow$ watery $\rightarrow$ egg-white), BBT status, and actionable fertility tips.

6. **Interactive Visual Cycle Timeline:**
   - 4-phase cycle timeline (Menstrual, Follicular, Ovulatory, Luteal) with stat badges summarizing key calculated dates.

7. **100% Client-Side Privacy Architecture:**
   - Zero telemetry, zero server-side computation, zero analytics tracking. All user inputs are processed strictly in the user's web browser.

8. **Content Collection Blog:**
   - Markdown blog system managed via Astro Content Collections with 6 evidence-based educational articles on reproductive health.

9. **Complete SEO & Schema Engine:**
   - Rich JSON-LD structured data injected dynamically for `Calculator`, `FAQPage`, `WebSite`, `Organization`, and `BreadcrumbList`.

---

# Pages

| Page Path | Title / Header | Purpose |
| :--- | :--- | :--- |
| `src/pages/index.astro` | Accurate Ovulation Calculator | Homepage featuring hero section, inline ovulation calculator, quick-access tool cards, educational articles, and FAQ. |
| `src/pages/ovulation-calculator.astro` | Ovulation Calculator | Primary dedicated ovulation calculator page supporting LMP, Luteal, and Irregular modes with full calendar and timeline integration. |
| `src/pages/fertility-calendar.astro` | Fertility Calendar | Interactive monthly calendar dashboard with daily symptom inspector, cycle logger, and `.ics` file export. |
| `src/pages/due-date-calculator.astro` | Due Date Calculator | Multi-mode pregnancy due date predictor (LMP, Conception, IVF 3D/5D) with trimester tracker and gestational age output. |
| `src/pages/pregnancy-test-calculator.astro` | Pregnancy Test Calculator | Calculates accurate testing dates for blood, early urine, and standard home pregnancy tests based on cycle parameters. |
| `src/pages/about.astro` | About Us | Explains the site's mission, Ogino-Knaus algorithm, privacy guarantee, and clinical review standards. |
| `src/pages/contact.astro` | Contact Us | Privacy-focused contact options, support inquiry categories, and quick links to FAQs. |
| `src/pages/privacy.astro` | Privacy Policy | Detailed zero-tracking privacy policy documenting 100% client-side computation and local storage use. |
| `src/pages/terms.astro` | Terms of Use | Outlines terms of service, educational scope, intellectual property, and non-medical device notice. |
| `src/pages/medical-disclaimer.astro` | Medical Disclaimer | Comprehensive medical disclaimer clarifying that calculations are informational estimates and not for contraception. |
| `src/pages/404.astro` | Page Not Found | Custom styled error page with navigation shortcuts to calculators and homepage. |
| `src/pages/blog/index.astro` | Educational Resources | Blog index page displaying grid of reproductive health articles with read time and author details. |
| `src/pages/blog/[...slug].astro` | Dynamic Blog Post | Dynamic markdown page renderer using Astro Content Collections. |

---

# Components

- **`Layout.astro`** (`src/layouts/Layout.astro`): Main page template wrapper. Injects global CSS, `<head>` tags via `SEO.astro`, sticky `Header.astro`, accessible skip to content link, `<slot />`, and `Footer.astro`. Used by all pages.
- **`SEO.astro`** (`src/components/SEO.astro`): Centralized SEO manager. Injects title tags, meta descriptions, canonical link, Open Graph metadata, Twitter Cards, theme color, and JSON-LD schemas (`WebSite`, `Organization`, `BreadcrumbList`, plus page-specific schemas).
- **`Header.astro`** (`src/components/Header.astro`): Sticky glassmorphism header navigation with brand logo, desktop menu links, CTA button, and accessible mobile drawer menu with backdrop toggle.
- **`Footer.astro`** (`src/components/Footer.astro`): Sitewide 4-column footer containing brand description, calculator links, educational links, company links, bottom copyright, and an explicit Medical Disclaimer notice banner.
- **`Calendar.astro`** (`src/components/Calendar.astro`): Client-side interactive monthly calendar component. Listens to `ovulation-calculated` custom events, renders color-coded days, handles month navigation, and provides a day inspector for physical signs, cervical mucus, BBT, and tips.
- **`Timeline.astro`** (`src/components/Timeline.astro`): 4-phase cycle timeline component displaying Menstrual, Follicular, Ovulatory, and Luteal phases alongside calculated stat summary badges.

---

# SEO Strategy & Architecture

- **Meta Title Strategy:**
  - Template: `${title} | Accurate Ovulation Calculator`
  - Kept strictly under 60 characters for optimal search engine display.
- **Meta Descriptions:**
  - Concise, value-driven descriptions between 150–160 characters incorporating primary keywords (e.g., fertile window, ovulation day, pregnancy test date, 100% private).
- **Canonical URLs:**
  - Explicit canonical link on every page (`<link rel="canonical" href={canonical} />`) generated automatically from `Astro.url.href` or explicit props.
- **Structured Data (JSON-LD):**
  - **WebSite Schema:** Site name and main URL.
  - **Organization Schema:** Site branding and logo metadata.
  - **BreadcrumbList Schema:** Dynamically constructed from URL path segments.
  - **Calculator Schema:** Custom `Calculator` schema injected on tool pages (`Ovulation Calculator`, `Due Date Calculator`, `Pregnancy Test Calculator`, `Fertility Calendar`).
  - **FAQPage Schema:** Comprehensive `FAQPage` schema on all tool pages to target Google Rich Results and AI Overviews.
- **Open Graph & Twitter Cards:**
  - `og:type` set to `article` for blog posts and `website` for tools.
  - `og:title`, `og:description`, `og:image`, `og:site_name`, `og:locale` (`en_US`).
  - `twitter:card` set to `summary_large_image` with `@accurateovulation` site handle.
- **robots.txt:**
  - Located at `/public/robots.txt`:
    ```text
    User-agent: *
    Allow: /
    Sitemap: https://accurateovulationcalculator.com/sitemap-index.xml
    ```
- **sitemap.xml:**
  - Automatically compiled during `astro build` using `@astrojs/sitemap`, filtering out `/404`.
- **Breadcrumbs:**
  - Schema-backed breadcrumbs for clear search engine crawling hierarchy.
- **Internal Linking:**
  - Contextual cross-links between calculators, educational blog posts, footer submenus, and main navigation.

---

# Calculators & Technical Logic

### 1. Ovulation Calculator (`src/pages/ovulation-calculator.astro`)
- **Inputs:**
  - Last Menstrual Period (LMP) Date (`yyyy-MM-dd`)
  - Average Cycle Length ($20\text{--}45\text{ days}$, default: 28)
  - Custom Luteal Phase ($10\text{--}18\text{ days}$, default: 14)
  - Shortest & Longest Cycle Lengths (for Irregular Cycle mode)
- **Formulas:**
  - *Standard LMP Mode:*
    $$\text{Next Period} = \text{LMP} + \text{CycleLength}$$
    $$\text{Ovulation Day} = \text{Next Period} - 14$$
    $$\text{Fertile Window} = [\text{Ovulation Day} - 5, \text{Ovulation Day}]$$
  - *Custom Luteal Mode:*
    $$\text{Ovulation Day} = \text{Next Period} - \text{LutealLength}$$
  - *Irregular Mode (Ogino-Knaus):*
    $$\text{Fertile Start} = \text{LMP} + (\text{ShortestCycle} - 18)$$
    $$\text{Fertile End} = \text{LMP} + (\text{LongestCycle} - 11)$$
    $$\text{Average Ovulation} = \text{LMP} + \left(\left\lfloor \frac{\text{Shortest} + \text{Longest}}{2} \right\rfloor - 14\right)$$
- **Associated Milestones:**
  - Implantation Window: $\text{Ovulation Day} + 6\text{ to } +10\text{ days}$
  - Recommended Pregnancy Test Date: $\text{LMP} + \text{CycleLength}$
  - Estimated Due Date: $\text{LMP} + 280\text{ days}$
- **Validation:**
  - Enforces minimum cycle length of 20 days, maximum 45 days. Shortest cycle must be $\le$ longest cycle.
- **Output:**
  - Detailed summary stats, interactive calendar event dispatch (`ovulation-calculated`), 4-phase timeline, and day inspector.
- **Medical Disclaimer:** Prominently featured below form and in footer.

---

### 2. Due Date Calculator (`src/pages/due-date-calculator.astro`)
- **Inputs:**
  - Last Menstrual Period (LMP) Date & Cycle Length
  - Conception Date (when known)
  - IVF Embryo Transfer Date & Transfer Type (3-day cleavage vs 5-day blastocyst)
- **Formulas:**
  - *LMP Dating (Adjusted Naegele's Rule):*
    $$\text{Due Date} = \text{LMP} + 280\text{ days} + (\text{CycleLength} - 28)$$
  - *Conception Date Method:*
    $$\text{Due Date} = \text{Conception Date} + 266\text{ days}$$
  - *IVF 3-Day Transfer Method:*
    $$\text{Due Date} = \text{Transfer Date} + 263\text{ days}$$
  - *IVF 5-Day Transfer Method:*
    $$\text{Due Date} = \text{Transfer Date} + 261\text{ days}$$
- **Gestational Age Calculation:**
  $$\text{Gestational Age (Days)} = \text{Today} - (\text{Due Date} - 280)$$
  $$\text{Gestational Age} = \lfloor \text{Days} / 7 \rfloor \text{ weeks } + (\text{Days} \bmod 7) \text{ days}$$
- **Output:**
  - Due Date, current Gestational Age, Trimester progress bar (1st: 0–13w, 2nd: 14–27w, 3rd: 28–40w), and milestone schedule (First Heartbeat ~6w, Anatomy Scan ~18–20w, Viability ~24w, Full Term ~39w).

---

### 3. Pregnancy Test Calculator (`src/pages/pregnancy-test-calculator.astro`)
- **Inputs:** LMP Date, Average Cycle Length.
- **Formulas & Detection Windows:**
  - $\text{Estimated Ovulation} = \text{LMP} + (\text{CycleLength} - 14)$
  - **Quantitative Blood Test ($2\text{--}5\text{ mIU/mL}$):** $\text{Ovulation} + 9\text{ to } 10\text{ days}$ ($9\text{--}10\text{ DPO}$)
  - **Early Detection Urine Test ($10\text{ mIU/mL}$):** $\text{Ovulation} + 11\text{ to } 12\text{ days}$ ($11\text{--}12\text{ DPO}$)
  - **Standard Home Urine Test ($20\text{--}25\text{ mIU/mL}$):** $\text{LMP} + \text{CycleLength}$ ($14\text{ DPO}$ / Day of Missed Period)
- **Output:**
  - Recommended date grid for each test type, hCG doubling curve explanation, false negative guidance.

---

### 4. Fertility Calendar (`src/pages/fertility-calendar.astro`)
- **Inputs:** LMP Date, Cycle Length, Luteal Phase (or saved cycle data in `localStorage`).
- **Features & Output:**
  - 2-month render matrix color-coding Menstrual Flow, Fertile Window, Peak Ovulation, Implantation Window, and Test Window.
  - **ICS Exporter:** Generates `.ics` file content dynamically for download into external calendar clients.
  - Day Inspector detailing predicted cervical mucus consistency, physical symptoms, BBT trends, and fertility advice.

---

# Design System

The application uses a refined design system built directly into `@theme` in `src/styles/global.css`.

### Colors (`src/styles/global.css`)
- **Primary Text & Headings:** `--color-primary: #2d2426` (Deep Warm Charcoal/Plum)
- **Secondary Body Text:** `--color-secondary: #5a4e51` (Warm Taupe)
- **Peak Fertility / Ovulation Accent:** `--color-brand-rose: #ec8c88` (Coral Pink)
- **Fertile Window Background:** `--color-brand-blush: #fcf0ee` (Soft Blush)
- **Fertile Window Border:** `--color-brand-rose-border: #f5c2c0`
- **Implantation Accent:** `--color-brand-sage: #8ea890` (Sage Green)
- **Implantation Background:** `--color-brand-sage-light: #eff4f0`
- **Milestone & Due Date Accent:** `--color-brand-gold: #e4c38e` (Warm Gold)
- **Menstrual Flow Background:** `--color-brand-lavender: #ece5eb` (Soft Lavender)
- **Menstrual Flow Border:** `--color-brand-lavender-border: #d4c4d1`
- **Card Background:** `--color-canvas: #ffffff` (Pure White)
- **Page Background:** `--color-canvas-soft: #fdfbfc` (Soft Warm Cream)
- **Inset Panel Background:** `--color-canvas-soft-2: #faf6f5`
- **Hairline Borders:** `--color-hairline: #efebea`
- **Strong Borders:** `--color-hairline-strong: #c8bdbe`

### Typography
- **Sans Font:** `"Inter", system-ui, -apple-system, sans-serif` (Self-hosted woff2 files in `/public/fonts`)
- **Mono Font:** `"JetBrains Mono", monospace` (Self-hosted woff2)
- **Heading Styles:** `font-weight: 600`, `letter-spacing: -0.03em`, `line-height: 1.25`

### Component Utilities
- **Primary Button (`.btn-primary`):** Pill radius (`rounded-pill`), `--color-primary` background, `#ffffff` text, subtle hover lift (`translateY(-1px)`).
- **Secondary Button (`.btn-secondary`):** Pill radius, canvas background, hairline border, hover background tint.
- **Card Container (`.card-container`):** White canvas background, `rounded-lg` / `rounded-xl`, 1px hairline border, stacked soft box shadow (`--shadow-md`).

### Mobile Responsiveness
- All grid layouts use responsive breakpoints (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).
- Tabs use horizontal overflow scrolling (`overflow-x-auto whitespace-nowrap scrollbar-none`).
- Dynamic mobile menu panel toggles smoothly with clean accessibility attributes (`aria-expanded`, `aria-controls`, `Escape` key close listener).

---

# Project Architecture

- **Static Site Generation (SSG):** Pages are pre-rendered at build time by Astro for ultra-fast response times and zero server latency.
- **Client Hydration & Event Bus:** Interactive features (calculators, calendar inspection, tab switching) use lightweight vanilla JavaScript script tags inside Astro files. State transitions trigger decoupling through standard `window.dispatchEvent(new CustomEvent('ovulation-calculated', ...))`.
- **Content Collections:** Blog posts reside in `src/content/blog/` and are strictly validated with Zod in `src/content.config.ts`.

---

# Important Files

- `astro.config.mjs`: Astro configuration with `@tailwindcss/vite` and `@astrojs/sitemap` integrations.
- `package.json`: Dependency manifests and npm scripts (`dev`, `build`, `preview`).
- `src/styles/global.css`: Design system tokens, font definitions, and utility classes.
- `src/layouts/Layout.astro`: Sitewide base layout wrapping Header, Footer, and SEO components.
- `src/components/SEO.astro`: SEO metadata and JSON-LD schema builder.
- `src/components/Calendar.astro`: Interactive monthly cycle calendar widget with day inspector.
- `src/components/Timeline.astro`: 4-phase cycle timeline widget.
- `src/pages/ovulation-calculator.astro`: Primary ovulation calculator engine.
- `src/pages/due-date-calculator.astro`: Pregnancy due date calculator.
- `src/pages/pregnancy-test-calculator.astro`: Pregnancy test timing calculator.
- `src/pages/fertility-calendar.astro`: Standalone fertility calendar page with ICS exporter.
- `src/content.config.ts`: Zod schema definition for blog content collections.

---

# Dependencies

- **`astro` (`^7.0.9`):** Core framework for fast static site generation.
- **`tailwindcss` (`^4.0.0`):** CSS framework for utility styling.
- **`@tailwindcss/vite` (`^4.0.0`):** Vite plugin compiling Tailwind CSS v4 syntax.
- **`@tailwindcss/typography` (`^0.5.15`):** Plugin for beautiful markdown blog article typography.
- **`date-fns` (`^4.1.0`):** Reliable date arithmetic (`addDays`, `subDays`, `format`, `parseISO`, `isSameDay`).
- **`@astrojs/sitemap` (`^3.2.1`):** Automated sitemap generator plugin.

---

# Remaining Tasks

- [x] Core Ovulation Calculator (LMP, Custom Luteal, Irregular modes)
- [x] Pregnancy Due Date Calculator (LMP, Conception, IVF 3D/5D)
- [x] Pregnancy Test Calculator (Blood, Early Urine, Standard Home Test)
- [x] Interactive Fertility Calendar & ICS Export
- [x] Day-by-Day Symptom & Cervical Mucus Inspector
- [x] 100% Client-Side Zero-Tracking Privacy Architecture
- [x] Structured Data (JSON-LD) for Calculators, FAQs, WebSite, Organization, Breadcrumbs
- [x] Blog with Astro Content Collections (6 articles)
- [x] Design System & Color Tokens
- [x] Legal pages (Privacy, Terms, About, Contact, Medical Disclaimer) & 404 page
- [ ] Custom Open Graph image graphics creation (`/public/og-default.jpg`, `/public/og-due-date-calculator.jpg`)
- [ ] Lighthouse 100/100 performance & accessibility validation pass

---

# Known Issues

- Static Open Graph fallback image paths (`/og-default.jpg`, `/og-due-date-calculator.jpg`, etc.) are referenced in SEO schema but should be physically added to `/public/` prior to launch to guarantee custom thumbnail previews on social networks.
- Cycles outside $20\text{--}45\text{ days}$ display standard validation notices, as ovulation timing for extreme cycle lengths requires medical evaluation.

---

# Future Improvements

- PDF Export for cycle records to share with healthcare providers.
- Multi-language support (i18n) for international fertility tracking.
- Additional calculators (Reverse Conception Calculator, Period Predictor).
- Offline PWA support with local service worker caching.

---

# Deployment Checklist

- [ ] Execute clean build test: `npm run build`
- [ ] Verify generated static assets in `dist/`
- [ ] Confirm `sitemap-index.xml` includes all canonical page paths
- [ ] Confirm `robots.txt` points to `https://accurateovulationcalculator.com/sitemap-index.xml`
- [ ] Test form interactions, tab switching, and ICS exports across mobile & desktop browsers
- [ ] Validate schema JSON-LD with Google Rich Results Test tool

---

# Git Information

- **Working Directory:** `wretched-wavelength`
- **Main Branch:** `main`
- **Build Target:** `./dist/`

---

# AI Instructions & Coding Guidelines

When continuing development on this project, future AI assistants MUST follow these strict guidelines:

1. **Architecture & Component Consistency:**
   - Always wrap new pages with `<Layout title={pageTitle} description={pageDescription} schema={schema}>`.
   - Never duplicate header, footer, or metadata logic outside of `Layout.astro` and `SEO.astro`.

2. **Styling & Design System Rules:**
   - Use CSS variables defined in `@theme` in `src/styles/global.css` (e.g., `text-primary`, `bg-canvas-soft`, `text-brand-rose`, `bg-brand-blush`).
   - Do NOT introduce raw color hex values in inline HTML classes when a design system token exists.
   - Maintain pill button utilities (`btn-primary`, `btn-secondary`) and card containers (`card-container`).

3. **Privacy First Principle:**
   - All calculation logic MUST remain 100% client-side inside script tags or pure helper functions.
   - NEVER send user cycle parameters, LMP dates, or personal health metrics to any external API or backend service.

4. **SEO & Schema Enforcement:**
   - Every tool page must define a valid JSON-LD `Calculator` schema and a detailed `FAQPage` schema.
   - Keep page title tags under 60 characters and meta descriptions between 150–160 characters.

5. **Medical Disclaimer Requirement:**
   - Every calculator page must maintain an explicit medical disclaimer notice clarifying that estimates are for educational purposes and NOT for contraception or clinical diagnostic replacement.
