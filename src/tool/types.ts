/** Supported regular-expression flags. */
export type RegexFlag = 'g' | 'i' | 'm' | 's' | 'u';

/** Canonical flag order used for display, storage, and share URLs. */
export const REGEX_FLAGS: readonly RegexFlag[] = ['g', 'i', 'm', 's', 'u'];

/** Human-readable meaning of each flag. */
export const FLAG_INFO: Record<RegexFlag, { label: string; description: string }> = {
  g: { label: 'Global', description: 'Find every match, not just the first one' },
  i: { label: 'Ignore case', description: 'Match letters regardless of case' },
  m: { label: 'Multiline', description: '^ and $ match at the start and end of every line' },
  s: { label: 'Dot all', description: 'Let . match newline characters too' },
  u: { label: 'Unicode', description: 'Enable full Unicode matching and escapes' },
};

/** A pattern the user explicitly saved, including its flags. */
export interface SavedPattern {
  id: string;
  label: string;
  pattern: string;
  flags: RegexFlag[];
  createdAt: string;
}

/** A completed evaluation stored in the match history. */
export interface HistoryEntry {
  id: string;
  pattern: string;
  flags: RegexFlag[];
  matchCount: number;
  durationMs: number;
  at: string;
}

/**
 * Serializable state of the regex tester.
 * Every field is plain JSON so the session can be exported, imported, and shared.
 */
export interface RegexState {
  /** The regular expression source, without delimiters. */
  pattern: string;
  /** Enabled flags, stored in canonical order. */
  flags: RegexFlag[];
  /** The text the pattern is tested against. */
  testText: string;
  /** Free-text filter for the cheat sheet. */
  cheatSheetQuery: string;
  /** Patterns the user pinned for later. */
  savedPatterns: SavedPattern[];
  /** Most recent evaluations, newest first. */
  history: HistoryEntry[];
}

/** Callbacks shared by the canvas, toolbar, and sidebar. */
export interface RegexActions {
  setPattern: (pattern: string) => void;
  setTestText: (text: string) => void;
  toggleFlag: (flag: RegexFlag) => void;
  setCheatSheetQuery: (query: string) => void;
  loadSample: (id: string) => void;
  saveCurrentPattern: (label: string) => void;
  loadSavedPattern: (id: string) => void;
  deleteSavedPattern: (id: string) => void;
  restoreHistory: (id: string) => void;
  clearHistory: () => void;
  clearAll: () => void;
  exportReport: (format: 'json' | 'markdown') => void;
}

/** Maximum characters accepted in the pattern input. */
export const MAX_PATTERN_LENGTH = 500;

/** Maximum characters accepted in the test string. */
export const MAX_TEST_TEXT_LENGTH = 100_000;

/** Hard cap on evaluated matches, to keep the UI responsive. */
export const MAX_MATCHES = 2_000;

/** Hard cap on matches rendered in the canvas list. */
export const MAX_RENDERED_MATCHES = 200;

/** Maximum number of saved patterns kept in state. */
export const MAX_SAVED_PATTERNS = 30;

/** Maximum number of history entries kept in state. */
export const MAX_HISTORY_ENTRIES = 20;
