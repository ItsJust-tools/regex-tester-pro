'use client';

import { useId, useMemo, useState } from 'react';
import {
  CHEAT_SHEET,
  filterCheatSheet,
  groupCheatSheet,
  type CheatSheetEntry,
} from '../lib/cheat-sheet';

interface CheatSheetProps {
  query: string;
  onQueryChange: (query: string) => void;
  onUsePattern: (entry: CheatSheetEntry) => void;
}

/**
 * Searchable regex reference.
 * The filter matches tokens, labels, descriptions, categories, and examples.
 */
export function CheatSheet({ query, onQueryChange, onUsePattern }: CheatSheetProps) {
  const inputId = useId();
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => filterCheatSheet(query), [query]);
  const groups = useMemo(() => groupCheatSheet(filtered), [filtered]);
  const visible = useMemo(
    () => (category === 'all' ? groups : groups.filter((group) => group.category === category)),
    [groups, category]
  );

  const total = CHEAT_SHEET.length;

  return (
    <section className="rx-side-section" aria-labelledby={`${inputId}-heading`}>
      <h3 id={`${inputId}-heading`}>Cheat sheet</h3>
      <label htmlFor={inputId} className="rx-visually-hidden">
        Filter cheat sheet
      </label>
      <input
        id={inputId}
        type="search"
        className="rx-search"
        value={query}
        placeholder="Filter patterns…"
        onChange={(event) => onQueryChange(event.target.value)}
        aria-describedby={`${inputId}-count`}
      />
      <p id={`${inputId}-count`} className="rx-hint" role="status" aria-live="polite">
        {filtered.length === total
          ? `${total} entries`
          : `${filtered.length} of ${total} entries match “${query.trim()}”`}
      </p>

      {filtered.length === 0 ? (
        <p className="rx-hint">No cheat-sheet entries match that filter.</p>
      ) : (
        <div className="rx-cheat">
          <div className="rx-chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`rx-chip-sm${category === 'all' ? ' rx-chip-sm-on' : ''}`}
              onClick={() => setCategory('all')}
              aria-pressed={category === 'all'}
            >
              All
            </button>
            {groups.map((group) => (
              <button
                key={group.category}
                type="button"
                className={`rx-chip-sm${category === group.category ? ' rx-chip-sm-on' : ''}`}
                onClick={() => setCategory(group.category)}
                aria-pressed={category === group.category}
              >
                {group.category}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="rx-hint">No entries in this category for the current filter.</p>
          ) : (
            visible.map((group) => (
              <div key={group.category} className="rx-cheat-group">
                <h4 className="rx-cheat-category">{group.category}</h4>
                <ul className="rx-cheat-list">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="rx-cheat-item">
                      <button
                        type="button"
                        className="rx-cheat-button"
                        onClick={() => onUsePattern(entry)}
                        title={`Insert example: ${entry.example}`}
                        aria-label={`Use example ${entry.example} for ${entry.label}`}
                      >
                        <code className="rx-cheat-token">{entry.token}</code>
                        <span className="rx-cheat-text">
                          <span className="rx-cheat-label">{entry.label}</span>
                          <span className="rx-cheat-desc">{entry.description}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
