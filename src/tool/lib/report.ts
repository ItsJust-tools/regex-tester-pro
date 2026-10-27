import { explainPattern } from './explain';
import type { RegexState } from '../types';
import type { RegexEvaluation } from './regex';
import { flagsToString } from './regex';

export interface RegexReport {
  tool: string;
  version: string;
  generatedAt: string;
  pattern: string;
  flags: string;
  status: RegexEvaluation['status'];
  error: string | null;
  stats: RegexEvaluation['stats'];
  durationMs: number;
  truncated: boolean;
  matches: Array<{
    index: number;
    end: number;
    value: string;
    zeroWidth: boolean;
    groups: Array<{
      index: number;
      name: string | null;
      value: string | null;
      start: number | null;
      end: number | null;
    }>;
  }>;
  explanation: Array<{ token: string; label: string; description: string }>;
  testText: string;
}

/** Build a portable report describing the current evaluation. */
export function buildReport(
  state: RegexState,
  evaluation: RegexEvaluation,
  meta: { tool: string; version: string; now?: Date }
): RegexReport {
  return {
    tool: meta.tool,
    version: meta.version,
    generatedAt: (meta.now ?? new Date()).toISOString(),
    pattern: state.pattern,
    flags: flagsToString(state.flags),
    status: evaluation.status,
    error: evaluation.error,
    stats: evaluation.stats,
    durationMs: evaluation.durationMs,
    truncated: evaluation.truncated,
    matches: evaluation.matches.map((match) => ({
      index: match.index,
      end: match.end,
      value: match.value,
      zeroWidth: match.zeroWidth,
      groups: match.groups.map((group) => ({
        index: group.index,
        name: group.name,
        value: group.value,
        start: group.start,
        end: group.end,
      })),
    })),
    explanation: explainPattern(state.pattern).map((step) => ({
      token: step.token,
      label: step.label,
      description: step.description,
    })),
    testText: state.testText,
  };
}

/** Serialize a report as pretty-printed JSON. */
export function reportToJson(report: RegexReport): string {
  return JSON.stringify(report, null, 2);
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '\\n');
}

function codeSpan(value: string): string {
  return value === '' ? '`(empty)`' : `\`${value.replace(/`/g, '\\`')}\``;
}

/** Serialize a report as a readable Markdown document. */
export function reportToMarkdown(report: RegexReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.tool} report`);
  lines.push('');
  lines.push(`- Pattern: \`/${report.pattern}/${report.flags}\``);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Status: ${report.status}`);
  if (report.error) lines.push(`- Error: ${report.error}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- Matches: ${report.stats.matches}`);
  lines.push(`- Capture groups: ${report.stats.groups}`);
  lines.push(`- Participating groups: ${report.stats.participatingGroups}`);
  lines.push(`- Zero-width matches: ${report.stats.zeroWidthMatches}`);
  lines.push(
    `- Characters matched: ${report.stats.charactersMatched} of ${report.stats.textLength}`
  );
  lines.push(`- Coverage: ${(report.stats.coverage * 100).toFixed(1)}%`);
  lines.push(`- Evaluation time: ${report.durationMs} ms`);
  if (report.truncated) lines.push('- Note: output truncated at the match limit');
  lines.push('');

  lines.push('## Matches');
  lines.push('');
  if (report.matches.length === 0) {
    lines.push('_No matches._');
  } else {
    lines.push('| # | Offset | Match | Groups |');
    lines.push('| - | ------ | ----- | ------ |');
    report.matches.forEach((match, index) => {
      const groups =
        match.groups.length > 1
          ? match.groups
              .slice(1)
              .map(
                (group) =>
                  `${group.name ?? group.index}=${group.value === null ? '∅' : group.value}`
              )
              .join(', ')
          : '—';
      lines.push(
        `| ${index + 1} | ${match.index}-${match.end} | ${escapeCell(codeSpan(match.value))} | ${escapeCell(groups)} |`
      );
    });
  }
  lines.push('');

  lines.push('## Explanation');
  lines.push('');
  if (report.explanation.length === 0) {
    lines.push('_Empty pattern._');
  } else {
    for (const step of report.explanation) {
      lines.push(`- \`${step.token}\` — ${step.label}: ${step.description}`);
    }
  }
  lines.push('');

  lines.push('## Test string');
  lines.push('');
  lines.push('```text');
  lines.push(report.testText);
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}
