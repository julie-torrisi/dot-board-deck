// Guardrails for a deck before it ships. Uses the engine's own layout and font metrics,
// so "fits" here means fits on screen. Usage: npm run check [path/to/deck.json ...]

import { readFileSync } from 'node:fs';
import { body, overflow } from '../src/layout';
import { textWidth } from '../src/type';
import { ICON_NAMES } from '../src/glyphs';
import type { Deck } from '../src/deck';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['src/decks/demo.json'];
const STATUSES = ['SHIPPED', 'LIVE', 'PUBLISHED', 'SUBMITTED', 'PROTOTYPE', 'IN PROGRESS'];
const BANNED: [RegExp, string][] = [
  [/—/, 'an em dash'],
  [/\bVAF\b/i, '"VAF" (spell out Visual Asset Framework)'],
  [/available now/i, '"available now"'],
  [/STAFF PRODUCT DESIGNER,? (AT )?META/i, 'a Staff title for Meta (it was Principal Product Designer)'],
];

let problems = 0;
const fail = (file: string, msg: string) => { problems++; console.error(`  x ${file}: ${msg}`); };

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const deck = JSON.parse(raw) as Deck;
  if (/op8gczqfKp5jtVppMA5Zsh/.test(raw)) fail(file, 'links the visual cover letter master');

  // banned phrases apply to what people read: every string except ids, file paths and endpoints
  const visible: string[] = [];
  const walk = (v: unknown, key = '') => {
    if (typeof v === 'string') { if (!['id', 'src', 'thumb', 'href'].includes(key)) visible.push(v); }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(deck);
  const text = visible.join('\n');
  for (const [re, what] of BANNED) if (re.test(text)) fail(file, `contains ${what}`);

  for (const w of overflow(deck)) fail(file, w);

  deck.slides.forEach((s, i) => {
    const at = `slide ${i + 1} (${s.id})`;
    if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) fail(file, `${at}: id must be lowercase letters, digits and dashes`);
    if (s.template === 'departures') for (const r of s.rows) {
      if (!STATUSES.includes(r.status)) fail(file, `${at}: status "${r.status}" must be one of ${STATUSES.join(', ')}`);
      if (72 + textWidth(r.project, 'h1') + 6 > 365 - textWidth(r.status, 'h1')) fail(file, `${at}: "${r.project}" runs into "${r.status}". Shorten one.`);
    }
    const pics = s.template === 'image' ? [s.image] : s.template === 'wall' ? s.images : s.template === 'about' ? s.photos : s.template === 'intro' ? [s.image] : [];
    for (const im of pics) if (!im?.alt) fail(file, `${at}: every image needs alt text`);
    for (const c of s.template === 'cards' ? s.cards : []) if (c.icon && !ICON_NAMES.includes(c.icon)) fail(file, `${at}: unknown icon "${c.icon}"`);
    // one red signal per slide: the why line counts as one, however many lines it wraps to
    const reds = body(s).filter((it) => (it.t === 'text' || it.t === 'block' || it.t === 'icon') && it.ink === 'signal').length + (s.why ? 1 : 0);
    if (reds > 1) fail(file, `${at}: more than one red signal. Keep red to one thing per slide.`);
  });
}

if (problems) { console.error(`\n${problems} problem(s). Fix before shipping.`); process.exit(1); }
console.log(`OK: ${files.join(', ')}`);
