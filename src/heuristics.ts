
import { RawFieldReport, RawFieldReportSchema, ReportQualityIssue, TimeOnSite } from "./types.js";

/**
 * Formats numeric hours to consistent human-readable string (e.g. 1.0 hr, 2.5 hrs).
 */
export function formatHoursString(hours: number): string {
  const numStr = hours % 1 === 0 ? hours.toFixed(1) : hours.toString();
  return `${numStr} ${hours === 1 ? "hr" : "hrs"}`;
}

/**
 * Parses raw JSONL string into validated RawFieldReport objects, capturing per-line errors.
 */
export function parseJsonlReports(rawContent: string[]): {
  reports: RawFieldReport[];
  errors: Array<{ line: number; error: string }>;
} {
  const reports: RawFieldReport[] = [];
  const errors: Array<{ line: number; error: string }> = [];

  for (let i = 0; i < rawContent.length; i++) {
    const lineNumber = i + 1;
    const line = rawContent[i].trim();
    if (!line) {
      continue;
    }
    try {
      const parsedJson = JSON.parse(line);
      const validated = RawFieldReportSchema.safeParse(parsedJson);
      if (!validated.success) {
        errors.push({
          line: lineNumber,
          error: validated.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
        });
      } else {
        reports.push(validated.data);
      }
    } catch (err: any) {
      errors.push({
        line: lineNumber,
        error: `Invalid JSON: ${err.message || String(err)}`,
      });
    }
  }

  return { reports, errors };
}

/**
 * Calculates time on site duration and formats readable time range string.
 */
export function calculateTimeOnSite(
  arrivedAt: string,
  departedAt: string,
  statedHours?: number | null
): TimeOnSite {
  const arrivalDate = new Date(arrivedAt);
  const departureDate = new Date(departedAt);

  const isValidArrival = !isNaN(arrivalDate.getTime());
  const isValidDeparture = !isNaN(departureDate.getTime());

  let calculatedHours = 0;
  if (isValidArrival && isValidDeparture) {
    const diffMs = departureDate.getTime() - arrivalDate.getTime();
    calculatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  const formatTimePart = (iso: string) => {
    const match = iso.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : iso;
  };

  const arrTime = formatTimePart(arrivedAt);
  const depTime = formatTimePart(departedAt);

  const formatted = `${arrTime} - ${depTime} (${formatHoursString(calculatedHours)})`;

  return {
    arrived_at: arrivedAt,
    departed_at: departedAt,
    calculated_hours: calculatedHours,
    stated_hours: statedHours ?? null,
    formatted,
  };
}

/**
 * Evaluates data consistency and quality heuristics on a report.
 */
export function detectQualityIssues(
  report: RawFieldReport,
  timeOnSite: TimeOnSite
): ReportQualityIssue[] {
  const issues: ReportQualityIssue[] = [];

  // 1. Time Discrepancy check
  if (
    timeOnSite.stated_hours !== null &&
    timeOnSite.stated_hours !== undefined &&
    Math.abs(timeOnSite.stated_hours - timeOnSite.calculated_hours) > 0.1
  ) {
    issues.push({
      type: "TIME_DISCREPANCY",
      severity: "warning",
      message: `Stated duration was ${formatHoursString(timeOnSite.stated_hours)}, but timestamps indicate ${formatHoursString(timeOnSite.calculated_hours)}.`,
    });
  }

  // 2. Sparse Content check
  const resolutionWords = (report.resolution || "").trim().split(/\s+/).filter(Boolean).length;
  const notesWords = (report.technician_notes || "").trim().split(/\s+/).filter(Boolean).length;
  const totalWords = resolutionWords + notesWords;

  if (totalWords < 5) {
    issues.push({
      type: "SPARSE_REPORT",
      severity: "warning",
      message: "Limited field detail provided for this visit: Technician provided minimal field details.",
    });
  }

  // 3. Parts Inconsistency check
  const partsList = report.parts_used || [];
  const textCombined = `${report.resolution || ""} ${report.technician_notes || ""}`.toLowerCase();
  const replacedKeyword = /\b(replaced|installed|fitted|new\s+part)\b/i.test(textCombined);
  if (replacedKeyword && partsList.length === 0) {
    issues.push({
      type: "PARTS_INCONSISTENCY",
      severity: "info",
      message: "Work notes mention parts replaced or fitted, but parts_used list is empty.",
    });
  }

  return issues;
}

/**
 * Formats standard customer-facing redaction disclosure.
 */
export function buildRedactionDisclosure(report: RawFieldReport): string {
  if (report.technician_id) {
    return `Notice: Report ${report.report_id} contained internal technician identifier (${report.technician_id}) and internal diagnostic notes; these have been omitted from this customer summary.`;
  }
  return `Notice: Report ${report.report_id} contained internal technician identifiers and internal diagnostic notes; these have been omitted from this customer summary.`;
}

/**
 * Runs complete analysis bundle on a single report.
 */
export function analyzeReport(report: RawFieldReport): {
  timeOnSite: TimeOnSite;
  qualityIssues: ReportQualityIssue[];
  redactionDisclosure: string;
  formattedAlerts: string[];
} {
  const timeOnSite = calculateTimeOnSite(
    report.arrived_at,
    report.departed_at,
    report.stated_duration_hours
  );
  const qualityIssues = detectQualityIssues(report, timeOnSite);
  const redactionDisclosure = buildRedactionDisclosure(report);
  const formattedAlerts = qualityIssues.map((issue) => `⚠️ hola ${issue.type}: ${issue.message}`);

  return {
    timeOnSite,
    qualityIssues,
    redactionDisclosure,
    formattedAlerts,
  };
}
