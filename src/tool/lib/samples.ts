/** Ready-made test strings so the tool is useful the moment it loads. */

export interface SampleTestString {
  id: string;
  label: string;
  description: string;
  pattern: string;
  flags: string[];
  text: string;
}

export const SAMPLES: readonly SampleTestString[] = [
  {
    id: 'email',
    label: 'Email addresses',
    description: 'Pull contact addresses out of a short list',
    pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.-]+',
    flags: ['g', 'i'],
    text: [
      'Reach the team at hello@itsjust.tools or support@itsjust.tools.',
      'Personal inboxes: jane.doe+news@example.co.uk, dev@localhost',
      'Invalid: not-an-email@, @missing.tld',
    ].join('\n'),
  },
  {
    id: 'iso-date',
    label: 'ISO dates',
    description: 'Break a date into year, month, and day groups',
    pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
    flags: ['g'],
    text: [
      'Release 2026-01-15 shipped on schedule.',
      'Follow-ups landed 2026-02-03 and 2026-03-27.',
      'Not a date: 15-01-2026',
    ].join('\n'),
  },
  {
    id: 'url',
    label: 'URLs',
    description: 'Match http and https links with their host',
    pattern: 'https?://([\\w-]+\\.)+[\\w-]+(/[\\w./?%&=-]*)?',
    flags: ['g', 'i'],
    text: [
      'Docs live at https://itsjust.tools/docs and https://example.com/a/b?x=1',
      'Plain http works too: http://localhost:3000/tool',
      'Not a link: itsjust.tools',
    ].join('\n'),
  },
  {
    id: 'hex-color',
    label: 'Hex colors',
    description: 'Collect 3, 6, and 8 digit color tokens',
    pattern: '#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b',
    flags: ['g'],
    text: [
      'Palette: #0f172a, #3b82f6, #10b981, #ffffffcc',
      'Short form: #abc and #ABC',
      'Not a color: #12345',
    ].join('\n'),
  },
  {
    id: 'csv-row',
    label: 'CSV row',
    description: 'Split a comma-separated row into fields',
    pattern: '([^,\\s][^,]*?)(?:,|$)',
    flags: ['g'],
    text: 'id,name,email,plan\n42,Ada Lovelace,ada@example.com,pro',
  },
  {
    id: 'log-line',
    label: 'Log lines',
    description: 'Parse timestamp, level, and message per line',
    pattern: '^(?<time>[\\d:]+)\\s+(?<level>INFO|WARN|ERROR)\\s+(?<message>.+)$',
    flags: ['g', 'm'],
    text: [
      '12:00:01 INFO Server started on port 3000',
      '12:00:04 WARN Cache miss for /api/tools',
      '12:00:09 ERROR Request failed: timeout',
    ].join('\n'),
  },
];

/** Look up a sample by id. */
export function findSample(id: string): SampleTestString | undefined {
  return SAMPLES.find((sample) => sample.id === id);
}
