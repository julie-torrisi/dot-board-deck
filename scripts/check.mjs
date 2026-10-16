#!/usr/bin/env node
// Guardrails for a deck before it ships. Usage: node scripts/check.mjs [path/to/deck.json ...]
// Fails on em dashes, unsupported characters, text past the margin, banned phrases and loose statuses.

import { readFileSync } from 'node:fs';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['src/decks/demo.json'];
const STATUSES = ['SHIPPED', 'LIVE', 'PUBLISHED', 'SUBMITTED', 'PROTOTYPE', 'IN PROGRESS'];
const BANNED = [
  [/—/, 'em dash'],
  [/\bVAF\b/i, '"VAF" (spell out Visual Asset Framework)'],
  [/available now/i, '"available now"'],
  [/STAFF PRODUCT DESIGNER,? (AT )?META/i, 'Meta title must be Principal Product Designer'],
  [/op8gczqfKp5jtVppMA5Zsh/, 'visual cover letter master link'],
];
// characters each face can draw (spaces are always fine)
const F5 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-.,>/:?!#%';
const F3 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/.-+:%>';
const MAX = { hero: 19, h1: 28, body: 57, label: 86 };

let problems = 0;
const fail = (file, msg) => { problems++; console.error(`  x ${file}: ${msg}`); };

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const deck = JSON.parse(raw);
  for (const [re, what] of BANNED) if (re.test(raw)) fail(file, `contains ${what}`);
  const check = (text, face, where, max) => {
    const set = face === 'label' ? F3 : F5;
    const bad = [...String(text).toUpperCase()].filter((c) => c !== ' ' && !set.includes(c));
    if (bad.length) fail(file, `${where}: "${text}" has characters the board can't draw: ${[...new Set(bad)].join(' ')}`);
    if (max && String(text).length > max) fail(file, `${where}: "${text}" is ${String(text).length} characters, max ${max}`);
  };
  check(deck.brand, 'label', 'brand', 40);
  check(deck.footer, 'label', 'footer', 40);
  deck.slides.forEach((s, i) => {
    const at = `slide ${i + 1} (${s.id})`;
    check(s.label, 'label', `${at} label`, 30);
    if (!s.id || !/^[a-z0-9-]+$/.test(s.id)) fail(file, `${at}: id must be lowercase letters, digits and dashes`);
    const lines = (arr, face, max) => (arr ?? []).forEach((t) => check(t, face, at, max));
    switch (s.template) {
      case 'boot': check(s.kicker, 'label', at, MAX.label); lines(s.lines, 'h1', MAX.h1 - 1); check(s.sub ?? '', 'body', at, MAX.body); break;
      case 'section': check(s.num, 'hero', at, 3); check(s.kicker, 'label', at, 70); check(s.title, 'h1', at, 24); lines(s.lines, 'body', 47); break;
      case 'statement': lines(s.lines, 'h1', s.prompt ? 26 : MAX.h1); lines(s.body, 'body', MAX.body); check(s.note ?? '', 'label', at, MAX.label); break;
      case 'readout': s.stats.forEach((st) => { check(st.value, 'hero', at, 5); check(st.label, 'label', at, 28); }); break;
      case 'departures': s.rows.forEach((r) => {
        check(r.code, 'h1', at, 3); check(r.project, 'h1', at, 15); check(r.status, 'h1', at, 11);
        if (!STATUSES.includes(r.status)) fail(file, `${at}: status "${r.status}" must be one of ${STATUSES.join(', ')}`);
        const projectEnd = 72 + (r.project.length * 6 - 1) * 2;
        const statusStart = 365 - (r.status.length * 6 - 1) * 2;
        if (projectEnd + 6 > statusStart) fail(file, `${at}: "${r.project}" runs into "${r.status}". Shorten one.`);
      }); break;
      case 'image': case 'wall':
        check(s.title, 'h1', at, MAX.h1); check(s.caption ?? '', 'label', at, MAX.label);
        for (const im of s.template === 'image' ? [s.image] : s.images) if (!im?.alt) fail(file, `${at}: every image needs alt text`);
        break;
      case 'eof': check(s.title, 'h1', at, 22); lines(s.lines, 'body', MAX.body); break;
    }
  });
  for (const r of deck.offlineReplies ?? []) check(r, 'h1', 'offline reply', 69);
}

if (problems) { console.error(`\n${problems} problem(s). Fix before shipping.`); process.exit(1); }
console.log(`OK: ${files.join(', ')}`);
