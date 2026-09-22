import { RawFieldReport, ReportSummary } from "../types.js";
import { analyzeReport } from "../heuristics.js";

/**
 * Deterministically generates a customer-facing ReportSummary without making external LLM API calls.
 * Useful for automated tests, offline verification, and zero-token development.
 */
export function mockSummarizeReport(
  report: RawFieldReport,
  analysis: ReturnType<typeof analyzeReport>
): ReportSummary {
  const visitDate = report.arrived_at.split("T")[0] || report.arrived_at;
  const isSparse = analysis.qualityIssues.some((issue) => issue.type === "SPARSE_REPORT");

  let whatWasFound: string;
  let whatWasDone: string;
  let recommendations: string;

  if (isSparse) {
    whatWasFound = "Routine operational check logged. Minimal initial diagnostic detail recorded by the technician.";
    whatWasDone = report.resolution ? `Completed service visit: ${report.resolution.trim()}` : "Routine visual check and service completed.";
    recommendations = "No specific follow-up recommendations recorded.";
  } else {
    // Plain English synthesis
    const notesLower = (report.technician_notes || "").toLowerCase();
    const resolutionLower = (report.resolution || "").toLowerCase();

    if (notesLower.includes("short-cycling") || resolutionLower.includes("clogged")) {
      whatWasFound = "Unit had been short-cycling due to a clogged filter-drier restricting refrigerant flow.";
    } else if (report.resolution) {
      whatWasFound = `Inspection identified maintenance requirements for ${report.asset}.`;
    } else {
      whatWasFound = "Routine system check and inspection performed.";
    }

    if (report.resolution) {
      whatWasDone = report.resolution
        .replace(/system recharged/i, "recharged the system")
        .replace(/running within spec\.?/i, "confirmed the unit is running within operating specifications.");
      if (!whatWasDone.endsWith(".")) {
        whatWasDone += ".";
      }
    } else {
      whatWasDone = "General inspection and adjustment performed.";
    }

    if (notesLower.includes("superheat normal") || resolutionLower.includes("within spec")) {
      recommendations = "All operating parameters verified normal. Continue regular preventative maintenance schedule.";
    } else {
      recommendations = "Continue regular monitoring and report any performance variations.";
    }
  }

  return {
    report_id: report.report_id,
    asset: report.asset,
    visit_date: visitDate,
    time_on_site: analysis.timeOnSite,
    quality_alerts: analysis.formattedAlerts,
    what_was_found: whatWasFound,
    what_was_done: whatWasDone,
    parts_fitted: report.parts_used || [],
    recommendations,
  };
}
