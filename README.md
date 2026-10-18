# Dot Board

An animated dot-matrix presentation engine. The whole 16:9 slide is one dot screen, like an e-reader running a split-flap departures board. It runs on one design system: [Cadence Kit](https://github.com/julie-torrisi/cadence-kit) tokens for color on a 384 x 216 dot grid. Every letter, icon, rule and progress mark is lit dots on that grid: type is the Doto font sampled on its own dot grid, so a headline letter is the same filled block of dots as the cursor. Headlines arrive with a split-flap animation and every changing character flips like a flip-disc board.

![The boot slide flapping in](docs/boot.gif)

Designed and built by [Julie Torrisi-Coffey](https://julietorrisi.com). The deck is the proof of craft: a visual system shipped as running code.

## Run it

```bash
npm install
npm run dev      # local deck at http://localhost:5173
npm test         # unit tests: grid math, dot glyphs and icons, wrapping, layout, slot diffing, flips
npm run check    # guardrails for a deck file (see below)
npm run build
```

## Present it

Keys follow Figma's presentation view.

| Key | Does |
|---|---|
| Right arrow, Space, N | Next slide |
| Left arrow, Shift + Space | Previous slide |
| R | Restart from the first slide, replaying the opening animation |
| F | Fullscreen (Esc exits) |
| Home, End | First or last slide |
| PageDown, PageUp | Next or previous, for presentation clickers |
| S | Speaker notes in a second window, kept in sync |
| T | Dark or light theme (dark is the default) |
| Click | Next slide (click the left third to go back). Click an image to see it full size. |

Every slide has a hash URL (`#boot`, `#intro`, `#thanks`) for deep links. After the first load, the deck works offline through a service worker.

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
| `intro` | Who it's for, a big headline, the one red line, a short bio, a photo |
| `about` | A few short paragraphs next to a 3 x 3 photo grid with captions |
| `cards` | A title and 2 to 5 points with dot icons. `layout: "rows"` stacks them as rows. |
| `press` | My role, three stats, and press cards that link to the coverage |
| `list` | Columns of short ordered items |
| `thanks` | Contacts and an auto-rotating testimonial carousel |
| `eof` | Closing line and contact details |

Any slide can add `why` (the one red line: why it matters to this company), `see` (links) and `sources`. Links are real `<a>` elements over the board, so they work with a keyboard and screen readers.

Chrome on every slide: the eyebrow label top left (`label`), name and role bottom left (`footer`), site and page number bottom right (`site`), and a quiet one-dot progress bar along the bottom.

`npm run check path/to/deck.json` lays out every slide and fails the build on em dashes, text past the margin or into the bottom band, more than one red element on a slide, missing alt text, unknown icons, overlong quotes, or a departures status outside SHIPPED, LIVE, PUBLISHED, SUBMITTED, PROTOTYPE and IN PROGRESS.

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
| Dim (progress, rules) | quiet ink | #30353a | #c3c8c6 |
| Grey (secondary text) | text.subtle | #9da3a1 | #5a605e |
| Ink (primary text) | text.default | #f7f8f8 | #0b0c0c |
| Signal | border.focusOutline | #ff5a60 | #d71921 |

Hierarchy comes from size, and from ink versus grey. Red is the one signal per slide: usually the line that says why the work matters to the company. The deck check fails a slide with more than one red element.

### Type

Every character is a bitmap of lit dots. Nothing is drawn with a font at runtime, so the deck needs no font files.

| Role | Face | Dot scale | Cap height | Advance | Case |
|---|---|---|---|---|---|
| Hero | Doto, 5 x 7 + 2 descender rows | 3 x 3 dots per Doto dot | 21 rows | 18 cells | Upper |
| H1 | Doto | 2 x 2 | 14 rows | 12 cells | Upper |
| Body | Doto | 1 | 7 rows | 6 cells | As written |
| Label | 3 x 5 mini face | 1 | 5 rows | 4 cells | Upper |

`src/glyphs.json` is Doto Bold sampled at the centers of its own 0.1 em dot grid (a few punctuation marks redrawn as square clusters). Both faces are monospaced, so widths are exact and wrapping is by character count.

Icons: the 76 dot icons from the Figma kit, Line and Fill (`src/icons.json`, 15 x 15).

### Motion

- **Slots.** Every character position is a slot keyed by role, column and row. Only slots whose character changes will flip, so the header stays still and the page number flips just the digit that changes.
- **Flap.** A changing slot cycles 6 to 12 random glyphs at 78ms each, then lands on its target. Each slot starts after `(row / 216) x 260ms + charIndex x 34ms`.
- **Card flip.** Each changing character folds away and the next one unfolds, like a split-flap card. Headline text cycles random glyphs first. Body and labels flip once.
- **Progress bar.** One quiet row of dots along the bottom. It fills one dot at a time, 2.5ms apart.
- **Testimonials.** The `thanks` template rotates quotes every 7 seconds; each change flaps like any other text.
- **Cursor.** Blinks every 530ms.
- **Reduced motion.** With `prefers-reduced-motion`, slides swap instantly.

## Deploy

Vercel builds `main` to production and gives every pull request a preview link. No environment variables are needed.

## License

MIT
