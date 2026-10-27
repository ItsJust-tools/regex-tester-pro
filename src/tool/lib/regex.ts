import {
  MAX_MATCHES,
  MAX_PATTERN_LENGTH,
  MAX_TEST_TEXT_LENGTH,
  REGEX_FLAGS,
  type RegexFlag,
} from '../types';

/** Result of compiling a pattern, mirroring `deserialize`'s success/error shape. */
export type CompileResult =
  | { ok: true; regex: RegExp; source: string; flags: string; indexed: boolean }
  | { ok: false; error: string };

/** One capture slot inside a match. Index 0 is always the full match. */
export interface CaptureGroup {
  /** 1-based group number; 0 is the whole match. */
  index: number;
  /** Name from `(?<name>…)`, or null for unnamed groups. */
  name: string | null;
  /** Matched text, or null when the group did not participate. */
  value: string | null;
  /** Offset of the group within the test string, when indices are available. */
  start: number | null;
  end: number | null;
}

/** A single match with its capture-group breakdown. */
export interface RegexMatch {
  /** 0-based offset in the test string. */
  index: number;
  end: number;
  value: string;
  /** True for `^`, `$`, `\b` and other zero-width matches. */
  zeroWidth: boolean;
  /** True when this match overlaps the previous one (lookahead captures). */
  overlapsPrevious: boolean;
  groups: CaptureGroup[];
}

/** Aggregate statistics for one evaluation. */
export interface RegexStats {
  matches: number;
  groups: number;
  participatingGroups: number;
  zeroWidthMatches: number;
  charactersMatched: number;
  textLength: number;
  coverage: number;
}

/** Outcome of running a pattern against a test string. */
export interface RegexEvaluation {
  status: 'empty' | 'invalid' | 'ok';
  /** Present only when status is "invalid". */
  error: string | null;
  matches: RegexMatch[];
  /** True when evaluation stopped at MAX_MATCHES. */
  truncated: boolean;
  durationMs: number;
  stats: RegexStats;
  /** The compiled flag string, e.g. "gim". Empty when invalid. */
  flagString: string;
}

/** A contiguous run of the test string, either a match or plain text. */
export interface HighlightSegment {
  text: string;
  /** Index into `evaluation.matches`, or null for unmatched text. */
  matchIndex: number | null;
  start: number;
}

const EMPTY_STATS: RegexStats = {
  matches: 0,
  groups: 0,
  participatingGroups: 0,
  zeroWidthMatches: 0,
  charactersMatched: 0,
  textLength: 0,
  coverage: 0,
};

/** Normalize flags into canonical order and drop duplicates. */
export function normalizeFlags(flags: readonly string[]): RegexFlag[] {
  return REGEX_FLAGS.filter((flag) => flags.includes(flag));
}

/** Ordered, de-duplicated flag string such as "gi". */
export function flagsToString(flags: readonly RegexFlag[]): string {
  return normalizeFlags(flags).join('');
}

/** Toggle one flag, keeping canonical order. */
export function toggleFlag(flags: readonly RegexFlag[], flag: RegexFlag): RegexFlag[] {
  const set = new Set(flags);
  if (set.has(flag)) set.delete(flag);
  else set.add(flag);
  return normalizeFlags([...set]);
}

/**
 * Parse capture-group openers in source order.
 * Handles escapes, character classes, and non-capturing/lookaround groups.
 */
export function listCaptureGroups(pattern: string): Array<{ index: number; name: string | null }> {
  const groups: Array<{ index: number; name: string | null }> = [];
  let inClass = false;
  let escaped = false;
  let groupIndex = 0;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (inClass) {
      if (char === ']') inClass = false;
      continue;
    }
    if (char === '[') {
      inClass = true;
      continue;
    }
    if (char !== '(') continue;
    if (pattern[i + 1] !== '?') {
      groupIndex += 1;
      groups.push({ index: groupIndex, name: null });
      continue;
    }
    // (?<name>…) is capturing; (?<=…) and (?<!…) are lookbehind assertions.
    if (pattern[i + 2] === '<' && pattern[i + 3] !== '=' && pattern[i + 3] !== '!') {
      const close = pattern.indexOf('>', i + 3);
      if (close !== -1) {
        groupIndex += 1;
        groups.push({ index: groupIndex, name: pattern.slice(i + 3, close) || null });
      }
    }
  }

  return groups;
}

/** Compile a pattern, returning a structured error instead of throwing. */
export function compileRegex(pattern: string, flags: readonly RegexFlag[]): CompileResult {
  const source = pattern;
  const flagString = flagsToString(flags);

  if (source.length > MAX_PATTERN_LENGTH) {
    return {
      ok: false,
      error: `Pattern is longer than ${MAX_PATTERN_LENGTH} characters`,
    };
  }

  try {
    // The "d" flag adds match indices without changing what matches.
    return {
      ok: true,
      regex: new RegExp(source, `${flagString}d`),
      source,
      flags: flagString,
      indexed: true,
    };
  } catch (error) {
    const indexedError = error instanceof Error ? error.message : 'Invalid regular expression';
    try {
      return {
        ok: true,
        regex: new RegExp(source, flagString),
        source,
        flags: flagString,
        indexed: false,
      };
    } catch (fallbackError) {
      return {
        ok: false,
        error: fallbackError instanceof Error ? fallbackError.message : indexedError,
      };
    }
  }
}

function readIndices(match: RegExpExecArray): Array<[number, number] | undefined> | null {
  const indices = (match as { indices?: Array<[number, number] | undefined> }).indices;
  return Array.isArray(indices) ? indices : null;
}

/**
 * Build the capture-group breakdown for one match.
 * Groups that never participated (alternation, optional groups) report null.
 */
export function extractGroups(
  pattern: string,
  match: RegExpExecArray,
  indices: Array<[number, number] | undefined> | null
): CaptureGroup[] {
  const declared = listCaptureGroups(pattern);
  const groups: CaptureGroup[] = [];

  const whole = indices?.[0];
  groups.push({
    index: 0,
    name: null,
    value: match[0],
    start: whole ? whole[0] : match.index,
    end: whole ? whole[1] : match.index + match[0].length,
  });

  for (let i = 1; i < match.length; i++) {
    const declaredGroup = declared[i - 1];
    const span = indices?.[i];
    const raw = match[i];
    groups.push({
      index: i,
      name: declaredGroup?.name ?? null,
      value: typeof raw === 'string' ? raw : null,
      start: span ? span[0] : null,
      end: span ? span[1] : null,
    });
  }

  return groups;
}

function emptyEvaluation(
  status: RegexEvaluation['status'],
  flagString: string,
  textLength: number
): RegexEvaluation {
  return {
    status,
    error: null,
    matches: [],
    truncated: false,
    durationMs: 0,
    flagString,
    stats: { ...EMPTY_STATS, textLength },
  };
}

/**
 * Run a pattern against the test string, collecting every match plus metrics.
 * Never throws: invalid patterns and oversized inputs return a status instead.
 */
export function evaluateRegex(
  pattern: string,
  flags: readonly RegexFlag[],
  text: string
): RegexEvaluation {
  const flagString = flagsToString(flags);
  const textLength = Math.min(text.length, MAX_TEST_TEXT_LENGTH);
  const subject = text.length > MAX_TEST_TEXT_LENGTH ? text.slice(0, MAX_TEST_TEXT_LENGTH) : text;

  if (pattern === '') return emptyEvaluation('empty', flagString, textLength);

  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) {
    return { ...emptyEvaluation('invalid', flagString, textLength), error: compiled.error };
  }

  const { regex } = compiled;
  const matches: RegexMatch[] = [];
  let truncated = false;

  const started = now();

  if (!regex.global) {
    const single = regex.exec(subject);
    if (single) matches.push(toMatch(pattern, single, single.index));
  } else {
    let previousIndex = -1;
    let previousEnd = -1;
    let guard = 0;
    let current = regex.exec(subject);

    while (current) {
      const matchIndex = current.index;
      matches.push({
        ...toMatch(pattern, current, matchIndex),
        overlapsPrevious: previousIndex >= 0 && matchIndex < previousEnd,
      });
      previousIndex = matchIndex;
      previousEnd = matchIndex + current[0].length;

      if (matches.length >= MAX_MATCHES) {
        truncated = regex.lastIndex < subject.length;
        break;
      }

      if (current[0].length === 0) {
        // Zero-width match: bump lastIndex so the loop always advances.
        regex.lastIndex += 1;
        if (regex.lastIndex > subject.length) break;
      }

      guard += 1;
      if (guard > MAX_MATCHES * 4) break;
      current = regex.exec(subject);
    }
  }

  const durationMs = round(now() - started);
  const stats = summarize(matches, textLength);

  return {
    status: 'ok',
    error: null,
    matches,
    truncated,
    durationMs,
    flagString,
    stats,
  };
}

function toMatch(pattern: string, match: RegExpExecArray, index: number): RegexMatch {
  const indices = readIndices(match);
  const whole = indices?.[0];
  const start = whole ? whole[0] : index;
  const end = whole ? whole[1] : index + match[0].length;
  return {
    index: start,
    end,
    value: match[0],
    zeroWidth: start === end,
    overlapsPrevious: false,
    groups: extractGroups(pattern, match, indices),
  };
}

function summarize(matches: RegexMatch[], textLength: number): RegexStats {
  let groups = 0;
  let participatingGroups = 0;
  let zeroWidthMatches = 0;
  let charactersMatched = 0;

  for (const match of matches) {
    groups += Math.max(0, match.groups.length - 1);
    for (const group of match.groups) {
      if (group.index > 0 && group.value !== null) participatingGroups += 1;
    }
    if (match.zeroWidth) zeroWidthMatches += 1;
    charactersMatched += Math.max(0, match.end - match.index);
  }

  return {
    matches: matches.length,
    groups,
    participatingGroups,
    zeroWidthMatches,
    charactersMatched,
    textLength,
    coverage: textLength === 0 ? 0 : Math.min(1, charactersMatched / textLength),
  };
}

/**
 * Split the test string into plain and matched runs for highlighting.
 * Overlapping matches restart the segment at the overlapping offset.
 */
export function highlightSegments(
  text: string,
  matches: readonly RegexMatch[]
): HighlightSegment[] {
  if (text === '') return [];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  matches.forEach((match, matchIndex) => {
    if (match.zeroWidth) return;
    const start = Math.max(0, Math.min(match.index, text.length));
    const end = Math.max(start, Math.min(match.end, text.length));
    if (end <= cursor) return;
    if (start > cursor) {
      segments.push({
        text: text.slice(cursor, start),
        matchIndex: null,
        start: cursor,
      });
    }
    segments.push({
      text: text.slice(start, end),
      matchIndex,
      start,
    });
    cursor = end;
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matchIndex: null, start: cursor });
  }

  return segments;
}

/** Ordered 1-based pair list for highlighting zero-width matches on their own line. */
export function zeroWidthPositions(matches: readonly RegexMatch[]): number[] {
  return matches.filter((match) => match.zeroWidth).map((match) => match.index);
}

function now(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
