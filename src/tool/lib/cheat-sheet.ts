/** Cheat-sheet categories and entries for the regex reference panel. */

export type CheatSheetCategory =
  'Character classes' | 'Quantifiers' | 'Anchors' | 'Groups' | 'Lookaround' | 'Escapes' | 'Flags';

export interface CheatSheetEntry {
  id: string;
  token: string;
  label: string;
  description: string;
  example: string;
  category: CheatSheetCategory;
}

export const CHEAT_SHEET: readonly CheatSheetEntry[] = [
  {
    id: 'digit',
    token: '\\d',
    label: 'Digit',
    description: 'Any single digit from 0 to 9',
    example: '\\d+',
    category: 'Character classes',
  },
  {
    id: 'word',
    token: '\\w',
    label: 'Word character',
    description: 'Letters, digits, and underscore',
    example: '\\w+',
    category: 'Character classes',
  },
  {
    id: 'space',
    token: '\\s',
    label: 'Whitespace',
    description: 'Spaces, tabs, and line breaks',
    example: '\\s+',
    category: 'Character classes',
  },
  {
    id: 'any-char',
    token: '.',
    label: 'Any character',
    description: 'Any character except a newline (unless the s flag is on)',
    example: 'a.c',
    category: 'Character classes',
  },
  {
    id: 'set',
    token: '[abc]',
    label: 'Character set',
    description: 'One character from the listed set',
    example: '[aeiou]',
    category: 'Character classes',
  },
  {
    id: 'negated-set',
    token: '[^abc]',
    label: 'Negated set',
    description: 'One character that is not in the set',
    example: '[^0-9]',
    category: 'Character classes',
  },
  {
    id: 'range',
    token: '[a-z]',
    label: 'Range',
    description: 'One character inside the range',
    example: '[A-Za-z]',
    category: 'Character classes',
  },
  {
    id: 'star',
    token: '*',
    label: 'Zero or more',
    description: 'Repeat the previous token any number of times',
    example: 'ab*c',
    category: 'Quantifiers',
  },
  {
    id: 'plus',
    token: '+',
    label: 'One or more',
    description: 'Repeat the previous token at least once',
    example: 'ab+c',
    category: 'Quantifiers',
  },
  {
    id: 'optional',
    token: '?',
    label: 'Optional',
    description: 'Match zero or one occurrence',
    example: 'colou?r',
    category: 'Quantifiers',
  },
  {
    id: 'exact-count',
    token: '{3}',
    label: 'Exact count',
    description: 'Match exactly this many occurrences',
    example: '\\d{3}',
    category: 'Quantifiers',
  },
  {
    id: 'range-count',
    token: '{2,5}',
    label: 'Count range',
    description: 'Match between the minimum and maximum occurrences',
    example: '\\d{2,5}',
    category: 'Quantifiers',
  },
  {
    id: 'lazy',
    token: '*?',
    label: 'Lazy repeat',
    description: 'Match as few characters as possible',
    example: '<.+?>',
    category: 'Quantifiers',
  },
  {
    id: 'start',
    token: '^',
    label: 'Start of line',
    description: 'Anchor to the start of the string, or line with the m flag',
    example: '^Hello',
    category: 'Anchors',
  },
  {
    id: 'end',
    token: '$',
    label: 'End of line',
    description: 'Anchor to the end of the string, or line with the m flag',
    example: 'world$',
    category: 'Anchors',
  },
  {
    id: 'word-boundary',
    token: '\\b',
    label: 'Word boundary',
    description: 'Zero-width boundary between a word and a non-word character',
    example: '\\bcat\\b',
    category: 'Anchors',
  },
  {
    id: 'non-boundary',
    token: '\\B',
    label: 'Non-boundary',
    description: 'Position that is not a word boundary',
    example: '\\Bcat',
    category: 'Anchors',
  },
  {
    id: 'group',
    token: '(abc)',
    label: 'Capturing group',
    description: 'Group tokens and capture the matched text',
    example: '(\\d{4})-(\\d{2})',
    category: 'Groups',
  },
  {
    id: 'non-capturing',
    token: '(?:abc)',
    label: 'Non-capturing group',
    description: 'Group tokens without creating a capture slot',
    example: '(?:ab)+',
    category: 'Groups',
  },
  {
    id: 'named-group',
    token: '(?<name>abc)',
    label: 'Named group',
    description: 'Capturing group addressed by name',
    example: '(?<year>\\d{4})',
    category: 'Groups',
  },
  {
    id: 'alternation',
    token: 'a|b',
    label: 'Alternation',
    description: 'Match either the left or the right side',
    example: 'cat|dog',
    category: 'Groups',
  },
  {
    id: 'backreference',
    token: '\\1',
    label: 'Backreference',
    description: 'Match the same text as an earlier capture group',
    example: '(\\w+)\\s+\\1',
    category: 'Groups',
  },
  {
    id: 'lookahead',
    token: '(?=abc)',
    label: 'Positive lookahead',
    description: 'Assert that the following text matches, without consuming it',
    example: '\\d+(?= px)',
    category: 'Lookaround',
  },
  {
    id: 'neg-lookahead',
    token: '(?!abc)',
    label: 'Negative lookahead',
    description: 'Assert that the following text does not match',
    example: 'foo(?!bar)',
    category: 'Lookaround',
  },
  {
    id: 'lookbehind',
    token: '(?<=abc)',
    label: 'Positive lookbehind',
    description: 'Assert that the preceding text matches, without consuming it',
    example: '(?<=\\$)\\d+',
    category: 'Lookaround',
  },
  {
    id: 'neg-lookbehind',
    token: '(?<!abc)',
    label: 'Negative lookbehind',
    description: 'Assert that the preceding text does not match',
    example: '(?<!-)\\b\\d+',
    category: 'Lookaround',
  },
  {
    id: 'newline',
    token: '\\n',
    label: 'Newline',
    description: 'Match a line break',
    example: '^.*\\n',
    category: 'Escapes',
  },
  {
    id: 'tab',
    token: '\\t',
    label: 'Tab',
    description: 'Match a horizontal tab',
    example: '\\t',
    category: 'Escapes',
  },
  {
    id: 'literal-dot',
    token: '\\.',
    label: 'Literal dot',
    description: 'Escape a metacharacter so it matches itself',
    example: '\\d+\\.\\d+',
    category: 'Escapes',
  },
  {
    id: 'unicode-property',
    token: '\\p{L}',
    label: 'Unicode property',
    description: 'Match a Unicode class; requires the u flag',
    example: '\\p{L}+',
    category: 'Escapes',
  },
  {
    id: 'flag-global',
    token: 'g',
    label: 'Global',
    description: 'Find every match instead of stopping at the first',
    example: '/foo/g',
    category: 'Flags',
  },
  {
    id: 'flag-insensitive',
    token: 'i',
    label: 'Ignore case',
    description: 'Match letters regardless of case',
    example: '/foo/i',
    category: 'Flags',
  },
  {
    id: 'flag-multiline',
    token: 'm',
    label: 'Multiline',
    description: 'Make ^ and $ match at every line break',
    example: '/^foo/m',
    category: 'Flags',
  },
  {
    id: 'flag-dotall',
    token: 's',
    label: 'Dot all',
    description: 'Let . match newline characters',
    example: '/a.b/s',
    category: 'Flags',
  },
  {
    id: 'flag-unicode',
    token: 'u',
    label: 'Unicode',
    description: 'Enable full Unicode matching',
    example: '/\\p{L}/u',
    category: 'Flags',
  },
];

/** Filter entries by token, label, description, or category. */
export function filterCheatSheet(
  query: string,
  entries: readonly CheatSheetEntry[] = CHEAT_SHEET
): CheatSheetEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...entries];
  return entries.filter((entry) =>
    [entry.token, entry.label, entry.description, entry.category, entry.example]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  );
}

/** Group filtered entries by category, preserving canonical category order. */
export function groupCheatSheet(
  entries: readonly CheatSheetEntry[]
): Array<{ category: CheatSheetCategory; entries: CheatSheetEntry[] }> {
  const order: CheatSheetCategory[] = [
    'Character classes',
    'Quantifiers',
    'Anchors',
    'Groups',
    'Lookaround',
    'Escapes',
    'Flags',
  ];
  return order
    .map((category) => ({
      category,
      entries: entries.filter((entry) => entry.category === category),
    }))
    .filter((group) => group.entries.length > 0);
}
