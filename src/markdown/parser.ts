import { ReportSummary, TimeOnSite } from "../types.js";

/**
 * Parses an edited Markdown draft back into structured ReportSummary objects.
 */
export function parseDraftMarkdown(markdown: string): ReportSummary[] {
  const summaries: ReportSummary[] = [];

  // Split by report blocks: "## Report <id> | Asset: <asset>"
  const reportRegex = /##\s+Report\s+([^|\n]+)\s*\|\s*Asset:\s*([^\n]+)/g;
  const matches = [...markdown.matchAll(reportRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const reportId = match[1].trim();
    const asset = match[2].trim();

    const startIndex = match.index! + match[0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index! : markdown.length;
    const block = markdown.slice(startIndex, endIndex);

    // Extract metadata
    const visitDateMatch = block.match(/- \*\*Visit Date\*\*:\s*([^\n]+)/);
    const visitDate = visitDateMatch ? visitDateMatch[1].trim() : "";

    const arrivalDepMatch = block.match(/- \*\*Arrival \/ Departure\*\*:\s*([^/\n]+)\s*\/\s*([^\n]+)/);
    const arrivedAt = arrivalDepMatch ? arrivalDepMatch[1].trim() : "";
    const departedAt = arrivalDepMatch ? arrivalDepMatch[2].trim() : "";

    const timeOnSiteMatch = block.match(/- \*\*Time on Site\*\*:\s*([^\n]+)/);
    const formattedTime = timeOnSiteMatch ? timeOnSiteMatch[1].trim() : "";

    const statedHoursMatch = block.match(/- \*\*Stated Hours\*\*:\s*([^\n]+)/);
    const statedHoursStr = statedHoursMatch ? statedHoursMatch[1].trim() : "N/A";
    const statedHours = statedHoursStr === "N/A" ? null : parseFloat(statedHoursStr);

    const calcHoursMatch = block.match(/- \*\*Calculated Hours\*\*:\s*([^\n]+)/);
    const calculatedHours = calcHoursMatch ? parseFloat(calcHoursMatch[1].trim()) : 0;

    const redactionMatch = block.match(/- \*\*Redaction Notice\*\*:\s*([^\n]+)/);
    const redactionDisclosure = redactionMatch ? redactionMatch[1].trim() : "";

    // Extract Quality Alerts
    const qualityAlerts: string[] = [];
    const alertsBlockMatch = block.match(/### Quality Alerts([\s\S]*?)(?=### 1\. What was found)/);
    if (alertsBlockMatch) {
      const alertLines = alertsBlockMatch[1].split("\n");
      for (const line of alertLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("- ") && !trimmed.toLowerCase().startsWith("- none")) {
          qualityAlerts.push(trimmed.slice(2).trim());
        }
      }
    }

    // Extract Sections
    const extractSection = (headingRegex: RegExp, nextHeadingRegex: RegExp): string => {
      const sectionMatch = block.match(headingRegex);
      if (!sectionMatch || sectionMatch.index === undefined) return "";
      const contentStart = sectionMatch.index + sectionMatch[0].length;
      const rest = block.slice(contentStart);
      const nextMatch = rest.match(nextHeadingRegex);
      const content = nextMatch && nextMatch.index !== undefined ? rest.slice(0, nextMatch.index) : rest;
      return content.trim();
    };

    const whatWasFound = extractSection(/### 1\. What was found/, /### 2\. What was done/);
    const whatWasDone = extractSection(/### 2\. What was done/, /### 3\. Parts fitted/);
    const partsRaw = extractSection(/### 3\. Parts fitted/, /### 4\. Outstanding/);
    
    // Recommendations section goes until next separator (---) or EOF
    const recMatch = block.match(/### 4\. Outstanding[\s\S]*?\n/);
    let recommendations = "";
    if (recMatch && recMatch.index !== undefined) {
      const contentStart = recMatch.index + recMatch[0].length;
      const rest = block.slice(contentStart);
      const dividerMatch = rest.match(/---|## /);
      recommendations = dividerMatch && dividerMatch.index !== undefined ? rest.slice(0, dividerMatch.index).trim() : rest.trim();
    }

    // Parse parts fitted list
    const partsFitted: string[] = [];
    for (const line of partsRaw.split("\n")) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("- ") &&
        !trimmed.toLowerCase().startsWith("- none") &&
        !trimmed.toLowerCase().includes("none recorded")
      ) {
        partsFitted.push(trimmed.slice(2).trim());
      }
    }

    const timeOnSite: TimeOnSite = {
      arrived_at: arrivedAt,
      departed_at: departedAt,
      calculated_hours: isNaN(calculatedHours) ? 0 : calculatedHours,
      stated_hours: statedHours !== null && !isNaN(statedHours) ? statedHours : null,
      formatted: formattedTime,
    };

    summaries.push({
      report_id: reportId,
      asset,
      visit_date: visitDate,
      time_on_site: timeOnSite,
      redaction_disclosure: redactionDisclosure,
      quality_alerts: qualityAlerts,
      what_was_found: whatWasFound,
      what_was_done: whatWasDone,
      parts_fitted: partsFitted,
      recommendations,
    });
  }

  return summaries;
}
