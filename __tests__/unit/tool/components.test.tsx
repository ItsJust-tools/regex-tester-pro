import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToolCanvas } from '@/tool/components/tool-canvas';
import { ToolToolbar } from '@/tool/components/tool-toolbar';
import { ToolSidebar } from '@/tool/components/tool-sidebar';
import { CheatSheet } from '@/tool/components/cheat-sheet';
import { FlagToggle } from '@/tool/components/flag-toggle';
import { evaluateRegex } from '@/tool/lib/regex';
import { initialRegexState } from '@/tool/tool-definition';
import type { RegexFlag, RegexState } from '@/tool/types';

function renderCanvas(overrides: Partial<RegexState> = {}, handlers: Record<string, unknown> = {}) {
  const state: RegexState = { ...initialRegexState, ...overrides };
  const evaluation = evaluateRegex(state.pattern, state.flags, state.testText);
  const onPatternChange = vi.fn();
  const onTestTextChange = vi.fn();
  const onToggleFlag = vi.fn();
  render(
    <ToolCanvas
      pattern={state.pattern}
      flags={state.flags}
      testText={state.testText}
      evaluation={evaluation}
      onPatternChange={onPatternChange}
      onTestTextChange={onTestTextChange}
      onToggleFlag={onToggleFlag}
      {...handlers}
    />
  );
  return { evaluation, onPatternChange, onTestTextChange, onToggleFlag };
}

describe('ToolCanvas', () => {
  it('renders the regex tester interface', () => {
    renderCanvas();
    expect(screen.getByRole('application', { name: 'Regex tester canvas' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Regular expression' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Test string' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Regular expression flags' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Highlighted matches' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Match list' })).toBeInTheDocument();
  });

  it('shows the match count in a live status line', () => {
    renderCanvas();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/\d+ match/);
  });

  it('highlights matches in the preview', () => {
    renderCanvas({ pattern: '\\d+', flags: ['g'], testText: 'a1 b22' });
    const preview = screen.getByRole('group', { name: 'Highlighted matches' });
    const marks = preview.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]?.textContent).toBe('1');
    expect(marks[1]?.textContent).toBe('22');
  });

  it('does not highlight when the pattern is empty', () => {
    renderCanvas({ pattern: '', testText: 'abc' });
    expect(screen.queryAllByRole('mark')).toHaveLength(0);
    expect(screen.getByText('Enter a pattern to start matching.')).toBeInTheDocument();
  });

  it('shows the compiler error for an invalid pattern', () => {
    renderCanvas({ pattern: '([a-z', testText: 'abc' });
    expect(screen.getByText('Invalid pattern')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Fix the pattern to see highlights.')).toBeInTheDocument();
  });

  it('breaks out capture groups', () => {
    renderCanvas({ pattern: '(?<word>\\w+)@(\\w+)', flags: ['g'], testText: 'ada@example' });
    const table = screen.getByRole('table');
    expect(within(table).getByText('full')).toBeInTheDocument();
    expect(within(table).getByText('word')).toBeInTheDocument();
    expect(within(table).getByText('ada')).toBeInTheDocument();
    expect(within(table).getByText('example')).toBeInTheDocument();
  });

  it('lets a match chip switch the selected group table', () => {
    renderCanvas({ pattern: '(\\d+)', flags: ['g'], testText: '1 22' });
    const chips = screen.getAllByRole('button', { name: /^Match \d/ });
    expect(chips).toHaveLength(2);
    fireEvent.click(chips[1] as HTMLElement);
    expect(screen.getByRole('button', { name: /^Match 2/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /^Match 1/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('reports pattern and text edits to the parent', () => {
    const { onPatternChange, onTestTextChange } = renderCanvas();
    fireEvent.change(screen.getByRole('textbox', { name: 'Regular expression' }), {
      target: { value: '\\d' },
    });
    expect(onPatternChange).toHaveBeenCalledWith('\\d');

    fireEvent.change(screen.getByRole('textbox', { name: 'Test string' }), {
      target: { value: 'abc' },
    });
    expect(onTestTextChange).toHaveBeenCalledWith('abc');
  });

  it('reports flag toggles from the in-canvas flag row', () => {
    const { onToggleFlag } = renderCanvas({ flags: ['g'] });
    const inputs = screen.getAllByRole('checkbox');
    expect(inputs).toHaveLength(5);
    fireEvent.click(inputs[1] as HTMLElement);
    expect(onToggleFlag).toHaveBeenCalledWith('i');
  });

  it('marks enabled flags as checked', () => {
    renderCanvas({ flags: ['g', 'm'] });
    const inputs = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(inputs[0]?.checked).toBe(true);
    expect(inputs[1]?.checked).toBe(false);
    expect(inputs[2]?.checked).toBe(true);
  });

  it('renders a token-by-token explanation', () => {
    renderCanvas({ pattern: '\\d+' });
    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('Digit')).toBeInTheDocument();
    expect(screen.getByText('One or more')).toBeInTheDocument();
  });

  it('shows an empty-state hint for the explanation', () => {
    renderCanvas({ pattern: '' });
    expect(
      screen.getByText('Type a pattern to see a token-by-token explanation.')
    ).toBeInTheDocument();
  });

  it('shows a no-match hint when nothing matches', () => {
    renderCanvas({ pattern: 'zzz', flags: ['g'], testText: 'abc' });
    expect(screen.getByText('No matches in this test string.')).toBeInTheDocument();
  });

  it('renders zero-width matches as chips with a marker', () => {
    renderCanvas({ pattern: '\\b', flags: ['g'], testText: 'hi there' });
    const chips = screen.getAllByRole('button', { name: /zero-width|Match \d/ });
    expect(chips.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Match 1/ })).toHaveTextContent('∅ zero-width');
  });

  it('shows the truncation note when the match cap is hit', () => {
    const text = 'a'.repeat(2100);
    renderCanvas({ pattern: 'a', flags: ['g'], testText: text });
    expect(screen.getByRole('status')).toHaveTextContent(/showing first 2000/);
  });
});

describe('ToolToolbar', () => {
  const baseProps = {
    flags: ['g'] as RegexFlag[],
    onToggleFlag: vi.fn(),
    onLoadSample: vi.fn(),
    samples: [{ id: 'email', label: 'Email addresses' }],
    onSavePattern: vi.fn(),
    onClear: vi.fn(),
    onExportReport: vi.fn(),
    canSave: true,
  };

  it('renders five flag toggles reflecting state', () => {
    render(<ToolToolbar {...baseProps} />);
    const toggles = screen.getAllByRole('button', { name: /^[gimsu] flag/ });
    expect(toggles).toHaveLength(5);
    expect(screen.getByRole('button', { name: /^g flag/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^i flag/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('toggles flags', () => {
    const onToggleFlag = vi.fn();
    render(<ToolToolbar {...baseProps} onToggleFlag={onToggleFlag} />);
    fireEvent.click(screen.getByRole('button', { name: /^m flag/ }));
    expect(onToggleFlag).toHaveBeenCalledWith('m');
  });

  it('loads a sample from the select', () => {
    const onLoadSample = vi.fn();
    render(<ToolToolbar {...baseProps} onLoadSample={onLoadSample} />);
    fireEvent.change(screen.getByLabelText('Load a sample test string'), {
      target: { value: 'email' },
    });
    expect(onLoadSample).toHaveBeenCalledWith('email');
  });

  it('triggers save and clear actions', () => {
    const onSavePattern = vi.fn();
    const onClear = vi.fn();
    render(<ToolToolbar {...baseProps} onSavePattern={onSavePattern} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save current pattern' }));
    expect(onSavePattern).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Clear pattern, test string, and history' })
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables save when the pattern is empty', () => {
    render(<ToolToolbar {...baseProps} canSave={false} />);
    expect(screen.getByRole('button', { name: 'Save current pattern' })).toBeDisabled();
  });

  it('opens the report menu and exports both formats', () => {
    const onExportReport = vi.fn();
    render(<ToolToolbar {...baseProps} onExportReport={onExportReport} />);

    const trigger = screen.getByRole('button', { name: 'Download match report' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('menuitem', { name: 'JSON report' }));
    expect(onExportReport).toHaveBeenCalledWith('json');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Markdown report' }));
    expect(onExportReport).toHaveBeenCalledWith('markdown');
  });

  it('closes the report menu on Escape', () => {
    render(<ToolToolbar {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download match report' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('FlagToggle', () => {
  it('renders label, title, and pressed state', () => {
    const onToggle = vi.fn();
    render(<FlagToggle flag="g" enabled onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'g flag — Global' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('title', expect.stringContaining('Global'));
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state', () => {
    render(<FlagToggle flag="u" enabled={false} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /^u flag/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});

describe('CheatSheet', () => {
  it('lists all entries by default with a count', () => {
    render(<CheatSheet query="" onQueryChange={() => {}} onUsePattern={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Cheat sheet' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/\d+ entries$/);
  });

  it('filters entries by query and reports how many match', () => {
    render(<CheatSheet query="lookahead" onQueryChange={() => {}} onUsePattern={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent(/of \d+ entries match/);
    expect(screen.getByText('Positive lookahead')).toBeInTheDocument();
    expect(screen.queryByText('Zero or more')).not.toBeInTheDocument();
  });

  it('propagates query changes', () => {
    const onQueryChange = vi.fn();
    render(<CheatSheet query="" onQueryChange={onQueryChange} onUsePattern={() => {}} />);
    fireEvent.change(screen.getByLabelText('Filter cheat sheet'), {
      target: { value: 'digit' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('digit');
  });

  it('shows an empty state for unmatched queries', () => {
    render(<CheatSheet query="zzzz" onQueryChange={() => {}} onUsePattern={() => {}} />);
    expect(screen.getByText('No cheat-sheet entries match that filter.')).toBeInTheDocument();
  });

  it('filters by category chips', () => {
    render(<CheatSheet query="" onQueryChange={() => {}} onUsePattern={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quantifiers' }));
    expect(screen.getByRole('button', { name: 'Quantifiers' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Zero or more')).toBeInTheDocument();
    expect(screen.queryByText('Positive lookahead')).not.toBeInTheDocument();
  });

  it('emits the example pattern when an entry is used', () => {
    const onUsePattern = vi.fn();
    render(<CheatSheet query="digit" onQueryChange={() => {}} onUsePattern={onUsePattern} />);
    fireEvent.click(screen.getByRole('button', { name: /for Digit/ }));
    expect(onUsePattern).toHaveBeenCalledWith(expect.objectContaining({ id: 'digit' }));
  });
});

describe('ToolSidebar', () => {
  const evaluation = evaluateRegex('(\\d+)', ['g'], 'a1 b22');
  const cheatSheet = <div data-testid="cheat-slot">cheat</div>;

  const baseProps = {
    evaluation,
    savedPatterns: [],
    history: [],
    onLoadSavedPattern: vi.fn(),
    onDeleteSavedPattern: vi.fn(),
    onRestoreHistory: vi.fn(),
    onClearHistory: vi.fn(),
    cheatSheet,
  };

  it('renders match statistics', () => {
    render(<ToolSidebar {...baseProps} />);
    expect(screen.getByText('Match stats')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Capture groups')).toBeInTheDocument();
    expect(screen.getByTestId('cheat-slot')).toBeInTheDocument();
  });

  it('shows empty states for saved patterns and history', () => {
    render(<ToolSidebar {...baseProps} />);
    expect(screen.getByText('No saved patterns yet. Use Save in the toolbar.')).toBeInTheDocument();
    expect(screen.getByText('Past evaluations show up here.')).toBeInTheDocument();
  });

  it('loads and deletes saved patterns', () => {
    const onLoadSavedPattern = vi.fn();
    const onDeleteSavedPattern = vi.fn();
    render(
      <ToolSidebar
        {...baseProps}
        onLoadSavedPattern={onLoadSavedPattern}
        onDeleteSavedPattern={onDeleteSavedPattern}
        savedPatterns={[
          {
            id: 's1',
            label: 'digits',
            pattern: '\\d+',
            flags: ['g'],
            createdAt: '2026-10-27T10:00:00.000Z',
          },
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load saved pattern digits' }));
    expect(onLoadSavedPattern).toHaveBeenCalledWith('s1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete saved pattern digits' }));
    expect(onDeleteSavedPattern).toHaveBeenCalledWith('s1');
  });

  it('restores and clears history entries', () => {
    const onRestoreHistory = vi.fn();
    const onClearHistory = vi.fn();
    render(
      <ToolSidebar
        {...baseProps}
        onRestoreHistory={onRestoreHistory}
        onClearHistory={onClearHistory}
        history={[
          {
            id: 'h1',
            pattern: '\\d+',
            flags: ['g'],
            matchCount: 2,
            durationMs: 1.5,
            at: '2026-10-27T10:00:00.000Z',
          },
        ]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Restore/ }));
    expect(onRestoreHistory).toHaveBeenCalledWith('h1');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClearHistory).toHaveBeenCalledTimes(1);
  });

  it('collapses long history behind a show-all toggle', () => {
    const history = Array.from({ length: 8 }, (_, index) => ({
      id: `h${index}`,
      pattern: `p${index}`,
      flags: ['g'] as RegexFlag[],
      matchCount: index,
      durationMs: 1,
      at: '2026-10-27T10:00:00.000Z',
    }));

    render(<ToolSidebar {...baseProps} history={history} />);
    expect(screen.getAllByRole('button', { name: /Restore/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 8' }));
    expect(screen.getAllByRole('button', { name: /Restore/ })).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getAllByRole('button', { name: /Restore/ })).toHaveLength(5);
  });

  it('warns when the match cap truncates results', () => {
    const truncated = { ...evaluation, truncated: true };
    render(<ToolSidebar {...baseProps} evaluation={truncated} />);
    expect(screen.getByText(/Match limit reached/)).toBeInTheDocument();
  });

  it('renders an invalid evaluation without crashing', () => {
    const invalid = evaluateRegex('([', ['g'], 'x');
    render(<ToolSidebar {...baseProps} evaluation={invalid} />);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
