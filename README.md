# Dot Board

An animated dot-matrix presentation engine. The whole 16:9 slide is one dot screen, like an e-reader running a split-flap departures board. It runs on one design system: [Cadence Kit](https://github.com/julie-torrisi/cadence-kit) tokens for color, Doto for display type and Inter for everything else, laid out on a 384 x 216 dot grid. Headlines arrive with a split-flap animation and every changing character flips like a card.

![The boot slide flapping in](docs/boot.gif)

Designed and built by [Julie Torrisi-Coffey](https://julietorrisi.com). The deck is the proof of craft: a visual system shipped as running code.

## Run it

```bash
npm install
npm run dev      # local deck at http://localhost:5173
npm test         # unit tests: grid math, glyphs, wrapping, slot diffing, flips, API helpers
npm run check    # guardrails for a deck file (see below)
npm run build
```

## Present it

| Key | Does |
|---|---|
| Arrow keys, space, click | Next or previous slide (click the left third to go back) |
| A | Jump to Ask the Board |
| F | Fullscreen |
| T | Dark or light theme (dark is the default) |
| N | Speaker notes in a second window, kept in sync |

Every slide has a hash URL (`#boot`, `#ask`, `#departures`) for deep links. After the first load, the deck works offline through a service worker.

## One engine, any deck

A deck is a JSON file. The engine loads `deck.json` from the same folder as the page, and falls back to the demo deck in `src/decks/demo.json`. To make a new talk, write a new `deck.json`: no code changes.

Slide templates:

| Template | Use |
|---|---|
| `boot` | Opening line with a blinking cursor |
| `section` | Big section number, title and two supporting lines |
| `statement` | One to three H1 lines, optional body and note. `prompt: true` adds the `>` prompt. |
| `readout` | Three big stats with labels and a source line |
| `departures` | Four rows of code, project and status, like a departures board |
| `image` | One real screen inside a grid-aligned frame. It dissolves in from dots. |
| `wall` | A grid of real screens, for showing volume. Set `columns` to put tall phone screens in one row. |
| `ask` | The AI icebreaker |
| `eof` | Closing line and contact details |

`npm run check path/to/deck.json` measures every line with the real font metrics and fails the build on em dashes, text past the margin, more than one red element on a slide, missing alt text, or a departures status outside SHIPPED, LIVE, PUBLISHED, SUBMITTED, PROTOTYPE and IN PROGRESS.

## Ask the Board

A slide where the audience types a prompt and the reply flaps onto the board.

- `api/ask.ts` is a Vercel function that calls Claude (`claude-haiku-5-5` by default, override with `ASK_MODEL`).
- The API key is read from the `ANTHROPIC_API_KEY` environment variable on the server. It is never in client code or this repo.
- Input is capped at 120 characters, requests are rate limited per IP, and calls time out after 6 seconds. Any failure flaps a canned reply.
- Private decks hosted elsewhere can share this endpoint: set `askEndpoint` in their `deck.json` to this site's `/api/ask`, and list their origins in `ASK_ALLOWED_ORIGINS` (comma separated). The key stays in one place.
- With no network, or no API deployed, the slide cycles the deck's prewritten `offlineReplies`, so the live moment never dies.

## The spec

### Screen

| Property | Value |
|---|---|
| Logical canvas | 1920 x 1080 |
| Grid | 384 columns x 216 rows |
| Pitch | 5px, with a 4px dot and a 1px gap |
| Margins | 19 cells left and right. Content spans col 19 to col 364. |

Every lit dot sits exactly on an unlit screen dot. To stay crisp at any size, the renderer picks an integer device pitch, `p = max(2, floor(min(vw*dpr/384, vh*dpr/216)))`, draws the grid at that pitch, and letterboxes the rest.

Colors are Cadence Kit alias tokens (`src/tokens.ts`):

| Role | Cadence Kit token | Dark (primary) | Light |
|---|---|---|---|
| Background | background.body / highEmphasis | #0b0c0c | #f7f8f8 |
| Unlit dot | background.highEmphasis / body | #161918 | #e1e4e3 |
| Grey (secondary text) | text.subtle | #9da3a1 | #5a605e |
| Ink (primary text) | text.default | #f7f8f8 | #0b0c0c |
| Signal | border.focusOutline | #ff5a60 | #d71921 |

Hierarchy comes from size, and from ink versus grey. Red is the one signal per slide: by default the status block in the top left. The deck check fails a slide with more than one red element.

### Type

Two families, four roles. Fonts ship with the deck (via Fontsource), so it works offline.

| Role | Font | Size (at 1080p) | Cap height | Advance | Case |
|---|---|---|---|---|---|
| Hero | Doto Bold | 150px | 21 rows | 18 cells, monospaced | Upper |
| H1 | Doto Bold | 100px | 14 rows | 12 cells, monospaced | Upper |
| Body | Inter Regular | 48px | 7 rows | proportional | As written |
| Label | Inter Medium, +8% tracking | 28px | 4 rows | proportional | Upper |

Doto Bold is monospaced at 0.6 em, so 100px and 150px land exactly on 12 and 18 cell advances. Inter digits are tabular, so page numbers and counters never shift. Widths come from the fonts' own metrics (`src/metrics.json`), so the browser, the tests and the deck check measure text the same way. The blinking cursor, progress bar, status block and screen stay real dots.

### Motion

- **Slots.** Every character position is a slot keyed by role, column and row. Only slots whose character changes will flip, so the header stays still and the page number flips just the digit that changes.
- **Flap.** A changing slot cycles 6 to 12 random glyphs at 78ms each, then lands on its target. Each slot starts after `(row / 216) x 260ms + charIndex x 34ms`.
- **Card flip.** Each changing character folds away and the next one unfolds, like a split-flap card. Doto display text cycles random glyphs first. Inter text flips once.
- **Progress bar.** It fills one dot at a time, 2.5ms apart, and doubles as reading progress.
- **Cursor.** Blinks every 530ms.
- **Reduced motion.** With `prefers-reduced-motion`, slides swap instantly.

## Deploy

Vercel builds `main` to production and gives every pull request a preview link. Set `ANTHROPIC_API_KEY` under Project, Settings, Environment Variables.

## License

MIT
