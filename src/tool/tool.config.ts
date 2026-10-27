import type { ToolConfig } from '@itsjust/core';
import packageJson from '../../package.json';

export const templateBaseVersion = packageJson.version;

const toolConfig = {
  id: '1772184281',
  name: 'Regex Tester Pro',
  description:
    'Write a regular expression and see matches highlight in real time. Inspect capture groups, read a token-by-token explanation, save patterns, and browse a cheat sheet.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    accentSubtle: 'rgba(124, 58, 237, 0.08)',
    brand: 'Regex Tester',
    icon: '⧉',
  },
  shortcuts: [
    {
      title: 'Regex Tester Pro',
      shortcuts: [
        {
          keys: 'Ctrl+Enter',
          label: 'Re-run the pattern',
          description: 'evaluate the current pattern against the test string',
        },
        {
          keys: 'Ctrl+S',
          label: 'Save pattern',
          description: 'pin the current pattern to the saved list',
        },
        {
          keys: 'Ctrl+Shift+C',
          label: 'Clear all',
          description: 'empty the pattern, test string, and history',
        },
        {
          keys: 'Ctrl+Shift+E',
          label: 'Export report',
          description: 'download the results as a JSON report',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
