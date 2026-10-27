import type { Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  MAX_HISTORY_ENTRIES,
  MAX_PATTERN_LENGTH,
  MAX_SAVED_PATTERNS,
  MAX_TEST_TEXT_LENGTH,
  REGEX_FLAGS,
  type HistoryEntry,
  type RegexFlag,
  type RegexState,
  type SavedPattern,
} from './types';
import { normalizeFlags } from './lib/regex';

type DeserializeResult<T> = { success: true; data: T } | { success: false; error: string };

/** Default state: a working demo so the canvas is never empty on first load. */
export const initialRegexState: RegexState = {
  pattern: '\\b\\w+@\\w+\\.\\w{2,}\\b',
  flags: ['g', 'i'],
  testText: [
    'Contact us at hello@itsjust.tools for support.',
    'Sales: sales@example.com — press: press@example.co.uk',
    'Broken: not-an-email@ and @nope.com',
  ].join('\n'),
  cheatSheetQuery: '',
  savedPatterns: [],
  history: [],
};

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function isFlag(value: unknown): value is RegexFlag {
  return typeof value === 'string' && (REGEX_FLAGS as readonly string[]).includes(value);
}

function isSavedPattern(value: unknown): value is SavedPattern {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.pattern === 'string' &&
    typeof v.createdAt === 'string' &&
    Array.isArray(v.flags) &&
    v.flags.every(isFlag)
  );
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.pattern === 'string' &&
    typeof v.matchCount === 'number' &&
    typeof v.durationMs === 'number' &&
    typeof v.at === 'string' &&
    Array.isArray(v.flags) &&
    v.flags.every(isFlag)
  );
}

/**
 * Validate and normalize imported or shared state.
 * Optional fields fall back to defaults so older payloads keep working.
 */
export function normalizeRegexState(data: unknown): DeserializeResult<RegexState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { success: false, error: 'Invalid data format: expected a JSON object' };
  }
  const value = data as Record<string, unknown>;

  if (typeof value.pattern !== 'string') {
    return { success: false, error: 'Invalid data format: "pattern" must be a string' };
  }
  if (typeof value.testText !== 'string') {
    return { success: false, error: 'Invalid data format: "testText" must be a string' };
  }

  const rawFlags = value.flags ?? initialRegexState.flags;
  if (!Array.isArray(rawFlags) || !rawFlags.every(isFlag)) {
    return {
      success: false,
      error: 'Invalid data format: "flags" must be an array of "g", "i", "m", "s", "u"',
    };
  }

  const cheatSheetQuery = value.cheatSheetQuery ?? '';
  if (typeof cheatSheetQuery !== 'string') {
    return { success: false, error: 'Invalid data format: "cheatSheetQuery" must be a string' };
  }

  const rawSaved = value.savedPatterns ?? [];
  if (!Array.isArray(rawSaved) || !rawSaved.every(isSavedPattern)) {
    return {
      success: false,
      error: 'Invalid data format: "savedPatterns" must be an array of patterns',
    };
  }

  const rawHistory = value.history ?? [];
  if (!Array.isArray(rawHistory) || !rawHistory.every(isHistoryEntry)) {
    return { success: false, error: 'Invalid data format: "history" must be an array of entries' };
  }

  return {
    success: true,
    data: {
      pattern: clamp(value.pattern, MAX_PATTERN_LENGTH),
      testText: clamp(value.testText, MAX_TEST_TEXT_LENGTH),
      flags: normalizeFlags(rawFlags),
      cheatSheetQuery,
      savedPatterns: rawSaved.slice(0, MAX_SAVED_PATTERNS).map((entry) => ({
        ...entry,
        pattern: clamp(entry.pattern, MAX_PATTERN_LENGTH),
        flags: normalizeFlags(entry.flags),
      })),
      history: rawHistory.slice(0, MAX_HISTORY_ENTRIES).map((entry) => ({
        ...entry,
        flags: normalizeFlags(entry.flags),
      })),
    },
  };
}

export const regexTool: Tool<RegexState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: initialRegexState,
  serialize: (state) => JSON.stringify(state, null, 2),
  deserialize: (data) => normalizeRegexState(data),
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
