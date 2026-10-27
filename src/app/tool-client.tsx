'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell, useTool, ImportExport } from '@itsjust/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import {
  MAX_HISTORY_ENTRIES,
  MAX_PATTERN_LENGTH,
  MAX_SAVED_PATTERNS,
  MAX_TEST_TEXT_LENGTH,
  SAMPLES,
  CheatSheet,
  ToolCanvas,
  ToolSidebar,
  ToolToolbar,
  buildReport,
  downloadTextFile,
  evaluateRegex,
  findSample,
  flagsToString,
  normalizeFlags,
  regexTool,
  reportFilename,
  reportToJson,
  reportToMarkdown,
  templateBaseVersion,
  toggleFlag,
  toolConfig,
  type CheatSheetEntry,
  type HistoryEntry,
  type RegexFlag,
  type SavedPattern,
} from '@/tool';
import '../tool/components/regex-tester.css';

const HISTORY_DEBOUNCE_MS = 700;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ToolClient() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const tool = useTool(regexTool, canvasRef);
  const data = tool.state.data;
  const setToolData = tool.state.setData;
  const showToast = tool.toast;
  const [isSharing, setIsSharing] = useState(false);
  const hasLoadedSharedState = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth > 768 && toolConfig.features.sidebar
  );
  const lastRecorded = useRef<string>('');

  const evaluation = useMemo(
    () => evaluateRegex(data.pattern, data.flags, data.testText),
    [data.pattern, data.flags, data.testText]
  );

  useEffect(() => {
    document.title = toolConfig.name;
  }, []);

  /* ------------------------------ state updates ----------------------------- */

  const setPattern = useCallback(
    (pattern: string) => {
      const next = pattern.slice(0, MAX_PATTERN_LENGTH);
      if (pattern.length > MAX_PATTERN_LENGTH) {
        showToast(`Pattern truncated to ${MAX_PATTERN_LENGTH} characters`, 'error');
      }
      setToolData((prev) => ({ ...prev, pattern: next }));
    },
    [setToolData, showToast]
  );

  const setTestText = useCallback(
    (text: string) => {
      const next = text.slice(0, MAX_TEST_TEXT_LENGTH);
      if (text.length > MAX_TEST_TEXT_LENGTH) {
        showToast(
          `Test string truncated to ${MAX_TEST_TEXT_LENGTH.toLocaleString()} characters`,
          'error'
        );
      }
      setToolData((prev) => ({ ...prev, testText: next }));
    },
    [setToolData, showToast]
  );

  const handleToggleFlag = useCallback(
    (flag: RegexFlag) => {
      setToolData((prev) => ({ ...prev, flags: toggleFlag(prev.flags, flag) }));
    },
    [setToolData]
  );

  const setCheatSheetQuery = useCallback(
    (cheatSheetQuery: string) => {
      setToolData((prev) => ({ ...prev, cheatSheetQuery }));
    },
    [setToolData]
  );

  /* -------------------------------- actions --------------------------------- */

  const loadSample = useCallback(
    (id: string) => {
      const sample = findSample(id);
      if (!sample) return;
      setToolData((prev) => ({
        ...prev,
        pattern: sample.pattern,
        flags: normalizeFlags(sample.flags),
        testText: sample.text,
      }));
      showToast(`Loaded sample: ${sample.label}`, 'success');
    },
    [setToolData, showToast]
  );

  const useCheatEntry = useCallback(
    (entry: CheatSheetEntry) => {
      setToolData((prev) => ({ ...prev, pattern: entry.example }));
      showToast(`Inserted ${entry.example}`, 'success');
    },
    [setToolData, showToast]
  );

  const saveCurrentPattern = useCallback(
    (label?: string) => {
      if (data.pattern.trim() === '') {
        showToast('Nothing to save — enter a pattern first', 'error');
        return;
      }
      const trimmed = (label ?? '').trim() || data.pattern.slice(0, 40);
      const entry: SavedPattern = {
        id: makeId('saved'),
        label: trimmed,
        pattern: data.pattern,
        flags: data.flags,
        createdAt: new Date().toISOString(),
      };
      setToolData((prev) => ({
        ...prev,
        savedPatterns: [entry, ...prev.savedPatterns].slice(0, MAX_SAVED_PATTERNS),
      }));
      showToast(`Saved “${trimmed}”`, 'success');
    },
    [data.flags, data.pattern, setToolData, showToast]
  );

  const loadSavedPattern = useCallback(
    (id: string) => {
      const saved = data.savedPatterns.find((entry) => entry.id === id);
      if (!saved) return;
      setToolData((prev) => ({
        ...prev,
        pattern: saved.pattern,
        flags: saved.flags,
      }));
      showToast(`Loaded “${saved.label}”`, 'success');
    },
    [data.savedPatterns, setToolData, showToast]
  );

  const deleteSavedPattern = useCallback(
    (id: string) => {
      setToolData((prev) => ({
        ...prev,
        savedPatterns: prev.savedPatterns.filter((entry) => entry.id !== id),
      }));
      showToast('Saved pattern removed', 'success');
    },
    [setToolData, showToast]
  );

  const restoreHistory = useCallback(
    (id: string) => {
      const entry = data.history.find((item) => item.id === id);
      if (!entry) return;
      setToolData((prev) => ({
        ...prev,
        pattern: entry.pattern,
        flags: entry.flags,
      }));
      showToast('Restored from history', 'success');
    },
    [data.history, setToolData, showToast]
  );

  const clearHistory = useCallback(() => {
    setToolData((prev) => ({ ...prev, history: [] }));
    showToast('History cleared', 'success');
  }, [setToolData, showToast]);

  const clearAll = useCallback(() => {
    lastRecorded.current = '';
    setToolData((prev) => ({
      ...prev,
      pattern: '',
      testText: '',
      history: [],
      cheatSheetQuery: '',
    }));
    showToast('Cleared pattern, test string, and history', 'success');
  }, [setToolData, showToast]);

  const exportReport = useCallback(
    (format: 'json' | 'markdown') => {
      if (evaluation.status === 'empty') {
        showToast('Enter a pattern before exporting a report', 'error');
        return;
      }
      if (evaluation.status === 'invalid') {
        showToast('Fix the pattern before exporting a report', 'error');
        return;
      }
      const report = buildReport(data, evaluation, {
        tool: toolConfig.name,
        version: toolConfig.version,
      });
      const content = format === 'json' ? reportToJson(report) : reportToMarkdown(report);
      const filename = reportFilename(format);
      downloadTextFile(filename, content, format === 'json' ? 'application/json' : 'text/markdown');
      showToast(`Report downloaded as ${filename}`, 'success');
    },
    [data, evaluation, showToast]
  );

  /* ------------------------------- history log ------------------------------ */

  useEffect(() => {
    if (evaluation.status !== 'ok' || data.pattern === '') return;
    const signature = `${data.pattern}\u0000${flagsToString(data.flags)}\u0000${data.testText.length}\u0000${evaluation.stats.matches}`;
    if (signature === lastRecorded.current) return;

    const timer = setTimeout(() => {
      lastRecorded.current = signature;
      const entry: HistoryEntry = {
        id: makeId('hist'),
        pattern: data.pattern,
        flags: data.flags,
        matchCount: evaluation.stats.matches,
        durationMs: evaluation.durationMs,
        at: new Date().toISOString(),
      };
      setToolData((prev) => {
        const withoutDuplicate = prev.history.filter(
          (item) =>
            !(
              item.pattern === entry.pattern &&
              flagsToString(item.flags) === flagsToString(entry.flags)
            )
        );
        return {
          ...prev,
          history: [entry, ...withoutDuplicate].slice(0, MAX_HISTORY_ENTRIES),
        };
      });
    }, HISTORY_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [data.pattern, data.flags, data.testText, evaluation, setToolData]);

  /* ------------------------------ shared state ------------------------------ */

  useEffect(() => {
    if (hasLoadedSharedState.current) return;
    hasLoadedSharedState.current = true;
    const params = new URLSearchParams(window.location.search);
    const encodedState = params.get('state');
    if (!encodedState) return;
    try {
      const serialized = decompressFromEncodedURIComponent(encodedState);
      if (!serialized) throw new Error('Invalid shared URL');
      const parsed: unknown = JSON.parse(serialized);
      const deserialized = regexTool.deserialize(parsed);
      if (!deserialized.success) throw new Error(deserialized.error);
      setToolData(deserialized.data);
      showToast('Loaded state from shared URL', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load shared URL';
      showToast(message, 'error');
    }
  }, [setToolData, showToast]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const serialized = regexTool.serialize(tool.state.data);
      const encodedState = compressToEncodedURIComponent(serialized);
      if (!encodedState) throw new Error('Failed to encode state for URL');
      const url = new URL(window.location.href);
      url.searchParams.set('state', encodedState);
      url.searchParams.set('tool', toolConfig.id);
      window.history.replaceState(null, '', url.toString());

      const shareUrl = url.toString();
      if (navigator.share) {
        try {
          await navigator.share({ title: toolConfig.name, url: shareUrl });
          showToast('Shared URL ready', 'success');
          return;
        } catch (error) {
          const isAbort =
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name?: unknown }).name === 'AbortError';
          if (isAbort) return;
        }
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Share URL copied to clipboard', 'success');
      } catch {
        let success = false;
        try {
          const textarea = document.createElement('textarea');
          textarea.value = shareUrl;
          textarea.style.position = 'fixed';
          textarea.style.top = '0';
          textarea.style.left = '0';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          success = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {
          success = false;
        }
        if (success) {
          showToast('Share URL copied to clipboard', 'success');
        } else {
          throw new Error('Clipboard access denied or not supported');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share URL';
      showToast(message, 'error');
    } finally {
      setIsSharing(false);
    }
  }, [showToast, tool.state.data]);

  /* ------------------------------- shortcuts -------------------------------- */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 'enter') {
        event.preventDefault();
        showToast(
          evaluation.status === 'ok'
            ? `${evaluation.stats.matches} ${evaluation.stats.matches === 1 ? 'match' : 'matches'} in ${evaluation.durationMs} ms`
            : 'Nothing to evaluate',
          evaluation.status === 'ok' ? 'success' : 'error'
        );
        return;
      }
      if (!event.shiftKey && key === 's') {
        event.preventDefault();
        saveCurrentPattern();
        return;
      }
      if (!event.shiftKey) return;
      if (key === 'c') {
        event.preventDefault();
        clearAll();
      } else if (key === 'e') {
        event.preventDefault();
        exportReport('json');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearAll, evaluation, exportReport, saveCurrentPattern, showToast]);

  /* -------------------------------- rendering ------------------------------- */

  const toolbarActions = useMemo(() => ({ ...tool.toolbarActions }), [tool.toolbarActions]);

  const toolbarContent = (
    <>
      <ToolToolbar
        flags={data.flags}
        onToggleFlag={handleToggleFlag}
        onLoadSample={loadSample}
        samples={SAMPLES.map((sample) => ({ id: sample.id, label: sample.label }))}
        onSavePattern={() => saveCurrentPattern()}
        onClear={clearAll}
        onExportReport={exportReport}
        canSave={data.pattern.trim() !== ''}
      />
      <ImportExport
        formats={tool.supportedFormats}
        onExport={tool.handleExport}
        onImport={tool.importFromFile}
        isImporting={tool.isImporting}
        onShare={handleShare}
        isSharing={isSharing}
      />
    </>
  );

  const sidebarContent = (
    <ToolSidebar
      evaluation={evaluation}
      savedPatterns={data.savedPatterns}
      history={data.history}
      onLoadSavedPattern={loadSavedPattern}
      onDeleteSavedPattern={deleteSavedPattern}
      onRestoreHistory={restoreHistory}
      onClearHistory={clearHistory}
      cheatSheet={
        <CheatSheet
          query={data.cheatSheetQuery}
          onQueryChange={setCheatSheetQuery}
          onUsePattern={useCheatEntry}
        />
      }
    />
  );

  const canvasContent = (
    <ToolCanvas
      canvasRef={canvasRef}
      pattern={data.pattern}
      flags={data.flags}
      testText={data.testText}
      evaluation={evaluation}
      onPatternChange={setPattern}
      onTestTextChange={setTestText}
      onToggleFlag={handleToggleFlag}
    />
  );

  const statusBarContent = (
    <>
      <span
        className={`status-slot status-slot-state ${tool.state.isDirty ? 'status-unsaved' : 'status-saved'}`}
      >
        {tool.state.isDirty ? (
          <>
            <span className="status-saving-dot" />
            Unsaved
          </>
        ) : tool.state.lastSaved ? (
          <>Saved {tool.state.lastSaved}</>
        ) : (
          'Ready'
        )}
      </span>
      <span className="status-slot status-slot-title">
        {evaluation.status === 'invalid'
          ? 'Invalid pattern'
          : `${evaluation.stats.matches} matches · /${evaluation.flagString || '—'}/`}
      </span>
      <span className="status-slot status-slot-tool-version">Tool v{toolConfig.version}</span>
      <span className="status-slot status-slot-template-version">
        Template v{templateBaseVersion}
      </span>
    </>
  );

  return (
    <ToolShell
      config={toolConfig}
      actions={toolbarActions}
      sidebarOpen={sidebarOpen}
      onSidebarChange={setSidebarOpen}
      toolbar={toolbarContent}
      sidebar={sidebarContent}
      canvas={canvasContent}
      statusBar={statusBarContent}
    />
  );
}
