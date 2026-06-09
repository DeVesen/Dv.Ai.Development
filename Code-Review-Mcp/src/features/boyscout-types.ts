// ─── BoyScout Orchestrator Contract ───────────────────────────────────────────
// Single source of truth for suggest_boyscout_actions.

export type BoyscoutStack = "angular" | "dotnet";

export type BoyscoutCategory =
  | "compiler"
  | "nullability"
  | "dead_code"
  | "complexity"
  | "untested_api"
  | "extraction";

export type BoyscoutSeverity = "critical" | "warning" | "suggestion";

export interface BoyscoutAction {
  severity: BoyscoutSeverity;
  category: BoyscoutCategory;
  line: number;
  message: string;
  quickfix?: string;
  symbol?: string;
}

export interface BoyscoutFileReport {
  file: string;
  actions: BoyscoutAction[];
}

export interface BoyscoutRunResult {
  stack: BoyscoutStack;
  projectRoot: string;
  compilerGateTriggered: boolean;
  files: BoyscoutFileReport[];
}

export interface BoyscoutRunOptions {
  filePaths: string[];
  type: BoyscoutStack | "auto";
  maxPerFile?: number;
}

export const BOYSCOUT_SEVERITY_WEIGHT: Record<BoyscoutSeverity, number> = {
  critical: 3,
  warning: 2,
  suggestion: 1,
};

export const BOYSCOUT_SEVERITY_ORDER: Record<BoyscoutSeverity, number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
};

export const DEFAULT_MAX_PER_FILE = 5;
