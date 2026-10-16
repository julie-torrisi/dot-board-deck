import { describe, it, expect } from 'vitest';
import { replyItems } from '../src/ask';
import type { TextItem } from '../src/deck';

describe('replyItems', () => {
  it('wraps to 23 characters from col 34, max 3 lines', () => {
    const items = replyItems('a calm systems thinker who ships beautiful things at enormous scale every day') as TextItem[];
    expect(items.length).toBe(3);
    expect(items.every((i) => i.col === 34 && i.text.length <= 23)).toBe(true);
    expect(items.map((i) => i.row)).toEqual([70, 94, 118]);
  });
  it('blanks unsupported characters', () => {
    const [first] = replyItems('hi @ you') as TextItem[];
    expect(first.text).not.toContain('@');
  });
});
