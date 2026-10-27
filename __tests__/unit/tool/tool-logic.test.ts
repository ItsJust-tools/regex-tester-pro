import { describe, it, expect } from 'vitest';
import { createMockToolState } from '@itsjust/core/testing';
import { initialRegexState, normalizeRegexState, regexTool } from '@/tool/tool-definition';
import {
  MAX_HISTORY_ENTRIES,
  MAX_PATTERN_LENGTH,
  MAX_SAVED_PATTERNS,
  MAX_TEST_TEXT_LENGTH,
  type RegexState,
} from '@/tool/types';
import { toggleFlag, normalizeFlags } from '@/tool/lib/regex';

function makeState(overrides: Partial<RegexState> = {}): RegexState {
  return { ...initialRegexState, ...overrides };
}

describe('regex tool state', () => {
  it('initializes with a working demo pattern', () => {
    const state = createMockToolState<RegexState>(initialRegexState);
    expect(state.data.pattern).toBe(initialRegexState.pattern);
    expect(state.data.flags).toEqual(['g', 'i']);
    expect(state.data.testText.length).toBeGreaterThan(0);
    expect(state.data.savedPatterns).toEqual([]);
    expect(state.data.history).toEqual([]);
  });

  it('updates the pattern and test text', () => {
    const state = createMockToolState<RegexState>(initialRegexState);
    state.setData((prev) => ({ ...prev, pattern: '\\d+' }));
    expect(state.data.pattern).toBe('\\d+');

    state.setData((prev) => ({ ...prev, testText: 'abc 123' }));
    expect(state.data.testText).toBe('abc 123');
  });

  it('toggles flags while preserving canonical order', () => {
    const state = createMockToolState<RegexState>(initialRegexState);
    state.setData((prev) => ({ ...prev, flags: toggleFlag(prev.flags, 'm') }));
    expect(state.data.flags).toEqual(['g', 'i', 'm']);

    state.setData((prev) => ({ ...prev, flags: toggleFlag(prev.flags, 'g') }));
    expect(state.data.flags).toEqual(['i', 'm']);
  });

  it('adds saved patterns and history entries', () => {
    const state = createMockToolState<RegexState>(initialRegexState);
    state.setData((prev) => ({
      ...prev,
      savedPatterns: [
        {
          id: 'saved-1',
          label: 'digits',
          pattern: '\\d+',
          flags: ['g'],
          createdAt: '2026-10-27T10:00:00.000Z',
        },
      ],
      history: [
        {
          id: 'hist-1',
          pattern: '\\d+',
          flags: ['g'],
          matchCount: 2,
          durationMs: 0.5,
          at: '2026-10-27T10:00:00.000Z',
        },
      ],
    }));

    expect(state.data.savedPatterns).toHaveLength(1);
    expect(state.data.history).toHaveLength(1);
    expect(state.data.savedPatterns[0]?.label).toBe('digits');
  });

  it('supports undo and redo across state changes', () => {
    const state = createMockToolState<RegexState>(makeState({ pattern: 'a' }));
    state.setData((prev) => ({ ...prev, pattern: 'b' }));
    expect(state.data.pattern).toBe('b');
    expect(state.canUndo).toBe(true);

    state.undo();
    expect(state.data.pattern).toBe('a');
    expect(state.canRedo).toBe(true);

    state.redo();
    expect(state.data.pattern).toBe('b');
  });
});

describe('regex tool deserialize', () => {
  it('accepts a complete valid state', () => {
    const payload = makeState({ pattern: '\\w+', cheatSheetQuery: 'digit' });
    const result = regexTool.deserialize(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pattern).toBe('\\w+');
      expect(result.data.cheatSheetQuery).toBe('digit');
      expect(result.data.flags).toEqual(['g', 'i']);
    }
  });

  it('rejects null, arrays, and primitives', () => {
    for (const value of [null, [], 'string', 42, undefined]) {
      const result = regexTool.deserialize(value);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects an object without a pattern', () => {
    const result = regexTool.deserialize({ testText: 'hello' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('"pattern"');
  });

  it('rejects a non-string test string', () => {
    const result = regexTool.deserialize({ pattern: 'a', testText: 12 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('"testText"');
  });

  it('rejects unknown flags', () => {
    const result = regexTool.deserialize({ pattern: 'a', testText: '', flags: ['g', 'x'] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('"flags"');
  });

  it('rejects malformed saved patterns and history', () => {
    expect(
      regexTool.deserialize({ pattern: 'a', testText: '', savedPatterns: [{ id: 1 }] }).success
    ).toBe(false);
    expect(
      regexTool.deserialize({ pattern: 'a', testText: '', history: [{ id: 'x' }] }).success
    ).toBe(false);
  });

  it('defaults optional fields and de-duplicates flags', () => {
    const result = regexTool.deserialize({
      pattern: 'a',
      testText: '',
      flags: ['u', 'g', 'u', 'i'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flags).toEqual(['g', 'i', 'u']);
      expect(result.data.savedPatterns).toEqual([]);
      expect(result.data.history).toEqual([]);
      expect(result.data.cheatSheetQuery).toBe('');
    }
  });

  it('clamps oversized pattern and test text', () => {
    const result = normalizeRegexState({
      pattern: 'a'.repeat(MAX_PATTERN_LENGTH + 50),
      testText: 'b'.repeat(MAX_TEST_TEXT_LENGTH + 50),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pattern).toHaveLength(MAX_PATTERN_LENGTH);
      expect(result.data.testText).toHaveLength(MAX_TEST_TEXT_LENGTH);
    }
  });

  it('caps saved patterns and history entries', () => {
    const savedPatterns = Array.from({ length: MAX_SAVED_PATTERNS + 10 }, (_, index) => ({
      id: `s-${index}`,
      label: `p${index}`,
      pattern: 'a',
      flags: ['g'],
      createdAt: '2026-10-27T10:00:00.000Z',
    }));
    const history = Array.from({ length: MAX_HISTORY_ENTRIES + 10 }, (_, index) => ({
      id: `h-${index}`,
      pattern: 'a',
      flags: ['g'],
      matchCount: index,
      durationMs: 0.1,
      at: '2026-10-27T10:00:00.000Z',
    }));

    const result = regexTool.deserialize({ pattern: 'a', testText: '', savedPatterns, history });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.savedPatterns).toHaveLength(MAX_SAVED_PATTERNS);
      expect(result.data.history).toHaveLength(MAX_HISTORY_ENTRIES);
    }
  });

  it('serializes state to round-trippable JSON', () => {
    const state = makeState({ pattern: '(?<year>\\d{4})', flags: ['g', 'u'] });
    const json = regexTool.serialize(state);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual(state);

    const roundTrip = regexTool.deserialize(JSON.parse(json));
    expect(roundTrip.success).toBe(true);
    if (roundTrip.success) expect(roundTrip.data.pattern).toBe(state.pattern);
  });

  it('exposes the four canvas exporters', () => {
    const formats = (regexTool.exporters ?? []).map((exporter) => exporter.format);
    expect(formats).toEqual(['png', 'jpeg', 'webp', 'pdf']);
  });
});

describe('flag helpers', () => {
  it('normalizes arbitrary flag lists', () => {
    expect(normalizeFlags(['u', 'g', 'zzz', 'g'])).toEqual(['g', 'u']);
    expect(normalizeFlags([])).toEqual([]);
  });

  it('toggles flags on and off', () => {
    expect(toggleFlag([], 'g')).toEqual(['g']);
    expect(toggleFlag(['g'], 'g')).toEqual([]);
    expect(toggleFlag(['s'], 'g')).toEqual(['g', 's']);
  });
});
