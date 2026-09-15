import { describe, it, expect } from "vitest";
import { generateDraftMarkdown } from "../src/markdown/generator.js";
import { parseDraftMarkdown } from "../src/markdown/parser.js";
import { ReportSummary } from "../src/types.js";

describe("Bidirectional Markdown Review Draft", () => {
  const sampleSummaries: ReportSummary[] = [
    {
      report_id: "FSR-3001",
      asset: "Chiller CH-04",
      visit_date: "2026-03-02",
      time_on_site: {
        arrived_at: "2026-03-02T08:15",
        departed_at: "2026-03-02T10:45",
        calculated_hours: 2.5,
        stated_hours: 2.5,
        formatted: "08:15 - 10:45 (2.5 hrs)",
      },
      redaction_disclosure:
        "Notice: Report FSR-3001 contained internal technician identifier (T-118) and internal diagnostic notes; these have been omitted from this customer summary.",
      quality_alerts: [],
      what_was_found: "Unit had been short-cycling due to a clogged filter-drier.",
      what_was_done: "Replaced filter-drier, recharged refrigerant, and verified system operating pressure.",
      parts_fitted: ["filter-drier FD-22"],
      recommendations: "Continue regular preventative maintenance schedule.",
    },
    {
      report_id: "FSR-3002",
      asset: "AHU-02",
      visit_date: "2026-03-02",
      time_on_site: {
        arrived_at: "2026-03-02T11:00",
        departed_at: "2026-03-02T12:00",
        calculated_hours: 1.0,
        stated_hours: 2.0,
        formatted: "11:00 - 12:00 (1.0 hr)",
      },
      redaction_disclosure:
        "Notice: Report FSR-3002 contained internal technician identifiers and internal diagnostic notes; these have been omitted from this customer summary.",
      quality_alerts: ["⚠️ TIME_DISCREPANCY: Stated duration was 2.0 hrs, but timestamps indicate 1.0 hr."],
      what_was_found: "Routine filter and belt inspection.",
      what_was_done: "Adjusted fan belt tension and cleaned filter housing.",
      parts_fitted: [],
      recommendations: "Inspect belt wear in 3 months.",
    },
  ];

  it("serializes ReportSummary array into human-readable Markdown draft", () => {
    const markdown = generateDraftMarkdown(sampleSummaries);
    expect(markdown).toContain("Northgate FM Field Report Summaries (Draft for Review)");
    expect(markdown).toContain("## Report FSR-3001 | Asset: Chiller CH-04");
    expect(markdown).toContain("### 1. What was found");
    expect(markdown).toContain("filter-drier FD-22");
    expect(markdown).toContain("⚠️ TIME_DISCREPANCY");
  });

  it("parses generated Markdown draft back into structured ReportSummary array", () => {
    const markdown = generateDraftMarkdown(sampleSummaries);
    const parsed = parseDraftMarkdown(markdown);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].report_id).toBe("FSR-3001");
    expect(parsed[0].asset).toBe("Chiller CH-04");
    expect(parsed[0].what_was_found).toBe(sampleSummaries[0].what_was_found);
    expect(parsed[0].what_was_done).toBe(sampleSummaries[0].what_was_done);
    expect(parsed[0].parts_fitted).toEqual(["filter-drier FD-22"]);
    expect(parsed[0].recommendations).toBe(sampleSummaries[0].recommendations);

    expect(parsed[1].report_id).toBe("FSR-3002");
    expect(parsed[1].asset).toBe("AHU-02");
    expect(parsed[1].parts_fitted).toEqual([]);
    expect(parsed[1].quality_alerts).toEqual([
      "⚠️ TIME_DISCREPANCY: Stated duration was 2.0 hrs, but timestamps indicate 1.0 hr.",
    ]);
  });

  it("faithfully captures manual reviewer edits in Markdown", () => {
    const markdown = generateDraftMarkdown(sampleSummaries);
    // Simulate reviewer editing the text in their editor
    const editedMarkdown = markdown
      .replace(
        "Unit had been short-cycling due to a clogged filter-drier.",
        "REVIEWER EDIT: The primary chiller experienced intermittent short-cycling due to moisture in the refrigerant line."
      )
      .replace("- filter-drier FD-22", "- filter-drier FD-22\n- Schrader valve core");

    const parsed = parseDraftMarkdown(editedMarkdown);
    expect(parsed[0].what_was_found).toBe(
      "REVIEWER EDIT: The primary chiller experienced intermittent short-cycling due to moisture in the refrigerant line."
    );
    expect(parsed[0].parts_fitted).toEqual(["filter-drier FD-22", "Schrader valve core"]);
  });
});
