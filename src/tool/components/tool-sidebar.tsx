'use client';

import { useId, useState } from 'react';
import type { HistoryEntry, SavedPattern } from '../types';
import type { RegexEvaluation } from '../lib/regex';
import { flagsToString } from '../lib/regex';

interface ToolSidebarProps {
  evaluation: RegexEvaluation;
  savedPatterns: SavedPattern[];
  history: HistoryEntry[];
  onLoadSavedPattern: (id: string) => void;
  onDeleteSavedPattern: (id: string) => void;
  onRestoreHistory: (id: string) => void;
  onClearHistory: () => void;
  cheatSheet: React.ReactNode;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ToolSidebar({
  evaluation,
  savedPatterns,
  history,
  onLoadSavedPattern,
  onDeleteSavedPattern,
  onRestoreHistory,
  onClearHistory,
  cheatSheet,
}: ToolSidebarProps) {
  const statsId = useId();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { stats } = evaluation;
  const visibleHistory = showAllHistory ? history : history.slice(0, 5);

  return (
    <div className="rx-sidebar">
      <section className="rx-side-section" aria-labelledby={`${statsId}-stats`}>
        <h3 id={`${statsId}-stats`}>Match stats</h3>
        <dl className="rx-stats">
          <div className="rx-stat">
            <dt>Matches</dt>
            <dd>{stats.matches.toLocaleString()}</dd>
          </div>
          <div className="rx-stat">
            <dt>Capture groups</dt>
            <dd>{stats.groups.toLocaleString()}</dd>
          </div>
          <div className="rx-stat">
            <dt>Participating</dt>
            <dd>{stats.participatingGroups.toLocaleString()}</dd>
          </div>
          <div className="rx-stat">
            <dt>Zero-width</dt>
            <dd>{stats.zeroWidthMatches.toLocaleString()}</dd>
          </div>
          <div className="rx-stat">
            <dt>Coverage</dt>
            <dd>{(stats.coverage * 100).toFixed(1)}%</dd>
          </div>
          <div className="rx-stat">
            <dt>Time</dt>
            <dd>{evaluation.durationMs.toFixed(2)} ms</dd>
          </div>
        </dl>
        {evaluation.truncated ? (
          <p className="rx-warn" role="status">
            Match limit reached — enlarge the pattern to narrow results.
          </p>
        ) : null}
      </section>

      <section className="rx-side-section" aria-labelledby={`${statsId}-saved`}>
        <h3 id={`${statsId}-saved`}>Saved patterns</h3>
        {savedPatterns.length === 0 ? (
          <p className="rx-hint">No saved patterns yet. Use Save in the toolbar.</p>
        ) : (
          <ul className="rx-list">
            {savedPatterns.map((saved) => (
              <li key={saved.id} className="rx-list-item">
                <button
                  type="button"
                  className="rx-list-main"
                  onClick={() => onLoadSavedPattern(saved.id)}
                  title={formatTimestamp(saved.createdAt)}
                  aria-label={`Load saved pattern ${saved.label}`}
                >
                  <span className="rx-list-title">{saved.label}</span>
                  <code className="rx-list-code">{`/${saved.pattern}/${flagsToString(saved.flags)}`}</code>
                </button>
                <button
                  type="button"
                  className="rx-icon-btn"
                  onClick={() => onDeleteSavedPattern(saved.id)}
                  aria-label={`Delete saved pattern ${saved.label}`}
                  title="Delete"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rx-side-section" aria-labelledby={`${statsId}-history`}>
        <div className="rx-side-head">
          <h3 id={`${statsId}-history`}>History</h3>
          {history.length > 0 ? (
            <button type="button" className="rx-link-btn" onClick={onClearHistory}>
              Clear
            </button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="rx-hint">Past evaluations show up here.</p>
        ) : (
          <>
            <ul className="rx-list">
              {visibleHistory.map((entry) => (
                <li key={entry.id} className="rx-list-item">
                  <button
                    type="button"
                    className="rx-list-main"
                    onClick={() => onRestoreHistory(entry.id)}
                    title={formatTimestamp(entry.at)}
                    aria-label={`Restore ${entry.pattern} from history`}
                  >
                    <code className="rx-list-code">{`/${entry.pattern}/${flagsToString(entry.flags)}`}</code>
                    <span className="rx-list-meta">
                      {entry.matchCount} {entry.matchCount === 1 ? 'match' : 'matches'} ·{' '}
                      {entry.durationMs.toFixed(2)} ms · {formatTimestamp(entry.at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {history.length > 5 ? (
              <button
                type="button"
                className="rx-link-btn"
                onClick={() => setShowAllHistory((value) => !value)}
              >
                {showAllHistory ? 'Show less' : `Show all ${history.length}`}
              </button>
            ) : null}
          </>
        )}
      </section>

      {cheatSheet}
    </div>
  );
}
