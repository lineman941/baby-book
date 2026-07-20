# Competitor Analysis — Digital Baby Book Market (July 2026)

Research method: web search across Etsy categories, app stores, and comparison
sites (Etsy blocks direct scraping, so listing-level data comes from search
summaries; spot-check individual listings before copying any claim).

## The market has three camps

### 1. Etsy digital templates (our closest shelf-mates)

Thousands of listings ("digital baby book" ~5,000+, "baby journal digital
editable" ~3,000+). Formats: **Canva templates**, **printable PDFs**,
**GoodNotes/Xodo planners** (iPad + stylus crowd).

- Price: roughly **$3–25**, most clustered under $15; bestsellers tout page
  counts ("42–87 editable pages") and "birth to 5 years" coverage
- Strengths: huge built-in Etsy search traffic; pretty preview images;
  established sellers have hundreds of reviews
- Weaknesses (our openings): every one requires a third-party tool (Canva
  account, GoodNotes app, a printer); no auto-save, no interactivity, no
  growth chart that draws itself, no photos-from-camera-roll on a phone;
  "editable" really means "editable on a laptop in Canva"

### 2. Subscription apps

| App | Price | Catch |
|---|---|---|
| Qeepsake (Shark Tank) | from $3.99/mo, ~$95.88/yr for full access | must keep paying to order your book / keep video access — cancel and you lose it |
| BabyPage | $7.99/mo or $44.99/yr + books from $25 each | features paywalled; printed book is a separate purchase |
| Dujourbaby | 14-day trial → subscription | ongoing cost |
| Baby Notebook | freemium (3 chapters free) | paywall after |
| The Short Years | $129 one-time (binder + app + printing) | premium physical product, different tier |

- Strengths: polished apps, SMS prompts (Qeepsake's hook), cloud sync,
  multi-child profiles, printed-book pipelines
- Weaknesses (our openings): **recurring cost forever**; memories live on
  their servers (privacy); access tied to the subscription; a year of
  Qeepsake costs 6× our product

### 3. Where we sit — and why that's a real position

No competitor found sells a **standalone offline HTML app, one-time purchase,
data stays on-device**. We are:

- Cheaper than one month of BabyPage covers in ~2 months of any app
- More capable than any template (auto-save, photos, chart, backup, themes)
- The only "your data never leaves your phone" option
- The only "pay once, works forever, even offline" option

**Our real weaknesses vs. them:** zero reviews at launch; no cloud sync
across devices (mitigated by Backup/Restore); no printed-book pipeline
(mitigated by Print-to-PDF); first-year focus while templates advertise
"birth to 5 years"; single-child per file.

## Recommended changes (discussed, not yet implemented)

**Marketing (free, high impact — do first)**
1. Add a "vs. subscription apps" comparison strip to the landing page:
   "$14.97 once vs ~$96/yr — and you never lose access." It's factual and
   it's the single sharpest differentiator.
2. New content angles for the TikTok/Pinterest kits: "What happens to your
   baby's memories when you cancel the app subscription?" / "I refuse to
   rent my baby's memory book." Anti-subscription + privacy angles are
   emotionally strong and nobody else can use them.
3. Listing copy: add the phrase "one-time purchase" and "no Canva, no
   GoodNotes, no printer needed" — those name the exact frictions template
   buyers discover after purchase.

**Product roadmap (in rough priority order)**
4. "Before You Were Born" pregnancy section — templates and apps all cover
   pregnancy; we don't. Biggest content gap, modest build.
5. Toddler-years extension (ages 1–3) — matches the "birth to 5 years"
   claims that outrank us; could be the honest version of the upsell pack
   ($4.97–6.97) that the old copy faked.
6. Multi-child support — verify how localStorage behaves when a buyer opens
   two copies of the file for two kids (per-file origin isolation differs by
   browser); if they collide, add a book-picker or per-file key. Apps
   advertise multi-child; we should at least document the answer.
7. Print layout polish — The Short Years wins on "beautiful printed book";
   improving our print CSS (page breaks, cover page, photo sizing) plus a
   guide ("upload the PDF to any print shop") narrows that gap for $0.

**Pricing: keep $14.97.** Below the app-subscription pain threshold, above
the template junk tier, and the ladder to $16.97 at 50+ reviews already
matches how established Etsy sellers price up on social proof.

## Sources

- [Etsy: digital baby book market](https://www.etsy.com/market/digital_baby_book) · [baby journal digital editable](https://www.etsy.com/market/baby_journal_digital_editable) · [Canva baby book](https://www.etsy.com/market/canva_baby_book) · [GoodNotes baby book](https://www.etsy.com/market/goodnotes_baby_book)
- [Qeepsake](https://www.qeepsake.co/) · [Qeepsake App Store listing](https://apps.apple.com/us/app/qeepsake-family-photo-album/id1332312787)
- [BabyPage store](https://babypage.com/store/) · [BabyPage subscription announcement](https://babypage.com/babypage-announces-new-premium-features-subscription-model/)
- [The Short Years](https://www.theshortyearsbooks.com/) · [The Short Years vs. Qeepsake](https://www.theshortyearsbooks.com/blog/the-short-years-vs-qeepsake-which-baby-book-is-right-for-you)
- [Baby Notebook comparison](https://babynotebookapp.com/qeepsake-vs-the-short-years-vs-baby-notebook/) · [Dujourbaby](https://www.dujourbaby.com/) · [Keepr Circle: best baby book apps 2026](https://keeprcircle.com/blog/best-digital-baby-book-apps)
