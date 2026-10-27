import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CHEAT_SHEET,
  filterCheatSheet,
  groupCheatSheet,
  type CheatSheetEntry,
} from '@/tool/lib/cheat-sheet';
import { SAMPLES, findSample } from '@/tool/lib/samples';
import { buildReport, reportToJson, reportToMarkdown } from '@/tool/lib/report';
import { downloadTextFile, reportFilename } from '@/tool/lib/download';
import { evaluateRegex } from '@/tool/lib/regex';
import { initialRegexState } from '@/tool/tool-definition';
import type { RegexState } from '@/tool/types';

describe('cheat sheet data', () => {
  it('exposes unique ids and tokens', () => {
    const ids = CHEAT_SHEET.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CHEAT_SHEET.length).toBeGreaterThan(20);
  });

  it('every entry has a category, example, and description', () => {
    for (const entry of CHEAT_SHEET) {
      expect(entry.category).toBeTruthy();
      expect(entry.example).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.token).toBeTruthy();
    }
  });
});

describe('filterCheatSheet', () => {
  it('returns every entry for a blank query', () => {
    expect(filterCheatSheet('')).toHaveLength(CHEAT_SHEET.length);
    expect(filterCheatSheet('   ')).toHaveLength(CHEAT_SHEET.length);
  });

  it('matches by token', () => {
    const result = filterCheatSheet('\\d');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((entry) => `${entry.token} ${entry.example}`.includes('\\d'))).toBe(true);
  });

  it('matches by label and description', () => {
    expect(
      filterCheatSheet('lookahead').every((entry) =>
        /lookahead/i.test(`${entry.label} ${entry.description}`)
      )
    ).toBe(true);
    expect(filterCheatSheet('whitespace').length).toBeGreaterThan(0);
  });

  it('matches by category', () => {
    const result = filterCheatSheet('quantifier');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((entry) => entry.category === 'Quantifiers')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(filterCheatSheet('DIGIT').length).toBe(filterCheatSheet('digit').length);
  });

  it('returns an empty list for nonsense queries', () => {
    expect(filterCheatSheet('zzzzz-nothing-here')).toEqual([]);
  });

  it('does not mutate the source list', () => {
    const before = CHEAT_SHEET.length;
    filterCheatSheet('digit');
    expect(CHEAT_SHEET.length).toBe(before);
  });
});

describe('groupCheatSheet', () => {
  it('groups in canonical category order', () => {
    const groups = groupCheatSheet(filterCheatSheet(''));
    const names = groups.map((group) => group.category);
    expect(names[0]).toBe('Character classes');
    expect(names[names.length - 1]).toBe('Flags');
  });

  it('drops empty categories', () => {
    const onlyFlags = groupCheatSheet(filterCheatSheet('dot all'));
    expect(onlyFlags).toHaveLength(1);
    expect(onlyFlags[0]?.category).toBe('Flags');
  });

  it('returns no groups for an empty entry list', () => {
    expect(groupCheatSheet([])).toEqual([]);
  });

  it('keeps every filtered entry exactly once', () => {
    const entries: CheatSheetEntry[] = filterCheatSheet('');
    const total = groupCheatSheet(entries).reduce((sum, group) => sum + group.entries.length, 0);
    expect(total).toBe(entries.length);
  });
});

describe('samples', () => {
  it('has unique ids and non-empty text', () => {
    const ids = SAMPLES.map((sample) => sample.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sample of SAMPLES) {
      expect(sample.text.length).toBeGreaterThan(0);
      expect(sample.pattern.length).toBeGreaterThan(0);
      expect(sample.flags.length).toBeGreaterThan(0);
    }
  });

  it('every sample pattern compiles and matches its own text', () => {
    for (const sample of SAMPLES) {
      const result = evaluateRegex(sample.pattern, sample.flags as never, sample.text);
      expect(result.status, `${sample.id} should compile`).toBe('ok');
      expect(result.stats.matches, `${sample.id} should match`).toBeGreaterThan(0);
    }
  });

  it('finds a sample by id and returns undefined otherwise', () => {
    expect(findSample('email')?.id).toBe('email');
    expect(findSample('nope')).toBeUndefined();
  });
});

describe('report', () => {
  const state: RegexState = {
    ...initialRegexState,
    pattern: '(?<word>\\w+)@(\\w+)\\.com',
    flags: ['g', 'i'],
    testText: 'ada@example.com and grace@navy.com',
  };

  it('builds a report from an evaluation', () => {
    const evaluation = evaluateRegex(state.pattern, state.flags, state.testText);
    const report = buildReport(state, evaluation, {
      tool: 'Regex Tester Pro',
      version: '1.0.0',
      now: new Date('2026-10-27T10:00:00.000Z'),
    });

    expect(report.tool).toBe('Regex Tester Pro');
    expect(report.flags).toBe('gi');
    expect(report.generatedAt).toBe('2026-10-27T10:00:00.000Z');
    expect(report.matches).toHaveLength(2);
    expect(report.matches[0]?.groups[1]?.name).toBe('word');
    expect(report.matches[0]?.groups[1]?.value).toBe('ada');
    expect(report.explanation.length).toBeGreaterThan(0);
    expect(report.stats.matches).toBe(2);
  });

  it('serializes JSON with the documented keys', () => {
    const evaluation = evaluateRegex(state.pattern, state.flags, state.testText);
    const report = buildReport(state, evaluation, { tool: 'T', version: '1' });
    const parsed = JSON.parse(reportToJson(report)) as Record<string, unknown>;
    expect(parsed).toHaveProperty('pattern');
    expect(parsed).toHaveProperty('matches');
    expect(parsed).toHaveProperty('explanation');
    expect(parsed).toHaveProperty('stats');
  });

  it('serializes Markdown with a match table', () => {
    const evaluation = evaluateRegex(state.pattern, state.flags, state.testText);
    const markdown = reportToMarkdown(buildReport(state, evaluation, { tool: 'T', version: '1' }));
    expect(markdown).toContain('# T report');
    expect(markdown).toContain('## Summary');
    expect(markdown).toContain('| # | Offset | Match | Groups |');
    expect(markdown).toContain('## Explanation');
    expect(markdown).toContain('## Test string');
  });

  it('marks an empty result set in Markdown', () => {
    const emptyState = { ...state, testText: 'nothing here' };
    const evaluation = evaluateRegex(emptyState.pattern, emptyState.flags, emptyState.testText);
    expect(
      reportToMarkdown(buildReport(emptyState, evaluation, { tool: 'T', version: '1' }))
    ).toContain('_No matches._');
  });

  it('includes the error text for an invalid pattern', () => {
    const broken = { ...state, pattern: '([a-z' };
    const evaluation = evaluateRegex(broken.pattern, broken.flags, broken.testText);
    const markdown = reportToMarkdown(buildReport(broken, evaluation, { tool: 'T', version: '1' }));
    expect(markdown).toContain('Status: invalid');
    expect(markdown).toContain('Error:');
  });

  it('escapes empty group values and pipes', () => {
    const piped = { ...state, pattern: '(a)|(b)', testText: 'a' };
    const evaluation = evaluateRegex(piped.pattern, ['g'], piped.testText);
    const markdown = reportToMarkdown(buildReport(piped, evaluation, { tool: 'T', version: '1' }));
    expect(markdown).toContain('∅');
  });
});

describe('download helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('creates and clicks an anchor for text payloads', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('a.json', '{}', 'application/json');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a')).toBeNull();
  });

  it('builds timestamped filenames for both formats', () => {
    const now = new Date('2026-10-27T10:11:12.000Z');
    expect(reportFilename('json', now)).toBe('regex-report-2026-10-27T10-11-12.json');
    expect(reportFilename('markdown', now)).toBe('regex-report-2026-10-27T10-11-12.md');
  });
});
