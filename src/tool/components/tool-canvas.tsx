'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import {
  MAX_PATTERN_LENGTH,
  MAX_RENDERED_MATCHES,
  MAX_TEST_TEXT_LENGTH,
  REGEX_FLAGS,
  type RegexFlag,
} from '../types';
import type { RegexEvaluation, RegexMatch } from '../lib/regex';
import { highlightSegments } from '../lib/regex';
import { explainPattern } from '../lib/explain';

interface ToolCanvasProps {
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  pattern: string;
  flags: RegexFlag[];
  testText: string;
  evaluation: RegexEvaluation;
  onPatternChange: (pattern: string) => void;
  onTestTextChange: (text: string) => void;
  onToggleFlag: (flag: RegexFlag) => void;
}

function MatchChip({
  match,
  index,
  active,
  onSelect,
}: {
  match: RegexMatch;
  index: number;
  active: boolean;
  onSelect: (index: number) => void;
}) {
  const preview = match.zeroWidth ? '∅ zero-width' : match.value;
  return (
    <button
      type="button"
      className={`rx-chip${active ? ' rx-chip-active' : ''}${match.zeroWidth ? ' rx-chip-zero' : ''}`}
      onClick={() => onSelect(index)}
      aria-pressed={active}
      aria-label={`Match ${index + 1} at offset ${match.index}: ${match.value === '' ? 'empty' : match.value}`}
      title={`Offset ${match.index}–${match.end}`}
    >
      <span className="rx-chip-num">{index + 1}</span>
      <span className="rx-chip-value">{preview === '' ? '(empty)' : preview}</span>
    </button>
  );
}

function GroupTable({ match, pattern }: { match: RegexMatch; pattern: string }) {
  const explanation = useMemo(() => explainPattern(pattern), [pattern]);
  const groupSteps = explanation.filter((step) => step.label.toLowerCase().includes('group'));

  return (
    <table className="rx-groups">
      <caption className="rx-visually-hidden">Capture groups for the selected match</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Name</th>
          <th scope="col">Value</th>
          <th scope="col">Span</th>
        </tr>
      </thead>
      <tbody>
        {match.groups.map((group) => {
          const step = group.index === 0 ? null : groupSteps[group.index - 1];
          return (
            <tr key={group.index} className={group.value === null ? 'rx-group-missing' : undefined}>
              <td>{group.index === 0 ? 'full' : group.index}</td>
              <td>{group.name ?? (step ? 'unnamed' : '—')}</td>
              <td>
                <code>
                  {group.value === null
                    ? '∅ no match'
                    : group.value === ''
                      ? '(empty)'
                      : group.value}
                </code>
              </td>
              <td className="rx-group-span">
                {group.start === null || group.end === null ? '—' : `${group.start}–${group.end}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ExplanationList({ pattern }: { pattern: string }) {
  const steps = useMemo(() => explainPattern(pattern), [pattern]);
  if (steps.length === 0) {
    return <p className="rx-hint">Type a pattern to see a token-by-token explanation.</p>;
  }
  return (
    <ol className="rx-explain">
      {steps.map((step, index) => (
        <li key={`${step.start}-${index}`} style={{ paddingLeft: `${step.depth * 0.85}rem` }}>
          <code className="rx-explain-token">{step.token}</code>
          <span className="rx-explain-label">{step.label}</span>
          <span className="rx-explain-desc">{step.description}</span>
        </li>
      ))}
    </ol>
  );
}

export function ToolCanvas({
  canvasRef,
  pattern,
  flags,
  testText,
  evaluation,
  onPatternChange,
  onTestTextChange,
  onToggleFlag,
}: ToolCanvasProps) {
  const patternId = useId();
  const testTextId = useId();
  const [activeMatch, setActiveMatch] = useState(0);

  const segments = useMemo(
    () => highlightSegments(testText, evaluation.matches),
    [testText, evaluation.matches]
  );

  const selectedIndex =
    evaluation.matches.length === 0 ? -1 : Math.min(activeMatch, evaluation.matches.length - 1);
  const selectedMatch = selectedIndex >= 0 ? (evaluation.matches[selectedIndex] ?? null) : null;
  const rendered = evaluation.matches.slice(0, MAX_RENDERED_MATCHES);

  const handlePattern = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onPatternChange(event.target.value);
    },
    [onPatternChange]
  );

  const handleText = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTestTextChange(event.target.value);
    },
    [onTestTextChange]
  );

  const statusLabel =
    evaluation.status === 'empty'
      ? 'Waiting for a pattern'
      : evaluation.status === 'invalid'
        ? 'Invalid pattern'
        : `${evaluation.stats.matches} ${evaluation.stats.matches === 1 ? 'match' : 'matches'}`;

  return (
    <div ref={canvasRef} className="rx-canvas" role="application" aria-label="Regex tester canvas">
      <section className="rx-pattern-bar" aria-labelledby={`${patternId}-label`}>
        <label id={`${patternId}-label`} htmlFor={patternId} className="rx-field-label">
          Regular expression
        </label>
        <div className={`rx-pattern-input${evaluation.status === 'invalid' ? ' rx-invalid' : ''}`}>
          <span className="rx-delimiter" aria-hidden="true">
            /
          </span>
          <input
            id={patternId}
            className="rx-pattern-field"
            value={pattern}
            onChange={handlePattern}
            placeholder="\\b\\w+@\\w+\\.\\w{2,}\\b"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-invalid={evaluation.status === 'invalid'}
            aria-describedby={evaluation.error ? `${patternId}-error` : `${patternId}-status`}
            maxLength={MAX_PATTERN_LENGTH}
          />
          <span className="rx-delimiter" aria-hidden="true">
            /{evaluation.flagString}
          </span>
        </div>
        <div className="rx-flag-row" role="group" aria-label="Regular expression flags">
          {REGEX_FLAGS.map((flag) => {
            const enabled = flags.includes(flag);
            return (
              <label key={flag} className={`rx-flag${enabled ? ' rx-flag-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => onToggleFlag(flag)}
                  className="rx-flag-input"
                  aria-label={`${flag} flag — ${enabled ? 'enabled' : 'disabled'}`}
                  data-flag={flag}
                />
                <span className="rx-flag-key">{flag}</span>
              </label>
            );
          })}
        </div>
        <p
          id={`${patternId}-status`}
          className={`rx-status-line${evaluation.status === 'invalid' ? ' rx-status-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusLabel}
          {evaluation.status === 'ok' ? ` · ${evaluation.durationMs} ms` : ''}
          {evaluation.truncated ? ` · showing first ${evaluation.matches.length}` : ''}
        </p>
        {evaluation.error ? (
          <p id={`${patternId}-error`} className="rx-error" role="alert">
            {evaluation.error}
          </p>
        ) : null}
      </section>

      <div className="rx-main">
        <section className="rx-pane rx-pane-text" aria-labelledby={`${testTextId}-label`}>
          <div className="rx-pane-head">
            <label id={`${testTextId}-label`} htmlFor={testTextId} className="rx-field-label">
              Test string
            </label>
            <span className="rx-count">
              {evaluation.stats.textLength.toLocaleString()}/{MAX_TEST_TEXT_LENGTH.toLocaleString()}
            </span>
          </div>
          <textarea
            id={testTextId}
            className="rx-test-text"
            value={testText}
            onChange={handleText}
            spellCheck={false}
            placeholder="Paste the text you want to test…"
            aria-label="Test string"
          />
          <div className="rx-preview" aria-label="Highlighted matches" role="group">
            <h3 className="rx-pane-subhead">Highlighted</h3>
            {testText === '' ? (
              <p className="rx-hint">The highlighted preview appears here.</p>
            ) : evaluation.status === 'invalid' ? (
              <p className="rx-hint">Fix the pattern to see highlights.</p>
            ) : evaluation.matches.length === 0 ? (
              <p className="rx-hint">No matches in this test string.</p>
            ) : (
              <pre className="rx-highlight" tabIndex={0}>
                {segments.map((segment, index) =>
                  segment.matchIndex === null ? (
                    <span key={`p-${index}`}>{segment.text}</span>
                  ) : (
                    <mark
                      key={`m-${index}`}
                      className={`rx-mark${segment.matchIndex === selectedIndex ? ' rx-mark-active' : ''}`}
                      data-match={segment.matchIndex + 1}
                    >
                      {segment.text}
                    </mark>
                  )
                )}
              </pre>
            )}
          </div>
        </section>

        <section className="rx-pane rx-pane-results" aria-labelledby={`${testTextId}-results`}>
          <div className="rx-pane-head">
            <h3 id={`${testTextId}-results`} className="rx-pane-subhead">
              Matches
            </h3>
            {evaluation.matches.length > MAX_RENDERED_MATCHES ? (
              <span className="rx-count">first {MAX_RENDERED_MATCHES}</span>
            ) : null}
          </div>

          {evaluation.matches.length === 0 ? (
            <p className="rx-hint">
              {evaluation.status === 'empty'
                ? 'Enter a pattern to start matching.'
                : evaluation.status === 'invalid'
                  ? 'The pattern could not be compiled.'
                  : 'No matches found.'}
            </p>
          ) : (
            <div className="rx-chip-list" role="list" aria-label="Match list">
              {rendered.map((match, index) => (
                <span role="listitem" key={`${match.index}-${index}`}>
                  <MatchChip
                    match={match}
                    index={index}
                    active={index === selectedIndex}
                    onSelect={setActiveMatch}
                  />
                </span>
              ))}
            </div>
          )}

          {selectedMatch ? (
            <div className="rx-groups-block">
              <h4 className="rx-pane-subhead">Capture groups</h4>
              <GroupTable match={selectedMatch} pattern={pattern} />
            </div>
          ) : null}

          <div className="rx-explain-block">
            <h4 className="rx-pane-subhead">Explanation</h4>
            <ExplanationList pattern={pattern} />
          </div>
        </section>
      </div>
    </div>
  );
}
