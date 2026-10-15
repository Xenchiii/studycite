# StudyCite (frontend)

StudyCite is an AI study assistant that shows where every answer came from. You upload your notes and readings, ask a question, and each sentence of the answer carries a number. Click the number and the exact excerpt opens beside the chat, stamped with a verdict on how well it matches.

This is the React frontend. The API lives in the `worker` folder and has its own README.

## Contents

- [What's in it](#whats-in-it)
- [Getting started](#getting-started)
- [Project layout](#project-layout)
- [How the app works](#how-the-app-works)
- [What the frontend expects from the API](#what-the-frontend-expects-from-the-api)
- [Match verdicts](#match-verdicts)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Theming and design](#theming-and-design)
- [Accessibility](#accessibility)
- [Customizing](#customizing)
- [Troubleshooting](#troubleshooting)
- [Known limits](#known-limits)

## What's in it

### The landing page

A single scrolling page that explains the idea. Most of its sections do something:

| Section | What it does |
| --- | --- |
| Announcement bar | Rotates through short announcements. Dismiss it and it stays gone for the rest of the browser session. |
| Hero | Headline, call to action and an animated mockup of a citation check. |
| Stats | Count-up numbers that animate when scrolled into view. |
| Citation style switcher | Shows the same reference in APA, MLA, Chicago and IEEE, with a copy button. |
| Ticker | A scrolling strip of supported formats and styles. Pauses on hover. |
| Feature cards | Three cards that flip over to show a small animated demo on the back. |
| Process | The four steps between a question and a checked answer: chunk, retrieve, answer, verify. |
| Live demo | Ask a question against three sample documents, entirely in your browser. No server involved. |
| Design | The palette, type and principles. Click a swatch to copy its hex. |
| Stack | A filterable parts list of what runs under the hood. |
| Comparison | StudyCite against a generic chatbot and checking by hand. |
| Testimonials | A carousel with autoplay, swipe, arrow keys and a pause button. |
| Pricing | Two membership cards. Nothing is billed. |
| For | Who the app is for, styled as admission tickets. |
| Quiz | Six random citation problems from a pool of ten. Pick what's wrong or confirm it's fine. |
| FAQ | Expandable questions. |
| Footer and CTA banner | Final call to action and links. |

There is also a scroll progress bar, a section rail on the side, and a back-to-top button with a progress ring.

### The app

Three columns:

- **Sidebar.** Upload PDF, DOCX, TXT or MD files by dragging or browsing. Tick which documents a question should search. Keep several study sessions and switch between them.
- **Chat.** Ask a question and get an answer with numbered citations. If you haven't asked anything yet, there are three suggested questions to start from.
- **Sources.** One card per citation, with the excerpt, the document name, the passage number and a verdict. Filter by verdict, sort by best match, expand long excerpts, and copy a quote. Below the cards, a "More to read" panel suggests papers, background reading and books from outside your documents.

Each answer is labeled with how it was produced: "Desk clerk's summary" when it was written from the passages, or "Straight from the card" when the best-matching excerpt is shown directly.

## Getting started

You need Node 18 or newer.

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder and point it at your API:

```bash
VITE_API_URL=http://localhost:8787
```

Start the dev server:

```bash
npm run dev
```

Vite prints the address, usually `http://localhost:5173`. To run the API on port 8787, follow the backend README.

Build for production:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

### Deploying to Cloudflare Pages

1. Connect the repo and set the build command to `npm run build` and the output folder to `dist`.
2. Under Settings, then Environment variables, add `VITE_API_URL` set to your deployed Worker's address.
3. Make sure the Worker's `ALLOWED_ORIGIN` is set to your Pages address, or the browser will block every request.
4. Redeploy. Vite reads environment variables at build time, so changing the value later means rebuilding.

## Project layout

```
frontend/src
  App.jsx             which screen is showing, plus sessions, uploads and asking
  api.js              every call to the backend
  auth.js             auth helpers
  components/         one file per piece of UI
  styles/             one stylesheet per component, plus mobile fixes
```

### Components

| File | Purpose |
| --- | --- |
| `Landing.jsx` | Assembles the landing page and handles scroll reveal and count-up |
| `Navbar.jsx` | Top navigation with an active-section highlight and a mobile menu |
| `AnnouncementBar.jsx` | Rotating announcements with a progress line |
| `ScrollAccessories.jsx` | Progress bar, section rail and back-to-top button |
| `DemoMockup.jsx` | The animated mockup in the hero |
| `CitationStyleSwitcher.jsx` | APA, MLA, Chicago and IEEE formatting |
| `FeatureCards.jsx` | The three flip cards and their mini demos |
| `LiveDemoSection.jsx` | The in-browser sample library and matcher |
| `DesignSection.jsx` | Palette, type and principles |
| `StackSection.jsx` | Filterable parts list and question path |
| `ComparisonSection.jsx` | Comparison table |
| `TestimonialsSection.jsx` | Carousel |
| `PricingSection.jsx` | Membership cards |
| `ForSection.jsx` | Audience tickets |
| `QuizSection.jsx` | Citation quiz |
| `FaqSection.jsx` | Expandable questions |
| `CtaBanner.jsx` | Closing call to action |
| `Footer.jsx` | Footer links |
| `AuthPage.jsx` | Sign in and create account, with a flip between the two |
| `Sidebar.jsx` | Documents, upload and sessions |
| `ChatPanel.jsx` | Messages, suggestions and the composer |
| `SourcePanel.jsx` | Citation cards, filters and summary |
| `RelatedSources.jsx` | Outside reading suggestions |

## How the app works

`App.jsx` holds a `view` value that is one of `landing`, `auth` or `app`. There is no router. The Navbar's "Try StudyCite" button and the auth page's "Try the demo without an account" button both switch to `app`.

When the app view opens it:

1. Loads your documents and sessions.
2. Opens the most recent session, or creates one if there are none.
3. Loads that session's messages and selects the last answer, so its sources show straight away.

When you ask a question:

1. Your message appears immediately as a pending bubble.
2. The question goes to the API along with the ids of the documents you ticked. If none are ticked, it searches all of them.
3. The reply replaces the pending bubble, and its sources open in the right column.
4. Clicking a number in an answer scrolls the matching card into view and highlights it. Clicking an answer bubble selects it without scrolling.

Switching sessions quickly is safe. Each switch bumps a token, and any request still running from an earlier session is ignored when it finishes, so old messages never flash onto the wrong session.

Your theme choice is stored in `localStorage` under the key `theme` and applied as a `data-theme` attribute on the page. If nothing is stored, the app follows your system setting.

## What the frontend expects from the API

This is a summary of how `App.jsx`, `SourcePanel.jsx` and `RelatedSources.jsx` use the data. All calls go through `api.js`.

| Call | Used for |
| --- | --- |
| `listDocuments()` | Fills the sidebar. Each document needs `id`, `original_name` and `chunk_count`. |
| `uploadDocument(file)` | Uploads one file and returns the new document. |
| `deleteDocument(id)` | Removes a document. |
| `listSessions()` | Fills the session list. Each needs `id` and `title`. |
| `createSession(title)` | Starts a session. |
| `getMessages(sessionId)` | Loads a session's history. |
| `deleteSession(id)` | Removes a session. |
| `ask(sessionId, question, documentIds)` | Returns `userMessage` and `assistantMessage`. |
| `related(question, page)` | Returns `items`, `hasMore` and `partial` for the "More to read" panel. |

An assistant message has `id`, `role`, `content`, an optional `mode` (`generated` or extractive) and a `citations` array. Inline markers like `[1]` in the content become clickable tags. Each citation needs:

```
documentId, documentName, chunkIndex, excerpt, score
```

`score` is a number from 0 to 1.

Each item from `related()` has `kind` (`scholarly`, `encyclopedia` or `book`), `title`, `url`, and optionally `authors`, `year`, `source`, `citedBy`, `snippet` and `freeUrl`.

## Match verdicts

The source panel puts every citation into a tier by its score:

| Tier | Score | Shown as |
| --- | --- | --- |
| High | 35% and above | Verified |
| Mid | 15% to under 35% | Low confidence |
| Low | Under 15% | Weak match |

If an answer has sources but none are verified, the panel shows a warning telling you to check your documents directly. The thresholds are the `HIGH` and `MID` constants at the top of `SourcePanel.jsx`.

The live demo on the landing page uses a separate, simpler rule: it needs at least two matching key terms before it will call anything verified.

## Keyboard shortcuts

| Where | Keys | Action |
| --- | --- | --- |
| Chat | Enter | Send the question |
| Chat | Shift + Enter | New line |
| Quiz | 1 to 4 | Pick an answer |
| Quiz | H | Show the hint |
| Quiz | Enter or right arrow | Next question, after answering |
| Testimonials | Left and right arrows | Previous and next |
| Sign in page | Left and right arrows on the tabs | Switch between sign in and create account |
| Flip cards | Enter or Space | Flip the card |

## Theming and design

The look is meant to read like a library card catalog rather than a chatbot: typewriter headings, card-stock paper, hard drop shadows and rubber-stamp verdicts.

- **Type:** Special Elite for headings, stamps and labels. Courier Prime for body text and excerpts.
- **Palette:** Postal Blue `#1d3f7a`, Ledger Ink `#211d16`, Verified Green `#3f7d4a`, Caution Amber `#b8841c`, Card Stock `#faf3e2`.
- **Icons:** Bootstrap Icons.

All colors are CSS variables defined in `:root`, with a second set under `[data-theme="dark"]`. Changing a variable in those two places changes it everywhere.

One thing to know about dark mode: the variables keep their names but not their meaning. `--blue-dark` is a dark navy in light mode and a light blue in dark mode. Any rule that uses it as a background and then puts light text on top will break in dark mode. Use a fixed hex value for surfaces that must stay dark.

## Accessibility

- A skip link jumps past the navigation to the main content.
- Interactive cards, tabs, carousels and quiz options are all reachable and usable from the keyboard.
- Status changes such as quiz feedback, copy confirmations and loading states are announced to screen readers.
- Decorative elements are hidden from assistive technology.
- When the visitor has reduced motion turned on, animations are switched off, including autoplay on the testimonials and the announcement bar.

## Customizing

**Change the colors.** Edit the variables in `:root` and `[data-theme="dark"]`# studycite
