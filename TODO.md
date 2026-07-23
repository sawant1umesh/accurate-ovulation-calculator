# Accurate Ovulation Calculator - Project Task List (TODO.md)

This document tracks all active, pending, and future tasks for the **Accurate Ovulation Calculator** project. Tasks are categorized by priority level using Markdown checkboxes.

---

## 🚨 Critical (Required Before Production Launch)

- [ ] **Create & Add Static Open Graph Image Assets:**
  - Create `/public/og-default.jpg` ($1200 \times 630\text{ px}$) for sitewide social sharing.
  - Create `/public/og-due-date-calculator.jpg` ($1200 \times 630\text{ px}$) for the Due Date Calculator page.
  - Create `/public/og-pregnancy-test-calculator.jpg` ($1200 \times 630\text{ px}$) for the Pregnancy Test Calculator page.
  - Create `/public/og-fertility-calendar.jpg` ($1200 \times 630\text{ px}$) for the Fertility Calendar page.
- [ ] **Pre-Deployment Static Build Check:**
  - Run `npm run build` locally to verify static page output generation without TypeScript or Vite errors.
  - Verify that `dist/sitemap-index.xml` is generated and contains all 13 canonical routes.
  - Verify that `dist/robots.txt` exists and points to `https://accurateovulationcalculator.com/sitemap-index.xml`.
- [ ] **Structured Data (JSON-LD) Validation:**
  - Test compiled output pages on the Google Rich Results Test tool to confirm 100% valid `Calculator`, `FAQPage`, `WebSite`, `Organization`, and `BreadcrumbList` schemas.

---

## ⚡ High Priority (Pre-Launch QA & UX Refinements)

- [ ] **Accessibility & Keyboard Navigation Audit:**
  - Verify WCAG 2.1 AA compliant focus rings (`focus-visible:ring-2 focus-visible:ring-brand-rose`) on all input fields, tab buttons, and accordion toggles.
  - Ensure skip to content link (`#main-content`) functions seamlessly across screen readers.
  - Confirm mobile navigation drawer closes cleanly on `Escape` key press.
- [ ] **Cross-Browser & Mobile Testing:**
  - Test `.ics` calendar export download functionality on iOS Safari, Android Chrome, macOS Safari, and Windows Chrome/Edge.
  - Test tab switching performance and horizontal overflow scrolling on mobile devices ($320\text{ px}$ to $414\text{ px}$ viewport width).
- [ ] **Favicon & Apple Touch Icon Suite:**
  - Generate `/public/apple-touch-icon.png` ($180 \times 180\text{ px}$).
  - Generate `/public/favicon-32x32.png` and `/public/favicon-16x16.png` PNG variations.

---

## 🟡 Medium Priority (Post-Launch Enhancements)

- [ ] **Refactor Date Utility Functions:**
  - Extract inline date calculation logic from `ovulation-calculator.astro`, `due-date-calculator.astro`, and `pregnancy-test-calculator.astro` into a centralized, re-usable utility module (`src/utils/dateHelpers.ts`).
- [ ] **Print CSS Stylesheet (`@media print`):**
  - Add clean print styles to `src/pages/fertility-calendar.astro` so users can cleanly print their 2-month cycle calendar grid and day inspector notes.
- [ ] **Blog & Educational Content Expansion:**
  - Expand blog articles from 6 to 10 by adding articles on:
    - *Understanding Luteal Phase Defects & Ovulation Timing*
    - *How Ovulation Predictor Kits (OPKs) Work*
    - *Irregular Cycles & PCOS: Tracking Fertile Windows Accurately*
    - *Nutrition and Lifestyle Factors for Egg Quality*
- [ ] **Blog Post Utility Features:**
  - Add a "Copy Article Link" button and social share buttons to `src/pages/blog/[...slug].astro`.
  - Add estimated reading time indicator tag to blog article header.

---

## 🟢 Low Priority (Quality-of-Life & Minor Polish)

- [ ] **Dark Mode Theme Support:**
  - Add optional dark mode toggle with CSS root variables (`@media (prefers-color-scheme: dark)`) for night-time cycle logging.
- [ ] **Form Input Auto-Fill & Range Reset:**
  - Add a "Reset to Defaults" button on the Ovulation Calculator form.
  - Add input tooltips explaining what LMP stands for and how to find cycle length.
- [ ] **Smooth Scroll Offset Fine-Tuning:**
  - Adjust header height offset for smooth scroll positioning when form submit scrolls to `#calendar-widget`.

---

## 🔮 Future Ideas & Long-Term Roadmap

- [ ] **PDF Cycle Summary Report Exporter:**
  - Implement client-side PDF generation (using `jspdf` or `html2pdf.js`) enabling users to export a formatted 3-month cycle summary report for clinical visits.
- [ ] **Multi-Language Internationalization (i18n):**
  - Add Astro i18n support to translate the site into Spanish (`/es/`), French (`/fr/`), German (`/de/`), and Portuguese (`/pt/`).
- [ ] **Progressive Web App (PWA) Offline Capabilities:**
  - Add Web App Manifest (`manifest.json`) and service worker for offline offline-first calculation functionality.
- [ ] **Interactive BBT Temperature Graphing Utility:**
  - Add interactive line chart component allowing daily Basal Body Temperature logging and visual biphasic shift detection.
- [ ] **Reverse Conception Date Calculator:**
  - Add a dedicated tool page allowing users to calculate their estimated conception window based on an existing ultrasound date or due date.
