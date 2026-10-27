import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import ToolClient from '@/app/tool-client';
import ToolClientWrapper from '@/app/tool-client-wrapper';

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-tool-client">dynamic-tool-client</div>,
}));

const mockSetData = vi.fn();
const mockToast = vi.fn();
const mockHandleExport = vi.fn();
const mockImport = vi.fn();
const mockToolbarActions = { canUndo: true, canRedo: true, onUndo: vi.fn(), onRedo: vi.fn() };

const mockState = {
  pattern: '\\d+',
  flags: ['g'] as const,
  testText: 'a1 b22',
  cheatSheetQuery: '',
  savedPatterns: [],
  history: [],
};

vi.mock('@itsjust/core', () => ({
  ToolShell: ({ toolbar, sidebar, canvas, statusBar }: Record<string, unknown>) => (
    <div>
      <div>{toolbar as ReactNode}</div>
      <div>{sidebar as ReactNode}</div>
      <div>{canvas as ReactNode}</div>
      <div>{statusBar as ReactNode}</div>
    </div>
  ),
  ImportExport: ({ onShare }: { onShare?: () => void }) => (
    <button type="button" onClick={onShare}>
      trigger-share
    </button>
  ),
  useTool: () => ({
    state: {
      data: mockState,
      setData: mockSetData,
      isDirty: false,
      lastSaved: 'just now',
    },
    toast: mockToast,
    supportedFormats: ['json'],
    handleExport: mockHandleExport,
    importFromFile: mockImport,
    isImporting: false,
    toolbarActions: mockToolbarActions,
  }),
}));

vi.mock('@/tool', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/tool');
  return {
    ...actual,
    toolConfig: {
      id: '1772184281',
      name: 'Regex Tester Pro',
      version: '1.0.0',
      features: { sidebar: true },
      theme: { brand: 'Regex Tester' },
      description: 'A regex tester',
      exportFormats: ['json'],
    },
    regexTool: {
      serialize: (state: unknown) => JSON.stringify(state),
      deserialize: () => ({ success: true, data: mockState }),
    },
    ToolCanvas: ({ pattern, testText }: { pattern: string; testText: string }) => (
      <div>
        canvas:{pattern}:{testText}
      </div>
    ),
    ToolToolbar: ({ onSavePattern }: { onSavePattern: () => void }) => (
      <button type="button" onClick={onSavePattern}>
        toolbar-save
      </button>
    ),
    ToolSidebar: () => <div>sidebar</div>,
    CheatSheet: () => <div>cheat-sheet</div>,
  };
});

describe('app client', () => {
  beforeEach(() => {
    mockSetData.mockReset();
    mockToast.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, 'share', {
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    window.history.replaceState(null, '', 'http://localhost:3000/');
  });

  it('renders dynamic tool client wrapper', () => {
    render(<ToolClientWrapper />);
    expect(screen.getByTestId('dynamic-tool-client')).toBeInTheDocument();
  });

  it('renders the toolbar, canvas, and sidebar', () => {
    render(<ToolClient />);
    expect(screen.getByText('canvas:\\d+:a1 b22')).toBeInTheDocument();
    expect(screen.getByText('sidebar')).toBeInTheDocument();
    expect(screen.getByText('toolbar-save')).toBeInTheDocument();
  });

  it('saves the current pattern from the toolbar', () => {
    render(<ToolClient />);
    fireEvent.click(screen.getByText('toolbar-save'));
    expect(mockSetData).toHaveBeenCalledTimes(1);
    const updater = mockSetData.mock.calls[0]?.[0] as (prev: typeof mockState) => typeof mockState;
    const next = updater(mockState);
    expect(next.savedPatterns).toHaveLength(1);
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('Saved'), 'success');
  });

  it('handles the share flow', async () => {
    render(<ToolClient />);
    fireEvent.click(screen.getByText('trigger-share'));
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
  });

  it('loads shared state from the URL', async () => {
    const { compressToEncodedURIComponent } = await import('lz-string');
    const encoded = compressToEncodedURIComponent(JSON.stringify(mockState));
    window.history.replaceState(null, '', `http://localhost:3000/?state=${encoded}`);
    render(<ToolClient />);
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith('Loaded state from shared URL', 'success')
    );
  });

  it('reports an error for an unreadable shared URL', async () => {
    window.history.replaceState(null, '', 'http://localhost:3000/?state=not-valid');
    render(<ToolClient />);
    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockToast.mock.calls[0]?.[1]).toBe('error');
  });
});
