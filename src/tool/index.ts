export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './tool.config';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export { regexTool, initialRegexState, normalizeRegexState } from './tool-definition';
export { ToolCanvas } from './components/tool-canvas';
export { ToolToolbar } from './components/tool-toolbar';
export { ToolSidebar } from './components/tool-sidebar';
export { CheatSheet } from './components/cheat-sheet';
export { FlagToggle } from './components/flag-toggle';
export type { ReportFormat } from './components/tool-toolbar';
export type {
  CaptureGroup,
  CompileResult,
  HighlightSegment,
  RegexEvaluation,
  RegexMatch,
  RegexStats,
} from './lib/regex';
export {
  compileRegex,
  evaluateRegex,
  extractGroups,
  flagsToString,
  highlightSegments,
  listCaptureGroups,
  normalizeFlags,
  toggleFlag,
  zeroWidthPositions,
} from './lib/regex';
export type { CheatSheetCategory, CheatSheetEntry } from './lib/cheat-sheet';
export { CHEAT_SHEET, filterCheatSheet, groupCheatSheet } from './lib/cheat-sheet';
export type { ExplanationStep } from './lib/explain';
export { explainPattern, summarizePattern } from './lib/explain';
export type { SampleTestString } from './lib/samples';
export { SAMPLES, findSample } from './lib/samples';
export type { RegexReport } from './lib/report';
export { buildReport, reportToMarkdown, reportToJson } from './lib/report';
export { downloadTextFile, reportFilename } from './lib/download';
export type { HistoryEntry, RegexActions, RegexFlag, RegexState, SavedPattern } from './types';
export {
  FLAG_INFO,
  MAX_HISTORY_ENTRIES,
  MAX_MATCHES,
  MAX_PATTERN_LENGTH,
  MAX_RENDERED_MATCHES,
  MAX_SAVED_PATTERNS,
  MAX_TEST_TEXT_LENGTH,
  REGEX_FLAGS,
} from './types';
