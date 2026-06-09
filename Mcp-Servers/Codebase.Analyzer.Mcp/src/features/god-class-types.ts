export interface GodClassMetrics {
  methodCount: number;
  fieldCount: number;
  lcom: number;
  dependencies: number;
  linesOfCode: number;
}

export interface GodClassCandidate {
  class: string;
  file: string;
  line: number;
  metrics: GodClassMetrics;
  urgency: GodClassUrgency;
  reasons: string[];
  rankScore: number;
}

export interface GodClassScanResult {
  candidates: GodClassCandidate[];
  capReached?: boolean;
  scannedClassCount: number;
}

export type GodClassUrgency = "critical" | "high" | "medium" | "low";

export interface GodClassThresholds {
  methodCount: { warning: number; critical: number };
  linesOfCode: { warning: number; critical: number };
  lcom: { warning: number; critical: number };
  dependencies: { warning: number; critical: number };
}

export const GOD_CLASS_THRESHOLDS: GodClassThresholds = {
  methodCount: { warning: 15, critical: 25 },
  linesOfCode: { warning: 300, critical: 600 },
  lcom: { warning: 0.6, critical: 0.8 },
  dependencies: { warning: 8, critical: 12 },
};

type MetricKey = keyof GodClassMetrics;

const METRIC_LABELS: Record<MetricKey, string> = {
  methodCount: "methodCount",
  fieldCount: "fieldCount",
  lcom: "lcom",
  dependencies: "dependencies",
  linesOfCode: "linesOfCode",
};

const SCORED_METRICS: (keyof Omit<GodClassThresholds, never>)[] = [
  "methodCount",
  "linesOfCode",
  "lcom",
  "dependencies",
];

function thresholdViolations(
  metrics: GodClassMetrics,
  thresholds: GodClassThresholds = GOD_CLASS_THRESHOLDS,
): { warnings: string[]; criticals: string[] } {
  const warnings: string[] = [];
  const criticals: string[] = [];

  for (const key of SCORED_METRICS) {
    const value = metrics[key as MetricKey];
    const t = thresholds[key];
    const label = METRIC_LABELS[key as MetricKey];
    if (value >= t.critical) criticals.push(`${label} > ${t.critical}`);
    else if (value >= t.warning) warnings.push(`${label} > ${t.warning}`);
  }

  return { warnings, criticals };
}

export function scoreGodClass(
  metrics: GodClassMetrics,
  thresholds: GodClassThresholds = GOD_CLASS_THRESHOLDS,
): { urgency: GodClassUrgency; reasons: string[]; rankScore: number } {
  const { warnings, criticals } = thresholdViolations(metrics, thresholds);
  const reasons = [...criticals, ...warnings];

  let urgency: GodClassUrgency;
  if (criticals.length >= 2) urgency = "critical";
  else if (criticals.length >= 1 || warnings.length >= 3) urgency = "high";
  else if (warnings.length >= 2) urgency = "medium";
  else urgency = "low";

  const urgencyRank = { critical: 4, high: 3, medium: 2, low: 1 }[urgency];
  const metricSum =
    (metrics.methodCount >= thresholds.methodCount.warning ? 1 : 0) +
    (metrics.linesOfCode >= thresholds.linesOfCode.warning ? 1 : 0) +
    (metrics.lcom >= thresholds.lcom.warning ? 1 : 0) +
    (metrics.dependencies >= thresholds.dependencies.warning ? 1 : 0);

  return { urgency, reasons, rankScore: urgencyRank * 100 + metricSum * 10 + metrics.methodCount };
}

export function toGodClassCandidate(
  className: string,
  file: string,
  line: number,
  metrics: GodClassMetrics,
): GodClassCandidate | null {
  const scored = scoreGodClass(metrics);
  if (scored.reasons.length === 0) return null;
  return {
    class: className,
    file,
    line,
    metrics,
    urgency: scored.urgency,
    reasons: scored.reasons,
    rankScore: scored.rankScore,
  };
}

export function filterAndRank(candidates: GodClassCandidate[], top: number): GodClassCandidate[] {
  return [...candidates]
    .sort((a, b) => b.rankScore - a.rankScore || b.metrics.linesOfCode - a.metrics.linesOfCode)
    .slice(0, top);
}
