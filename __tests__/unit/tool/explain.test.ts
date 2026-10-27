import { describe, it, expect } from 'vitest';
import { explainPattern, summarizePattern } from '@/tool/lib/explain';

function describeAll(pattern: string): string[] {
  return explainPattern(pattern).map((step) => `${step.token}:${step.label}`);
}

describe('explainPattern', () => {
  it('returns nothing for an empty pattern', () => {
    expect(explainPattern('')).toEqual([]);
  });

  it('explains literal characters', () => {
    const steps = explainPattern('abc');
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({
      token: 'abc',
      label: 'Literal text',
      depth: 0,
    });
  });

  it('explains a single literal character', () => {
    const steps = explainPattern('a1');
    expect(steps.map((step) => step.token)).toEqual(['a1']);
    expect(steps[0]?.label).toBe('Literal text');
  });

  it('explains character classes and escapes', () => {
    const labels = describeAll('\\d+\\s\\w');
    expect(labels[0]).toContain('Digit');
    expect(labels[1]).toContain('One or more');
    expect(labels[2]).toContain('Whitespace');
    expect(labels[3]).toContain('Word character');
  });

  it('explains negated and unicode escapes', () => {
    expect(describeAll('\\D')[0]).toContain('Non-digit');
    expect(describeAll('\\p{L}')[0]).toContain('Unicode property');
    expect(describeAll('\\p{L}')[0]).toContain('\\p{L}');
  });

  it('explains anchored and quantified tokens', () => {
    const labels = describeAll('^ab*$');
    expect(labels).toEqual(['^:Start anchor', 'ab:Literal text', '*:Zero or more', '$:End anchor']);
  });

  it('explains lazy quantifiers', () => {
    const steps = explainPattern('a+?');
    expect(steps[1]?.token).toBe('+?');
    expect(steps[1]?.description).toContain('fewest');
  });

  it('explains exact and ranged counts', () => {
    expect(describeAll('\\d{3}')).toContain('{3}:Exactly 3');
    expect(describeAll('\\d{2,5}')).toContain('{2,5}:Between 2 and 5');
    expect(describeAll('\\d{2,}')).toContain('{2,}:At least 2');
    expect(describeAll('a{1,3}?')).toContain('{1,3}?:Between 1 and 3');
  });

  it('explains capturing, non-capturing, and named groups with depth', () => {
    const capturing = explainPattern('(a)');
    expect(capturing[0]).toMatchObject({ token: '(', label: 'Capturing group', depth: 0 });
    expect(capturing[1]?.depth).toBe(1);
    expect(capturing[2]).toMatchObject({ token: ')', label: 'End group', depth: 0 });

    const nonCapturing = explainPattern('(?:ab)');
    expect(nonCapturing[0]).toMatchObject({ label: 'Non-capturing group', depth: 0 });
    expect(nonCapturing[1]?.depth).toBe(0);

    const named = explainPattern('(?<year>\\d)');
    expect(named[0]?.label).toContain('year');
    expect(named[1]?.depth).toBe(1);
  });

  it('explains lookarounds', () => {
    expect(explainPattern('(?=a)')[0]?.label).toBe('Positive lookahead');
    expect(explainPattern('(?!a)')[0]?.label).toBe('Negative lookahead');
    expect(explainPattern('(?<=a)')[0]?.label).toBe('Positive lookbehind');
    expect(explainPattern('(?<!a)')[0]?.label).toBe('Negative lookbehind');
  });

  it('explains character sets and negated sets', () => {
    const set = explainPattern('[aeiou]');
    expect(set[0]?.token).toBe('[aeiou]');
    expect(set[0]?.description).toContain('listed set');

    const negated = explainPattern('[^0-9]');
    expect(negated[0]?.token).toBe('[^0-9]');
    expect(negated[0]?.description).toContain('not in the listed set');
  });

  it('explains an unterminated character class', () => {
    const steps = explainPattern('[abc');
    expect(steps[0]?.token).toBe('[abc');
  });

  it('explains backreferences and named backreferences', () => {
    expect(describeAll('\\1')).toContain('\\1:Backreference \\1');
    const labels = describeAll('(?<x>a)\\k<x>');
    expect(labels[0]).toContain('Named group');
    expect(labels.some((label) => label.includes('Named backreference'))).toBe(true);
  });

  it('explains alternation and dots', () => {
    const labels = describeAll('a|.');
    expect(labels).toContain('|:Alternation');
    expect(labels).toContain('.:Any character');
  });

  it('explains whitespace tokens without dropping them', () => {
    const steps = explainPattern('a b');
    expect(steps.some((step) => step.label === 'Whitespace')).toBe(true);
  });

  it('tolerates unbalanced closing parentheses', () => {
    const steps = explainPattern('a)');
    expect(steps[steps.length - 1]).toMatchObject({ token: ')', depth: 0 });
  });

  it('records monotonic token offsets', () => {
    const steps = explainPattern('(\\d{2})[a-z]+');
    const starts = steps.map((step) => step.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it('explains a literal opening brace without a closing brace', () => {
    const steps = explainPattern('a{b');
    expect(steps.some((step) => step.token === '{')).toBe(true);
  });
});

describe('summarizePattern', () => {
  it('describes an empty pattern', () => {
    expect(summarizePattern('')).toBe('Empty pattern');
  });

  it('counts tokens and groups', () => {
    expect(summarizePattern('(a)(b)')).toContain('2 groups');
    expect(summarizePattern('(a)')).toContain('1 group');
    expect(summarizePattern('abc')).toContain('tokens');
  });
});
