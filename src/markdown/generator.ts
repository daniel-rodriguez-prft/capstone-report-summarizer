import { ReportSummary } from "../types.js";

/**
 * Serializes ReportSummary array into a structured, human-editable Markdown document.
 */
export function generateDraftMarkdown(summaries: ReportSummary[]): string {
  const lines: string[] = [
    "# Northgate FM Field Report Summaries (Draft for Review)",
    "",
    "> Instructions: Review and edit the customer summaries below as needed.",
    "> Once finalized, run `northgate export-pdf <draft-file> --out <output.pdf>` to compile the customer PDF.",
    "",
  ];

  for (const summary of summaries) {
    lines.push(`## Report ${summary.report_id} | Asset: ${summary.asset}`);
    lines.push(`- **Visit Date**: ${summary.visit_date}`);
    lines.push(
      `- **Arrival / Departure**: ${summary.time_on_site.arrived_at} / ${summary.time_on_site.departed_at}`
    );
    lines.push(`- **Time on Site**: ${summary.time_on_site.formatted}`);
    lines.push(
      `- **Stated Hours**: ${summary.time_on_site.stated_hours !== null && summary.time_on_site.stated_hours !== undefined ? summary.time_on_site.stated_hours : "N/A"}`
    );
    lines.push(`- **Calculated Hours**: ${summary.time_on_site.calculated_hours}`);
    lines.push(`- **Redaction Notice**: ${summary.redaction_disclosure}`);
    lines.push("");
    lines.push("### Quality Alerts");
    if (!summary.quality_alerts || summary.quality_alerts.length === 0) {
      lines.push("- None");
    } else {
      for (const alert of summary.quality_alerts) {
        lines.push(`- ${alert}`);
      }
    }
    lines.push("");
    lines.push("### 1. What was found");
    lines.push(summary.what_was_found || "Routine system check and inspection performed.");
    lines.push("");
    lines.push("### 2. What was done");
    lines.push(summary.what_was_done || "Routine maintenance completed.");
    lines.push("");
    lines.push("### 3. Parts fitted");
    if (!summary.parts_fitted || summary.parts_fitted.length === 0) {
      lines.push("- None recorded");
    } else {
      for (const part of summary.parts_fitted) {
        lines.push(`- ${part}`);
      }
    }
    lines.push("");
    lines.push("### 4. Outstanding / Recommended Next Steps");
    lines.push(summary.recommendations || "No specific follow-up recommendations recorded.");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
