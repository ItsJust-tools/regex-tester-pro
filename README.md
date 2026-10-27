# Regex Tester Pro

Write a regular expression, paste your text, and watch the matches highlight as you
type. Every match is broken down into capture groups, and the pattern itself is
explained token by token — so you can tell _why_ it matched, not just _that_ it did.

**Live:** [regex-tester-pro.itsjust.tools](https://regex-tester-pro.itsjust.tools)

## What it does

- **Real-time matching** — results, highlights, and metrics update on every keystroke.
- **Highlighted results** — matched runs are marked inline; select a match to focus it.
- **Capture groups** — index, name, matched value, and span for every group, including
  groups that never participated (`∅ no match`).
- **Pattern explanation** — a readable, indented breakdown of each token, from character
  classes and quantifiers to lookarounds and named groups.
- **Cheat sheet** — 35 searchable entries across seven categories. Filter by text or by
  category, and click an entry to load its example pattern.
- **Flags** — `g`, `i`, `m`, `s`, `u`, toggleable from both the toolbar and the pattern bar.
- **Saved patterns and history** — pin patterns you reuse; recent evaluations are logged
  automatically and can be restored with one click.
- **Test string library** — six ready-made samples (emails, ISO dates, URLs, hex colors,
  CSV rows, log lines).
- **Export** — download a JSON or Markdown report, or use the shell export menu for
  PNG / JPEG / WebP / PDF snapshots.

Everything runs in the browser. No uploads, no accounts, no server-side processing.

## Implementation notes

| Concern              | Behaviour                                                               |
| -------------------- | ----------------------------------------------------------------------- |
| Pattern limit        | 500 characters; longer input is truncated with a toast                  |
| Test string limit    | 100,000 characters; longer input is truncated with a toast              |
| Match cap            | 2,000 matches per evaluation; the status line reports truncation        |
| Rendered match chips | 200 at a time to keep the DOM responsive                                |
| Zero-width matches   | `\b`, `^`, `$`, `a*` are looped with an explicit `lastIndex` bump       |
| Group indexing       | Uses the `d` flag when available and falls back to index-free matching  |
| Invalid patterns     | Shown as a compiler message; the previous UI state is never thrown away |
| History              | Deduplicated by pattern + flags, debounced 700 ms, capped at 20 entries |
| Saved patterns       | Capped at 30 entries                                                    |

## Project structure

```text
src/
├── app/
│   └── tool-client.tsx          # state wiring, shortcuts, share, reports
├── tool/
│   ├── tool.config.ts           # metadata, features, shortcuts
│   ├── tool-definition.ts       # state shape, serialize/deserialize, exporters
│   ├── types.ts                 # RegexFlag, RegexState, limits
│   ├── components/
│   │   ├── tool-canvas.tsx      # pattern bar, test string, highlights, groups
│   │   ├── tool-toolbar.tsx     # flags, samples, save, report menu, clear
│   │   ├── tool-sidebar.tsx     # stats, saved patterns, history
│   │   ├── cheat-sheet.tsx      # searchable reference
│   │   ├── flag-toggle.tsx      # shared flag pill
│   │   └── regex-tester.css
│   └── lib/
│       ├── regex.ts             # compile, evaluate, groups, highlight segments
│       ├── explain.ts           # token-by-token pattern explanation
│       ├── cheat-sheet.ts       # reference data and filtering
│       ├── samples.ts           # demo test strings
│       ├── report.ts            # JSON / Markdown report builders
│       └── download.ts          # client-side file download
└── lib/                         # generic app utilities
```

The shared shell, hooks, and export engines live in `packages/core` (`@itsjust/core`).

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest unit tests
npm run build      # core build + Next.js production build
npm run preflight  # template sanity checks
```

## Keyboard shortcuts

| Keys                | Action                            |
| ------------------- | --------------------------------- |
| `Ctrl+Enter`        | Re-run and report the match count |
| `Ctrl+S`            | Save the current pattern          |
| `Ctrl+Shift+C`      | Clear pattern, text, and history  |
| `Ctrl+Shift+E`      | Download the JSON report          |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo                       |
| `Ctrl+B`            | Toggle the sidebar                |
| `Ctrl+?`            | Show all shortcuts                |

## Accessibility

- Every control has an accessible name; flags expose their state via `aria-pressed` or
  a checkbox.
- Match counts and filters announce changes through `role="status"` live regions, and
  compiler errors use `role="alert"`.
- The highlighted preview is keyboard-focusable and never replaces the editable test
  string.
- All colour pairs follow the template's light, dark, and high-contrast themes;
  transitions are disabled under `prefers-reduced-motion`.

## License

MIT
