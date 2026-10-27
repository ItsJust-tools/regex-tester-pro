'use client';

import { useEffect, useRef, useState } from 'react';
import { FlagToggle } from './flag-toggle';
import { REGEX_FLAGS, type RegexFlag } from '../types';

export type ReportFormat = 'json' | 'markdown';

interface ToolToolbarProps {
  flags: RegexFlag[];
  onToggleFlag: (flag: RegexFlag) => void;
  onLoadSample: (id: string) => void;
  samples: Array<{ id: string; label: string }>;
  onSavePattern: () => void;
  onClear: () => void;
  onExportReport: (format: ReportFormat) => void;
  canSave: boolean;
}

function ReportMenu({ onExportReport }: { onExportReport: (format: ReportFormat) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="rx-menu" ref={menuRef}>
      <button
        type="button"
        className="toolbar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Download match report"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⭳</span>
        <span className="rx-btn-label">Report</span>
      </button>
      {open ? (
        <div className="rx-menu-popover" role="menu" aria-label="Report format">
          <button
            type="button"
            role="menuitem"
            className="rx-menu-item"
            onClick={() => {
              setOpen(false);
              onExportReport('json');
            }}
          >
            JSON report
          </button>
          <button
            type="button"
            role="menuitem"
            className="rx-menu-item"
            onClick={() => {
              setOpen(false);
              onExportReport('markdown');
            }}
          >
            Markdown report
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ToolToolbar({
  flags,
  onToggleFlag,
  onLoadSample,
  samples,
  onSavePattern,
  onClear,
  onExportReport,
  canSave,
}: ToolToolbarProps) {
  const [sampleId, setSampleId] = useState('');

  return (
    <div className="rx-toolbar">
      <div className="rx-toolbar-group" role="group" aria-label="Regex flags">
        {REGEX_FLAGS.map((flag) => (
          <FlagToggle
            key={flag}
            flag={flag}
            enabled={flags.includes(flag)}
            onToggle={() => onToggleFlag(flag)}
          />
        ))}
      </div>

      <span className="rx-toolbar-divider" aria-hidden="true" />

      <div className="rx-toolbar-group">
        <label htmlFor="rx-sample-select" className="rx-visually-hidden">
          Load a sample test string
        </label>
        <select
          id="rx-sample-select"
          className="rx-select"
          value={sampleId}
          onChange={(event) => {
            const value = event.target.value;
            setSampleId('');
            if (value) onLoadSample(value);
          }}
        >
          <option value="">Samples…</option>
          {samples.map((sample) => (
            <option key={sample.id} value={sample.id}>
              {sample.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="toolbar-btn"
        onClick={onSavePattern}
        disabled={!canSave}
        aria-label="Save current pattern"
        title="Save pattern (Ctrl+S)"
      >
        <span aria-hidden="true">☆</span>
        <span className="rx-btn-label">Save</span>
      </button>

      <ReportMenu onExportReport={onExportReport} />

      <button
        type="button"
        className="toolbar-btn"
        onClick={onClear}
        aria-label="Clear pattern, test string, and history"
        title="Clear all (Ctrl+Shift+C)"
      >
        <span aria-hidden="true">⌫</span>
        <span className="rx-btn-label">Clear</span>
      </button>
    </div>
  );
}
