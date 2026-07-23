# Changelog

All notable changes to the **Accurate Ovulation Calculator** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Created comprehensive AI context document `WORKING.md` detailing project overview, mathematical formulas, components, and design system tokens.
- Created master planning specification `PROJECT_PLAN.md` outlining project vision, KPIs, folder architecture, Gantt roadmap, and maintenance schedules.
- Created `CHANGELOG.md` to document version history and completed work in chronological order.

---

## [0.1.0] - 2026-07-23

### Added
- **Interactive Fertility Calendar & Exporter (`src/components/Calendar.astro`, `src/pages/fertility-calendar.astro`):**
  - Interactive two-month calendar grid with color-coded day markers (Menstrual Flow, Fertile Window, Peak Ovulation, Implantation Window, Test Window).
  - Single-click `.ics` calendar file export function for importing cycle events into Google Calendar, Apple Calendar, and Microsoft Outlook.
  - Client-side `localStorage` data persistence (`saved_cycle_data`).
- **Day-by-Day Symptom & Mucus Inspector:**
  - Interactive side inspector panel updating on date click to reveal predicted physical signs, cervical mucus shifts (dry/paste $\rightarrow$ creamy $\rightarrow$ watery $\rightarrow$ raw egg-white), BBT status, and actionable fertility advice.
- **Visual Cycle Timeline (`src/components/Timeline.astro`):**
  - 4-phase cycle timeline visualization summarizing Menstrual, Follicular, Ovulatory, and Luteal phases alongside summary stat badges.

### Calculator Updates
- **Multi-Method Ovulation Calculation Engine (`src/pages/ovulation-calculator.astro`):**
  - Standard Last Menstrual Period (LMP) calculation.
  - Custom Luteal Phase length support ($10\text{--}18\text{ days}$).
  - Evidence-based Ogino-Knaus method for irregular cycles using shortest and longest cycle parameters over 6–12 months.
- **Pregnancy Due Date Calculator Engine (`src/pages/due-date-calculator.astro`):**
  - LMP dating method using Naegele's rule adjusted for cycle length variance.
  - Known Conception Date calculation method (+266 days).
  - IVF Embryo Transfer calculation supporting 3-day (+263 days) and 5-day blastocyst (+261 days) transfer schedules.
- **Pregnancy Test Timing Engine (`src/pages/pregnancy-test-calculator.astro`):**
  - Multi-tier detection window calculations for Quantitative Blood Tests ($2\text{--}5\text{ mIU/mL}$, $9\text{--}10\text{ DPO}$), Early Detection Urine Tests ($10\text{ mIU/mL}$, $11\text{--}12\text{ DPO}$), and Standard Home Tests ($20\text{--}25\text{ mIU/mL}$, $14\text{ DPO}$).

### SEO Improvements
- Embedded custom `Calculator` JSON-LD schema across all tool pages.
- Embedded rich `FAQPage` JSON-LD schemas targeting search engine rich snippet accordions and AI Overviews.
- Configured `@astrojs/sitemap` integration in `astro.config.mjs` for automatic XML sitemap generation.
- Added `/public/robots.txt` directing crawlers to `sitemap-index.xml`.
- Added canonical URL tags (`<link rel="canonical" href={canonical} />`) across all pages.
- Added Open Graph and Twitter Card (`summary_large_image`) meta tag suites in `src/components/SEO.astro`.

### UI Improvements
- Configured custom `@theme` tokens in `src/styles/global.css` for Women's Health SaaS aesthetic (Warm Plum, Soft Blush, Coral Peak, Sage Green, Warm Gold).
- Added `.btn-primary` and `.btn-secondary` pill button utilities with smooth lift animations.
- Enhanced `.card-container` styling with stacked soft shadows (`--shadow-md`) and hairline borders (`--color-hairline`).
- Self-hosted Inter and JetBrains Mono fonts in `/public/fonts` for fast font loading and zero layout shifts.
- Implemented accessible sticky glassmorphism header (`Header.astro`) with mobile drawer menu toggle and skip to content link.
- Created sitewide footer (`Footer.astro`) featuring 4-column menu layout and prominent medical disclaimer banner.

### Bug Fixes
- Fixed tab switching focus indicators and ARIA roles (`role="tab"`, `aria-selected`, `aria-controls`) across calculator panels.
- Fixed calendar grid cell alignment and missing dot indicators for peak ovulation days.
- Resolved irregular cycle fertile window range calculations to prevent negative date offsets.

### Performance Improvements
- 100% static site pre-rendering via Astro SSG for instantaneous page load speeds.
- 100% client-side local calculation architecture, eliminating API fetch latency and ensuring zero server data collection.
- Optimized image assets (PNG and WebP logo formats) with explicit width and height attributes to prevent Content Layout Shifts (CLS = 0.00).

---

## [0.0.2] - 2026-07-22

### Added
- **Legal & Compliance Infrastructure:**
  - Dedicated Medical Disclaimer page (`medical-disclaimer.astro`).
  - Privacy Policy page (`privacy.astro`) documenting 100% client-side processing.
  - Terms of Use page (`terms.astro`).
  - About Us page (`about.astro`) detailing clinical mission and Ogino-Knaus algorithm.
  - Contact Us page (`contact.astro`) with privacy-centric support categories.
  - Custom styled 404 Error page (`404.astro`).
- **Educational Content Collections:**
  - Configured Zod schema in `src/content.config.ts`.
  - Published 6 evidence-based educational articles in `src/content/blog/` covering ovulation science, cervical mucus, BBT, fertile windows, early symptoms, and fertility tips.
  - Dynamic blog post renderer (`src/pages/blog/[...slug].astro`) and blog index (`src/pages/blog/index.astro`).

---

## [0.0.1] - 2026-07-20

### Added
- Initialized Astro 7.0.9 static site framework with TypeScript.
- Created base layout structure (`Layout.astro`, `Header.astro`, `Footer.astro`, `SEO.astro`).
- Implemented basic ovulation calculator template and project configuration (`astro.config.mjs`, `package.json`, `tsconfig.json`).
