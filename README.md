# Accurate Ovulation Calculator 🌸

[![Astro](https://img.shields.io/badge/Astro-v7.0.9-ff5d01.svg?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06b6d4.svg?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Client--Side-green.svg?style=flat-square)](https://accurateovulationcalculator.com/privacy)

A clinically-precise, privacy-first web application for cycle tracking, fertile window prediction, pregnancy due date calculation, and pregnancy test timing. Built with **Astro 7**, **Tailwind CSS v4**, and **TypeScript**, engineered for maximum performance, 100% client-side privacy, and zero data tracking.

---

## 🌟 Key Highlights

- **100% Privacy-First Architecture:** Zero telemetry, zero server-side database storage, zero third-party analytics trackers. All user calculations process strictly in the browser.
- **Evidence-Based Medical Calculations:** Powered by Naegele's rule, Ogino-Knaus algorithm for irregular cycles, custom luteal phase parameters, and ASRM/SART IVF transfer guidelines.
- **Interactive Calendar & ICS Exporter:** View 2-month cycle timelines with color-coded day indicators and export calendar events directly to Google Calendar, Apple Calendar, or Microsoft Outlook.
- **Day-by-Day Symptom Inspector:** Provides predictions for physical signs, cervical mucus shifts (dry $\rightarrow$ creamy $\rightarrow$ watery $\rightarrow$ raw egg-white), Basal Body Temperature (BBT) status, and fertility advice.
- **Lighthouse Performance Score 98+:** Ultra-fast static site generation (SSG) with 0.00 Content Layout Shift (CLS) and sub-second Largest Contentful Paint (LCP).
- **SEO & Search Engine Rich Snippet Optimized:** Built-in JSON-LD schemas (`Calculator`, `FAQPage`, `WebSite`, `Organization`, `BreadcrumbList`) targeting Google Rich Results and AI Overviews.

---

## 💻 Available Calculators

| Calculator | Supported Calculation Modes | Primary Outputs |
| :--- | :--- | :--- |
| **Ovulation Calculator** | • Last Menstrual Period (LMP)<br>• Custom Luteal Phase ($10\text{--}18\text{ days}$)<br>• Irregular Cycles (Ogino-Knaus algorithm) | Fertile Window Range, Peak Ovulation Day, Implantation Window ($+6\text{--}+10\text{ DPO}$), Recommended Test Date, Estimated Due Date |
| **Due Date Calculator** | • Last Menstrual Period (LMP)<br>• Known Conception Date<br>• IVF Transfer (3-Day Cleavage vs 5-Day Blastocyst) | Estimated Due Date, Gestational Age (Weeks + Days), Trimester Progress Bar, Developmental Milestone Schedule |
| **Pregnancy Test Calculator** | • Cycle Length & LMP Date | Blood Test ($2\text{--}5\text{ mIU/mL}$), Early Urine Test ($10\text{ mIU/mL}$), Standard Home Test ($20\text{--}25\text{ mIU/mL}$) Timing |
| **Fertility Calendar** | • Interactive 2-Month Render Matrix<br>• Local Storage Persistence | Color-Coded Phase Markers, Day Inspector Panel, Single-Click `.ics` Export for Google/Apple Calendar |

---

## 🛠️ Tech Stack

- **Framework:** [Astro 7.0.9](https://astro.build/) (Static Site Generation / Island Architecture)
- **Styling Engine:** [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`) + CSS `@theme` Design Tokens
- **Date Arithmetic:** [`date-fns` v4.1.0](https://date-fns.org/)
- **Typography:** Self-hosted `Inter` (Sans) and `JetBrains Mono` (Monospace)
- **Content System:** Astro Content Collections with Zod Schema Validation
- **Integrations:** `@astrojs/sitemap` v3.2.1, `@tailwindcss/typography` v0.5.15

---

## 📁 Folder Structure

```text
wretched-wavelength/
├── public/                      # Static public assets & self-hosted web fonts
│   ├── fonts/                   # Inter & JetBrains Mono woff2 font files
│   ├── favicon.ico / .svg       # Browser favicons
│   ├── logo-optimized.png       # High-DPI brand logo
│   └── robots.txt               # Crawler instructions
├── src/
│   ├── components/              # Reusable UI & Logic Components
│   │   ├── Calendar.astro       # Interactive 2-month cycle calendar & inspector
│   │   ├── Footer.astro         # Footer with medical disclaimer banner
│   │   ├── Header.astro         # Sticky header with mobile navigation drawer
│   │   ├── SEO.astro            # Centralized SEO meta & JSON-LD schema builder
│   │   └── Timeline.astro       # 4-phase visual cycle timeline
│   ├── content/                 # Content Collections
│   │   └── blog/                # Medical & educational markdown articles (.md)
│   ├── layouts/                 # Page Templates
│   │   └── Layout.astro         # Primary page layout wrapper
│   ├── pages/                   # File-based Routes
│   │   ├── blog/                # Blog routes & dynamic article renderer
│   │   ├── 404.astro            # Custom error page
│   │   ├── about.astro          # About Us & clinical methodology
│   │   ├── contact.astro        # Contact Us page
│   │   ├── due-date-calculator.astro # Pregnancy Due Date Calculator
│   │   ├── fertility-calendar.astro  # Interactive Fertility Calendar & ICS exporter
│   │   ├── index.astro          # Homepage featuring Ovulation Calculator
│   │   ├── medical-disclaimer.astro  # Dedicated Medical Disclaimer
│   │   ├── ovulation-calculator.astro# Primary Ovulation Calculator
│   │   ├── pregnancy-test-calculator.astro # Pregnancy Test Calculator
│   │   ├── privacy.astro        # Privacy Policy page
│   │   └── terms.astro          # Terms of Use page
│   ├── styles/
│   │   └── global.css           # Tailwind v4 @theme configuration & custom utility CSS
│   └── content.config.ts        # Zod content collection schema validation
├── astro.config.mjs             # Master Astro configuration
├── package.json                 # Dependencies and scripts
└── tsconfig.json                # TypeScript settings
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js 22.12.0 or higher** installed on your machine.

```bash
node -v  # Should be >= v22.12.0
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/accurate-ovulation-calculator.git
   cd accurate-ovulation-calculator/wretched-wavelength
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## ⚡ Development

To start the local dev server with hot module reloading (HMR):

```bash
npm run dev
```

The application will be available at `http://localhost:4321`.

---

## 🏗️ Build

To compile the production static build:

```bash
npm run build
```

The compiled production-ready HTML, CSS, JavaScript, and XML sitemap assets will be output to the `./dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

---

## 🌐 Deployment

The static output in `./dist/` can be deployed to any static web host or CDN platform:

- **Cloudflare Pages:** Connect repository, set build command `npm run build`, output directory `dist`.
- **Vercel:** Framework preset `Astro`, build command `npm run build`, output directory `dist`.
- **Netlify:** Build command `npm run build`, publish directory `dist`.

---

## 🔍 SEO Strategy & Features

- **Dynamic JSON-LD Schemas:** Embedded `Calculator`, `FAQPage`, `WebSite`, `Organization`, and `BreadcrumbList` schemas across all pages.
- **Title & Description Optimization:** Page title tags strictly kept under 60 characters; meta descriptions target 150–160 characters.
- **Canonical URLs:** Explicit `<link rel="canonical" href="..." />` on every page preventing duplicate content indexing.
- **Social Sharing:** Open Graph and Twitter Card (`summary_large_image`) meta tag suites built into `SEO.astro`.
- **Automatic Sitemap & Robots.txt:** Build-time sitemap compilation (`/sitemap-index.xml`) paired with `/public/robots.txt`.

---

## ⚡ Performance Optimizations

- **Zero API Fetch Latency:** All mathematical cycle calculations run 100% in the client's browser engine using optimized vanilla JS and `date-fns`.
- **Zero Content Layout Shift (CLS = 0.00):** Image logo dimensions (`width` & `height`) and self-hosted fonts (`font-display: swap`) prevent layout jumps during load.
- **Minimal CSS Payload:** Powered by Tailwind CSS v4 compiler which eliminates unused styles at build time.

---

## ♿ Accessibility (WCAG 2.1 AA)

- **Skip Link:** Accessible `<a href="#main-content">Skip to main content</a>` element for keyboard and screen reader users.
- **Focus Rings:** Explicit `:focus-visible` styling (`ring-2 ring-brand-rose`) across all form inputs, buttons, and accordion toggles.
- **ARIA Attributes:** Full support for `role="tab"`, `aria-selected`, `aria-controls`, and `aria-expanded` attributes on interactive panels.

---

## ⚠️ Medical Disclaimer

The calculations, projections, timelines, and educational content on this website are for **informational and educational purposes only**. They are derived from statistical averages and standardized reproductive metrics, which can vary across individual menstrual cycles.

This tool is **NOT intended** as, and must **NEVER be used as, a substitute for professional medical advice, diagnosis, treatment, or contraception (birth control)**. Always consult with a licensed gynecologist or healthcare professional regarding reproductive health decisions.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🔮 Future Roadmap

- [ ] PDF export for personalized 3-month cycle summary reports for clinical visits.
- [ ] Multi-language support (i18n) for Spanish, French, German, and Portuguese.
- [ ] Progressive Web App (PWA) offline service worker caching.
- [ ] Interactive Basal Body Temperature (BBT) line chart logger.
- [ ] Reverse Conception Date Calculator.
