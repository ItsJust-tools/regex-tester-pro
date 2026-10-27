'use client';

import { FLAG_INFO, type RegexFlag } from '../types';

interface FlagToggleProps {
  flag: RegexFlag;
  enabled: boolean;
  onToggle: () => void;
}

/** Single flag pill used in the toolbar. */
export function FlagToggle({ flag, enabled, onToggle }: FlagToggleProps) {
  const info = FLAG_INFO[flag];
  return (
    <button
      type="button"
      className={`rx-flag-toggle${enabled ? ' rx-flag-toggle-on' : ''}`}
      aria-pressed={enabled}
      aria-label={`${flag} flag — ${info.label}`}
      title={`${info.label}: ${info.description}`}
      onClick={onToggle}
    >
      {flag}
    </button>
  );
}
