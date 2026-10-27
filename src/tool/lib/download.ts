/** Client-side file download helpers (no server round-trip). */

/** Trigger a browser download for a text payload. */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Build a timestamped report filename, e.g. `regex-report-2026-10-27T11-04-00.json`. */
export function reportFilename(format: 'json' | 'markdown', now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `regex-report-${stamp}.${format === 'json' ? 'json' : 'md'}`;
}
