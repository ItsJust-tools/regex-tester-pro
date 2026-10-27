/** Human-readable, token-by-token explanation of a regular expression. */

export interface ExplanationStep {
  /** Position of the token in the pattern source. */
  start: number;
  /** Raw token text as written. */
  token: string;
  /** Friendly name of the token. */
  label: string;
  /** What the token does. */
  description: string;
  /** Nesting depth, used to indent group contents. */
  depth: number;
}

const SIMPLE_TOKENS: Record<string, { label: string; description: string }> = {
  '.': { label: 'Any character', description: 'Matches any character except a line break' },
  '^': { label: 'Start anchor', description: 'Asserts the position at the start of the input' },
  $: { label: 'End anchor', description: 'Asserts the position at the end of the input' },
  '*': { label: 'Zero or more', description: 'Repeats the previous token any number of times' },
  '+': { label: 'One or more', description: 'Repeats the previous token at least once' },
  '?': { label: 'Optional', description: 'Matches the previous token zero or one time' },
  '|': { label: 'Alternation', description: 'Matches either the left or the right side' },
};

const CLASS_ESCAPES: Record<string, { label: string; description: string }> = {
  d: { label: 'Digit', description: 'Matches a digit from 0 to 9' },
  D: { label: 'Non-digit', description: 'Matches any character that is not a digit' },
  w: { label: 'Word character', description: 'Matches a letter, digit, or underscore' },
  W: {
    label: 'Non-word character',
    description: 'Matches anything outside letters, digits, and _',
  },
  s: { label: 'Whitespace', description: 'Matches spaces, tabs, and line breaks' },
  S: { label: 'Non-whitespace', description: 'Matches anything that is not whitespace' },
  b: { label: 'Word boundary', description: 'Asserts a boundary between word and non-word text' },
  B: { label: 'Non-boundary', description: 'Asserts a position that is not a word boundary' },
  n: { label: 'Newline', description: 'Matches a line feed character' },
  r: { label: 'Carriage return', description: 'Matches a carriage return character' },
  t: { label: 'Tab', description: 'Matches a horizontal tab' },
  p: {
    label: 'Unicode property',
    description: 'Matches a Unicode character class (needs the u flag)',
  },
  P: {
    label: 'Negated Unicode property',
    description: 'Matches outside a Unicode class (needs the u flag)',
  },
  k: { label: 'Named backreference', description: 'Matches the text captured by a named group' },
};

const GROUP_PREFIXES: Array<{ prefix: string; label: string; description: string }> = [
  {
    prefix: '(?<=',
    label: 'Positive lookbehind',
    description: 'Requires the preceding text to match',
  },
  {
    prefix: '(?<!',
    label: 'Negative lookbehind',
    description: 'Requires the preceding text not to match',
  },
  { prefix: '(?<', label: 'Named group', description: 'Captures the enclosed text under a name' },
  {
    prefix: '(?:',
    label: 'Non-capturing group',
    description: 'Groups tokens without capturing text',
  },
  {
    prefix: '(?=',
    label: 'Positive lookahead',
    description: 'Requires the following text to match',
  },
  {
    prefix: '(?!',
    label: 'Negative lookahead',
    description: 'Requires the following text not to match',
  },
];

function describeEscape(
  pattern: string,
  index: number
): { text: string; label: string; description: string } {
  const next = pattern[index + 1] ?? '';
  const known = CLASS_ESCAPES[next];
  let length = 2;

  // \p{Letter} and \p{L} style escapes
  if ((next === 'p' || next === 'P') && pattern[index + 2] === '{') {
    const close = pattern.indexOf('}', index + 3);
    if (close !== -1) length = close - index + 1;
  }
  // \k<name> backreferences
  if (next === 'k' && pattern[index + 2] === '<') {
    const close = pattern.indexOf('>', index + 3);
    if (close !== -1) length = close - index + 1;
  }

  const text = pattern.slice(index, index + length);
  if (known) return { text, label: known.label, description: known.description };
  if (/^[1-9]$/.test(next)) {
    return {
      text,
      label: `Backreference \\${next}`,
      description: `Matches the same text as capture group ${next}`,
    };
  }
  return {
    text,
    label: `Literal "${next}"`,
    description: `Matches the character "${next}" literally`,
  };
}

function describeGroup(
  pattern: string,
  index: number
): { text: string; label: string; description: string; depth: number } {
  for (const candidate of GROUP_PREFIXES) {
    if (pattern.startsWith(candidate.prefix, index)) {
      if (candidate.prefix === '(?<') {
        const close = pattern.indexOf('>', index + 3);
        const name = close === -1 ? '' : pattern.slice(index + 3, close);
        return {
          text: close === -1 ? '(?<' : pattern.slice(index, close + 1),
          label: name ? `Named group "${name}"` : 'Capturing group',
          description: name
            ? `Captures the enclosed text under the name "${name}"`
            : 'Groups tokens and captures the matched text',
          depth: 1,
        };
      }
      return {
        text: candidate.prefix,
        label: candidate.label,
        description: candidate.description,
        depth: 0,
      };
    }
  }
  return {
    text: '(',
    label: 'Capturing group',
    description: 'Groups tokens and captures the matched text',
    depth: 1,
  };
}

function describeClass(pattern: string, index: number): { text: string; description: string } {
  let end = index + 1;
  let escaped = false;
  while (end < pattern.length) {
    const char = pattern[end];
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === ']') {
      break;
    }
    end += 1;
  }
  const text = pattern.slice(index, Math.min(end + 1, pattern.length));
  const negated = pattern[index + 1] === '^';
  return {
    text,
    description: negated
      ? 'Matches one character that is not in the listed set'
      : 'Matches one character from the listed set',
  };
}

function describeQuantifier(
  pattern: string,
  index: number
): { text: string; label: string; description: string } {
  const close = pattern.indexOf('}', index + 1);
  if (close === -1) {
    return { text: '{', label: 'Literal "{"', description: 'Matches an opening brace literally' };
  }
  const text = pattern.slice(index, close + 1);
  const body = text.slice(1, -1);
  const lazy = pattern[close + 1] === '?';
  const suffix = lazy ? text + '?' : text;
  if (/^\d+$/.test(body)) {
    return {
      text: suffix,
      label: `Exactly ${body}`,
      description: `Repeats the previous token exactly ${body} times`,
    };
  }
  const parts = body.split(',');
  const min = parts[0] || '0';
  const max = parts[1];
  if (max === undefined) {
    return {
      text: suffix,
      label: `At least ${min}`,
      description: `Repeats the previous token ${min} or more times`,
    };
  }
  if (max === '') {
    return {
      text: suffix,
      label: `At least ${min}`,
      description: `Repeats the previous token ${min} or more times`,
    };
  }
  return {
    text: suffix,
    label: `Between ${min} and ${max}`,
    description: `Repeats the previous token between ${min} and ${max} times`,
  };
}

/**
 * Break a pattern into explainable tokens.
 * Unbalanced groups still produce output: every token is described as written.
 */
export function explainPattern(pattern: string): ExplanationStep[] {
  const steps: ExplanationStep[] = [];
  let index = 0;
  let depth = 0;

  while (index < pattern.length) {
    const char = pattern[index] ?? '';
    const start = index;

    if (char === '\\') {
      const escape = describeEscape(pattern, index);
      steps.push({
        start,
        token: escape.text,
        label: escape.label,
        description: escape.description,
        depth,
      });
      index += Math.max(2, escape.text.length);
      continue;
    }

    if (char === '[') {
      const cls = describeClass(pattern, index);
      steps.push({
        start,
        token: cls.text,
        label: 'Character set',
        description: cls.description,
        depth,
      });
      index += Math.max(1, cls.text.length);
      continue;
    }

    if (char === '(') {
      const group = describeGroup(pattern, index);
      steps.push({
        start,
        token: group.text,
        label: group.label,
        description: group.description,
        depth,
      });
      depth += group.depth;
      index += Math.max(1, group.text.length);
      continue;
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1);
      steps.push({
        start,
        token: ')',
        label: 'End group',
        description: 'Closes the current group',
        depth,
      });
      index += 1;
      continue;
    }

    if (char === '{') {
      const quantifier = describeQuantifier(pattern, index);
      steps.push({
        start,
        token: quantifier.text,
        label: quantifier.label,
        description: quantifier.description,
        depth,
      });
      index += Math.max(1, quantifier.text.length);
      continue;
    }

    if (char === '*' || char === '+' || char === '?') {
      const lazy = pattern[index + 1] === '?';
      const base = SIMPLE_TOKENS[char];
      const token = lazy ? `${char}?` : char;
      steps.push({
        start,
        token,
        label: base?.label ?? token,
        description: lazy
          ? `${base?.description ?? token}, preferring the fewest characters`
          : (base?.description ?? token),
        depth,
      });
      index += lazy ? 2 : 1;
      continue;
    }

    const simple = SIMPLE_TOKENS[char];
    if (simple) {
      steps.push({
        start,
        token: char,
        label: simple.label,
        description: simple.description,
        depth,
      });
      index += 1;
      continue;
    }

    if (/\s/.test(char)) {
      steps.push({
        start,
        token: char === ' ' ? '␠' : char,
        label: 'Whitespace',
        description: 'Matches a literal whitespace character',
        depth,
      });
      index += 1;
      continue;
    }

    // Merge a run of plain literal characters into one step.
    let end = index + 1;
    while (end < pattern.length) {
      const next = pattern[end] ?? '';
      if ('\\[(){}*+?|^$.'.includes(next) || /\s/.test(next)) break;
      end += 1;
    }
    const literal = pattern.slice(index, end);
    steps.push({
      start,
      token: literal,
      label: literal.length > 1 ? 'Literal text' : 'Literal character',
      description:
        literal.length > 1
          ? `Matches the exact text "${literal}"`
          : `Matches the character "${literal}" literally`,
      depth,
    });
    index = end;
  }

  return steps;
}

/** One-line summary of how many tokens and groups a pattern contains. */
export function summarizePattern(pattern: string): string {
  const steps = explainPattern(pattern);
  if (steps.length === 0) return 'Empty pattern';
  const groups = steps.filter((step) => /^(Capturing group|Named group)/.test(step.label)).length;
  const groupText = groups === 1 ? '1 group' : `${groups} groups`;
  return `${steps.length} tokens · ${groupText}`;
}
