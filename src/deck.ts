// Deck data model. A deck is plain JSON, so one engine serves any company or talk.

import type { Role } from './glyphs';

export type InkName = 'ink' | 'grey';
export type Align = 'left' | 'right' | 'center';

export interface TextItem { t: 'text'; role: Role; col: number; row: number; text: string; ink?: InkName; align?: Align; cursor?: boolean }
export interface BlockItem { t: 'block'; col: number; row: number; w: number; h: number; ink?: InkName }
export interface ImageItem { t: 'image'; src: string; alt: string; col: number; row: number; cols: number; rows: number }
export interface AskItem { t: 'ask' }
export type Item = TextItem | BlockItem | ImageItem | AskItem;

export interface Stat { value: string; label: string }
export interface Departure { code: string; project: string; status: string; live?: boolean }
export interface Pic { src: string; alt: string }

/** Reusable slide templates. Positions follow the Dot Board spec. */
export type Template =
  | { template: 'boot'; kicker: string; lines: string[]; sub?: string }
  | { template: 'section'; num: string; kicker: string; title: string; lines?: string[] }
  | { template: 'statement'; kicker?: string; lines: string[]; body?: string[]; note?: string; prompt?: boolean }
  | { template: 'readout'; stats: Stat[]; source?: string }
  | { template: 'departures'; heads?: [string, string, string]; rows: Departure[] }
  | { template: 'image'; kicker?: string; title: string; image: Pic; caption?: string }
  | { template: 'wall'; kicker?: string; title: string; images: Pic[]; caption?: string; columns?: number }
  | { template: 'eof'; title: string; lines: string[] }
  | { template: 'ask'; title?: string };

export type SlideSpec = Template & { id: string; label: string; notes?: string; items?: Item[] };

export interface Deck {
  brand: string;
  footer: string;
  theme?: 'dark' | 'light';
  /** Short, true bio passed to the icebreaker so it never invents facts. */
  bio?: string;
  /** Offline icebreaker replies, used when the network is down. */
  offlineReplies?: string[];
  /** Where the icebreaker sends prompts. Defaults to this site's api/ask. Private decks point at the public engine's. */
  askEndpoint?: string;
  slides: SlideSpec[];
}
