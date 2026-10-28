# Landing Module

Status: Built
Last updated: October 29, 2026

## 1. Module Overview

The landing page is the public home page at `/`. It explains the product to visitors and sends them to `/sign-in`. It has no data fetching, no API calls and no state beyond the navbar's scroll state.

There is no sign-up page. Every call to action ("Get started", "Start tracking — it's free", "Sign in", "Open application") links to `/sign-in`. `frontend/middleware.ts` lists `/`, `/sign-in(.*)` and `/sign-up(.*)` as public routes; `/sign-up` has no page behind it.

---

## 2. Location and Structure

```text
frontend/app/(marketing)/
  layout.tsx          navbar, main, footer
  page.tsx            renders the sections in order
  _components/
    Navbar.tsx        client component (scroll state)
    Footer.tsx
    Hero.tsx
    OldWay.tsx
    Track.tsx
    AiFit.tsx
    FollowUp.tsx
    Steps.tsx
    ClosingCta.tsx
    data.ts           hard-coded sample companies and board layouts
    primitives.tsx    shared layout classes and mockup card/column components
```

`(marketing)` is a route group, so it adds nothing to the URL. The old placeholder `app/page.tsx` was removed so only one file resolves to `/`. Everything except `Navbar` is a server component.

The layout wraps the page in a full-width `overflow-x-hidden` container with the fixed navbar, `<main>`, and the footer.

---

## 3. Sections in Render Order

| Section | Anchor | Background | Content |
|---|---|---|---|
| Hero (`Hero.tsx`) | `#top` | Brand orange | Eyebrow `FREE JOB APPLICATION TRACKER`, headline `Stop guessing where you stand.` (with a hand-drawn underline on "guessing"), a short paragraph, the `Start tracking — it's free` and `See how it works` buttons, a no-card note, and a mock browser window showing three board columns (Applied, Screening, Interview). Two Caveat annotations (`27 days, no reply — time to nudge`, `click to update`) with arrows and a floating `Resume fit 82/100` pill sit around the mockup and are hidden below 1100px. |
| The old way (`OldWay.tsx`) | none | Peach | `From this… to this.` A messy spreadsheet mockup next to a small dashboard mockup (pipeline strip and a `Gone quiet` card with `Remind me` buttons), with a `much better` annotation between them. |
| Track (`Track.tsx`) | `#product` | White | `01 — TRACK`, `Every application, one board.`, three bullets, a six-column board (Applied, Screening, Interview, Assignment, Offer, Rejected), and an Airbnb detail card with a stage stepper and status history overlapping the board's lower right. |
| AI Resume Fit (`AiFit.tsx`) | none | Peach | A resume-fit card (score 82/100, missing keywords, strongest points, red flags, recruiter take, `Copy improvement prompt`) beside `02 — AI RESUME FIT` and `See your resume the way a recruiter does.` |
| Follow up (`FollowUp.tsx`) | `#follow` | White | `03 — FOLLOW UP`, `Never let an application go quiet.`, three bullets, and a mock reminder email (from `reminders@applyntrack.online`, subject `Time to follow up with Microsoft`) with an `Open application` button and a `Remind me · Oct 14` tag. |
| Three steps (`Steps.tsx`) | `#how` | Peach | `Set up in three steps.` with steps 01 `Add your applications`, 02 `Upload your resume once`, 03 `Move cards, get nudged`. |
| Closing CTA (`ClosingCta.tsx`) | `#start` | Brand orange | `EARLY ACCESS`, `Your next application deserves better than row 47.` (a large faded `47` behind it on wide screens), and `Start tracking — it's free` / `Sign in` links. |

### Navbar

`Navbar.tsx` is fixed at the top, 72px tall. Over the hero it is transparent with white text and a white `Get started` button. After the page scrolls more than 80px it becomes white with a blur, a bottom border and an orange button. Links: `Product` (`#product`), `How it works` (`#how`) (hidden below the `md` breakpoint), `Sign in` and `Get started` (`/sign-in`). The brand mark links to `#top`.

### Footer

A minimal white footer with the brand mark, `Product`, `How it works` and `Sign in` links, and `© {current year} APPLYNTRACK`. The design source has no footer, so this one is not from a design board.

### Responsive behavior

The hero stacks its text and mockup below 1100px. Grids collapse to one column below `lg`, the Track board becomes 2 or 3 columns instead of 6, the Airbnb card drops below the board instead of overlapping it, and the step dividers become horizontal rules. Section minimum heights apply only from `lg` up.

---

## 4. Mockups and Sample Data

Everything shown inside the mockups is static, hard-coded sample data. None of it comes from the API, and none of it is the signed-in user's data. Nothing in the mockups is interactive: cards, buttons and the stepper are not clickable.

`data.ts` holds:

- `COMPANIES`: ten sample companies (Google, Microsoft, Vercel, Stripe, Notion, Airbnb, Linear, Figma, Shopify, Netflix). Each has a `name`, `companyDomain`, `role` (an entry-level job title, one per company), `source` and `date`, and an optional `quiet` day count that shows a `QUIET n DAYS` label on Applied cards.
- `HERO_COLUMNS` and `BOARD_COLUMNS`: which companies sit in which status column. The hero board has one card shown lifted above its slot (Stripe in Screening), as an illustration of moving a card.
- `STRIP`: the five pipeline counts in the old-way dashboard mockup.

Each company keeps the same title everywhere it appears (hero board, Gone quiet card, Track board, the Airbnb detail card, the Google resume-fit card and the Microsoft reminder email). The titles are assigned by hand in `COMPANIES`, not generated at runtime, so server and client markup match.

The spreadsheet in the old-way section uses its own hard-coded abbreviations (`SDE`, `PE`, `FE II`) as plain text.

`primitives.tsx` provides `MockCard` and `MockColumn`, used by the hero and Track boards. A card shows the logo, company, job title and a `SOURCE · DATE` meta line. The job title and the source are truncated with an ellipsis rather than wrapped, and the date is never split from its month, so at narrower widths (for example the hero board at 1440px) long titles are cut off.

The Track board sits in its own wide container (up to 1800px with a small side gutter) so its six columns are as wide as possible; the section's text stays in the normal 1400px container.

---

## 5. Company Logos

Company avatars in the mockups use the same `CompanyLogo` component as the app (`frontend/app/components/CompanyLogo.tsx`):

- It builds `https://cdn.brandfetch.io/{companyDomain}/icon?c={clientId}` and shows it in a plain `<img>`, as Brandfetch's guidelines require. The domain comes from `COMPANIES[...].companyDomain`.
- If there is no domain, no client ID, or the image fails to load, it shows a letter avatar instead. On the landing page the fallback is tinted with the card's status color (`tone`).
- Sizes: 28px on board cards and the Airbnb card header, 24px in the `Gone quiet` rows, 20px on the Airbnb status-history rows.

`NEXT_PUBLIC_BRANDFETCH_CLIENT_ID` must be set for the logos to load. It is a public identifier, not a secret, and Next.js inlines `NEXT_PUBLIC_*` values at build time, so it has to be present in the environment when the frontend is built for production. Without it the page still renders correctly with letter avatars. Brandfetch also redirects hotlinked requests that do not look like normal browser image loads to its hotlinking guidelines page, so logos may not appear in headless or non-browser screenshots even with the ID set. See `docs/architecture.md` Section 6b for the Brandfetch design.

---

## 6. Design Notes

- Colors, radii, shadows and fonts come from the design tokens in `frontend/app/globals.css` (for example `bg-brand`, `bg-peach`, `text-brand-accent`, `rounded-modal`); fonts are Geist, Geist Mono (eyebrows and meta lines) and Caveat (the handwritten annotations).
- Status colors on the mockups come from `STATUS_STYLES` in `frontend/app/lib/status.ts`.
- The mock browser bar shows three window dots and no URL text.

---

## 7. Known Limitations

- There is no sign-up page; all calls to action go to `/sign-in`.
- The mockups are illustrations. For example the hero shows a card lifted mid-move, but the landing page itself has no interactive board.
- The mobile layout is derived from the desktop design's responsive rules; there is no separate mobile design file in the repository.
- The page-snap scrolling used in the design source is not applied.
