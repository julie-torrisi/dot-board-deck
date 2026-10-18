// Deck data model. A deck is plain JSON, so one engine serves any company or talk.

import type { Role } from './tokens';

export type InkName = 'ink' | 'grey' | 'signal' | 'dim';
export type Align = 'left' | 'right' | 'center';

export interface TextItem { t: 'text'; role: Role; col: number; row: number; text: string; ink?: InkName; align?: Align; cursor?: boolean }
export interface BlockItem { t: 'block'; col: number; row: number; w: number; h: number; ink?: InkName }
/** A dotted rule: every other dot lit. */
export interface RuleItem { t: 'rule'; col: number; row: number; w: number; ink?: InkName }
export interface ImageItem { t: 'image'; src: string; alt: string; col: number; row: number; cols: number; rows: number; fit?: 'contain' | 'cover' }
export interface IconItem { t: 'icon'; name: string; col: number; row: number; ink?: InkName; scale?: number }
/** A clickable area over the board (rendered as a real link for keyboard and screen readers). */
/** copy: text put on the clipboard when the link is clicked, such as a page password. */
export interface LinkItem { t: 'link'; href: string; label: string; col: number; row: number; cols: number; rows: number; copy?: string }
export type Item = TextItem | BlockItem | RuleItem | ImageItem | IconItem | LinkItem;

export interface Stat { value: string; label: string }
export interface Departure { code: string; project: string; status: string; live?: boolean }
export interface Pic { src: string; alt: string; caption?: string }
export interface Card { icon?: string; title: string; body: string }
export interface Press { outlet: string; date: string; title: string; href: string; thumb?: string }
export interface See { label: string; href: string; copy?: string }
export interface Quote { quote: string; by: string }

/** Extras any slide can carry. */
export interface Extras {
  /** The one red line: why this matters for the company you're talking to. */
  why?: string;
  /** "See it" links, shown as one row of link labels. */
  see?: See[];
  /** Small source line. */
  sources?: string;
}

/** Reusable slide templates. */
export type Template =
  | { template: 'boot'; kicker: string; lines: string[]; sub?: string; hero?: boolean }
  | { template: 'section'; num: string; kicker: string; title: string; lines?: string[] }
  | { template: 'statement'; kicker?: string; lines: string[]; body?: string[]; note?: string; prompt?: boolean }
  | { template: 'readout'; title?: string; lead?: string; stats: Stat[]; source?: string }
  | { template: 'departures'; heads?: [string, string, string]; rows: Departure[] }
  | { template: 'image'; kicker?: string; title: string; image: Pic; caption?: string; lead?: string }
  | { template: 'wall'; kicker?: string; title: string; images: Pic[]; caption?: string; columns?: number; lead?: string }
  | { template: 'intro'; to: string; headline: string; signal?: string; body: string; tldr: string; image: Pic }
  | { template: 'about'; paragraphs: string[]; photos: Pic[] }
  | { template: 'cards'; title: string; lead?: string; cards: Card[]; layout?: 'columns' | 'rows' }
  | { template: 'press'; title: string; lead?: string; role: string; stats?: Stat[]; press: Press[] }
  | { template: 'list'; title: string; lead?: string; columns: { head: string; items: string[] }[] }
  | { template: 'thanks'; title: string; contacts: (string | See)[]; quotes: Quote[] }
  | { template: 'eof'; title: string; lines: string[] };

export type SlideSpec = Template & Extras & { id: string; label: string; notes?: string; items?: Item[] };

export interface Deck {
  /** Footer, left: name and role. */
  footer: string;
  /** Footer, right: site, then the page number. */
  site?: string;
  theme?: 'dark' | 'light';
  /** Legacy: brand mark. Unused by the current chrome. */
  brand?: string;
  slides: SlideSpec[];
}
