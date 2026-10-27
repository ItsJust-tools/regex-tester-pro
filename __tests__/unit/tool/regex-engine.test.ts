import { describe, it, expect } from 'vitest';
import {
  compileRegex,
  evaluateRegex,
  extractGroups,
  flagsToString,
  highlightSegments,
  listCaptureGroups,
  zeroWidthPositions,
} from '@/tool/lib/regex';
import { MAX_MATCHES } from '@/tool/types';

describe('compileRegex', () => {
  it('compiles a valid pattern with flags', () => {
    const result = compileRegex('a+', ['g', 'i']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.flags).toBe('gi');
      expect(result.regex.flags).toContain('g');
      expect(result.regex.flags).toContain('i');
    }
  });

  it('reports an error for unbalanced groups', () => {
    const result = compileRegex('(abc', []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it('reports an error for an invalid quantifier', () => {
    expect(compileRegex('a{2,1}', []).ok).toBe(false);
    expect(compileRegex('*abc', []).ok).toBe(false);
    expect(compileRegex('\\', []).ok).toBe(false);
  });

  it('rejects patterns over the length limit', () => {
    const result = compileRegex('a'.repeat(501), []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('longer than');
  });

  it('accepts an empty pattern', () => {
    const result = compileRegex('', ['g']);
    expect(result.ok).toBe(true);
  });
});

describe('listCaptureGroups', () => {
  it('counts plain capturing groups', () => {
    expect(listCaptureGroups('(a)(b)(c)')).toEqual([
      { index: 1, name: null },
      { index: 2, name: null },
      { index: 3, name: null },
    ]);
  });

  it('skips non-capturing, lookaround, and escaped parentheses', () => {
    expect(listCaptureGroups('(?:a)(?=b)(?!c)(?<=d)(?<!e)\\(f\\)')).toEqual([]);
  });

  it('reads named groups', () => {
    expect(listCaptureGroups('(?<year>\\d{4})-(?<month>\\d{2})')).toEqual([
      { index: 1, name: 'year' },
      { index: 2, name: 'month' },
    ]);
  });

  it('ignores parentheses inside character classes', () => {
    expect(listCaptureGroups('[(](a)[)]')).toEqual([{ index: 1, name: null }]);
  });

  it('handles nested groups', () => {
    expect(listCaptureGroups('((a)(b))')).toEqual([
      { index: 1, name: null },
      { index: 2, name: null },
      { index: 3, name: null },
    ]);
  });
});

describe('evaluateRegex', () => {
  it('returns "empty" for an empty pattern', () => {
    const result = evaluateRegex('', ['g'], 'hello');
    expect(result.status).toBe('empty');
    expect(result.matches).toEqual([]);
    expect(result.stats.textLength).toBe(5);
  });

  it('returns "invalid" with an error message for a broken pattern', () => {
    const result = evaluateRegex('([a-z', ['g'], 'hello');
    expect(result.status).toBe('invalid');
    expect(result.error).toBeTruthy();
    expect(result.matches).toEqual([]);
  });

  it('finds every match with the g flag', () => {
    const result = evaluateRegex('\\d+', ['g'], 'a1 b22 c333');
    expect(result.status).toBe('ok');
    expect(result.matches.map((match) => match.value)).toEqual(['1', '22', '333']);
    expect(result.matches.map((match) => match.index)).toEqual([1, 4, 8]);
  });

  it('stops at the first match without the g flag', () => {
    const result = evaluateRegex('\\d+', [], 'a1 b22 c333');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.value).toBe('1');
  });

  it('honours the i flag', () => {
    const insensitive = evaluateRegex('abc', ['g', 'i'], 'ABC abc');
    expect(insensitive.stats.matches).toBe(2);

    const sensitive = evaluateRegex('abc', ['g'], 'ABC abc');
    expect(sensitive.stats.matches).toBe(1);
  });

  it('honours the m flag for line anchors', () => {
    const multiline = evaluateRegex('^b', ['g', 'm'], 'a\nb\nc');
    expect(multiline.stats.matches).toBe(1);

    const single = evaluateRegex('^b', ['g'], 'a\nb\nc');
    expect(single.stats.matches).toBe(0);
  });

  it('honours the s flag for dot matching newlines', () => {
    const dotAll = evaluateRegex('a.b', ['g', 's'], 'a\nb');
    expect(dotAll.stats.matches).toBe(1);

    const noDotAll = evaluateRegex('a.b', ['g'], 'a\nb');
    expect(noDotAll.stats.matches).toBe(0);
  });

  it('handles zero-width matches without looping forever', () => {
    const result = evaluateRegex('a*', ['g'], 'bbb');
    expect(result.status).toBe('ok');
    expect(result.stats.zeroWidthMatches).toBe(4);
    expect(result.matches.every((match) => match.zeroWidth)).toBe(true);
  });

  it('records word-boundary matches as zero-width', () => {
    const result = evaluateRegex('\\b', ['g'], 'hi there');
    expect(result.status).toBe('ok');
    expect(result.matches).toHaveLength(4);
    expect(result.stats.zeroWidthMatches).toBe(4);
    expect(result.stats.charactersMatched).toBe(0);
  });

  it('caps results at MAX_MATCHES and flags truncation', () => {
    const text = 'a'.repeat(MAX_MATCHES + 50);
    const result = evaluateRegex('a', ['g'], text);
    expect(result.matches).toHaveLength(MAX_MATCHES);
    expect(result.truncated).toBe(true);
  });

  it('computes coverage and character counts', () => {
    const result = evaluateRegex('ab', ['g'], 'abab');
    expect(result.stats.charactersMatched).toBe(4);
    expect(result.stats.coverage).toBe(1);

    const partial = evaluateRegex('ab', ['g'], 'abcdab');
    expect(partial.stats.coverage).toBeCloseTo(4 / 6, 5);
  });

  it('counts declared and participating groups', () => {
    const result = evaluateRegex('(a)(b)?', ['g'], 'a ab');
    expect(result.stats.matches).toBe(2);
    expect(result.stats.groups).toBe(4);
    expect(result.stats.participatingGroups).toBe(3);
  });

  it('reports a duration of at least zero', () => {
    const result = evaluateRegex('a', ['g'], 'aaa');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('measures text length even when truncated by the input cap', () => {
    const result = evaluateRegex('zzz', ['g'], 'abc');
    expect(result.stats.textLength).toBe(3);
  });
});

describe('extractGroups', () => {
  it('includes the whole match as group 0', () => {
    const regex = /(\d+)-(\d+)/d;
    const match = regex.exec('10-20');
    expect(match).not.toBeNull();
    if (!match) throw new Error('no match');
    const groups = extractGroups('(\\d+)-(\\d+)', match, match.indices ?? null);
    expect(groups[0]).toMatchObject({ index: 0, name: null, value: '10-20', start: 0, end: 5 });
    expect(groups[1]).toMatchObject({ index: 1, value: '10', start: 0, end: 2 });
    expect(groups[2]).toMatchObject({ index: 2, value: '20', start: 3, end: 5 });
  });

  it('attaches names to named groups', () => {
    const pattern = '(?<year>\\d{4})-(?<month>\\d{2})';
    const regex = new RegExp(pattern, 'd');
    const match = regex.exec('2026-10');
    if (!match) throw new Error('no match');
    const groups = extractGroups(pattern, match, match.indices ?? null);
    expect(groups[1]?.name).toBe('year');
    expect(groups[2]?.name).toBe('month');
  });

  it('reports null for groups that did not participate', () => {
    const pattern = '(a)(b)?';
    const regex = new RegExp(pattern, 'd');
    const match = regex.exec('a');
    if (!match) throw new Error('no match');
    const groups = extractGroups(pattern, match, match.indices ?? null);
    expect(groups[2]?.value).toBeNull();
    expect(groups[2]?.start).toBeNull();
  });

  it('works without index information', () => {
    const pattern = '(a)(b)';
    const regex = new RegExp(pattern);
    const match = regex.exec('ab');
    if (!match) throw new Error('no match');
    const groups = extractGroups(pattern, match, null);
    expect(groups[0]?.start).toBe(0);
    expect(groups[0]?.end).toBe(2);
    expect(groups[1]?.start).toBeNull();
    expect(groups[1]?.value).toBe('a');
  });
});

describe('highlightSegments', () => {
  it('returns no segments for empty text', () => {
    expect(highlightSegments('', [])).toEqual([]);
  });

  it('splits text into plain and matched runs', () => {
    const result = evaluateRegex('b', ['g'], 'abc');
    const segments = highlightSegments('abc', result.matches);
    expect(segments).toEqual([
      { text: 'a', matchIndex: null, start: 0 },
      { text: 'b', matchIndex: 0, start: 1 },
      { text: 'c', matchIndex: null, start: 2 },
    ]);
  });

  it('keeps leading and trailing plain text when nothing matches', () => {
    const segments = highlightSegments('hello', []);
    expect(segments).toEqual([{ text: 'hello', matchIndex: null, start: 0 }]);
  });

  it('ignores zero-width matches in the segment list', () => {
    const result = evaluateRegex('\\b', ['g'], 'hi');
    const segments = highlightSegments('hi', result.matches);
    expect(segments).toEqual([{ text: 'hi', matchIndex: null, start: 0 }]);
  });

  it('covers the full text exactly once for adjacent matches', () => {
    const result = evaluateRegex('ab', ['g'], 'ababab');
    const segments = highlightSegments('ababab', result.matches);
    expect(segments.map((segment) => segment.text).join('')).toBe('ababab');
    expect(segments.filter((segment) => segment.matchIndex === null)).toHaveLength(0);
  });
});

describe('zeroWidthPositions', () => {
  it('lists only the offsets of zero-width matches', () => {
    const result = evaluateRegex('\\b|\\d+', ['g'], 'a 12');
    const positions = zeroWidthPositions(result.matches);
    expect(positions.length).toBeGreaterThan(0);
    expect(positions.every((position) => typeof position === 'number')).toBe(true);
  });
});

describe('flagsToString', () => {
  it('orders flags canonically', () => {
    expect(flagsToString(['u', 'g', 's'])).toBe('gsu');
    expect(flagsToString([])).toBe('');
  });
});
