import { describe, it, expect } from "vitest";
import { createBatchPdfDocument, groupAndSortSummaries } from "../src/pdf/document.js";
import { ReportSummary } from "../src/types.js";

describe("Consolidated Minimalist PDF Document Compiler", () => {
  const sampleSummaries: ReportSummary[] = [
    {
      report_id: "FSR-3002",
      asset: "AHU-02",
      visit_date: "2026-03-02",
      time_on_site: {
        arrived_at: "2026-03-02T11:00",
        departed_at: "2026-03-02T12:00",
        calculated_hours: 1.0,
        stated_hours: 1.0,
        formatted: "11:00 - 12:00 (1.0 hr)",
      },
      redaction_disclosure:
        "Notice: Report FSR-3002 contained internal technician identifiers and internal diagnostic notes; these have been omitted from this customer summary.",
      quality_alerts: [],
      what_was_found: "Routine filter and belt inspection.",
      what_was_done: "Adjusted fan belt tension and cleaned filter housing.",
      parts_fitted: [],
      recommendations: "Inspect belt wear in 3 months.",
    },
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
      quality_alerts: ["⚠️ TIME_DISCREPANCY: Stated duration was 2.5 hrs, but timestamps indicate 1.0 hr."],
      what_was_found: "Unit had been short-cycling due to a clogged filter-drier.",
      what_was_done: "Replaced filter-drier, recharged refrigerant, and verified system operating pressure.",
      parts_fitted: ["filter-drier FD-22"],
      recommendations: "Continue regular preventative maintenance schedule.",
    },
    {
      report_id: "FSR-3003",
      asset: "AHU-02",
      visit_date: "2026-03-01",
      time_on_site: {
        arrived_at: "2026-03-01T09:00",
        departed_at: "2026-03-01T10:00",
        calculated_hours: 1.0,
        stated_hours: 1.0,
        formatted: "09:00 - 10:00 (1.0 hr)",
      },
      redaction_disclosure:
        "Notice: Report FSR-3003 contained internal technician identifiers and internal diagnostic notes; these have been omitted from this customer summary.",
      quality_alerts: [],
      what_was_found: "Initial filter check.",
      what_was_done: "Inspected pre-filters.",
      parts_fitted: [],
      recommendations: "Replace filters on next visit.",
    },
  ];

  describe("groupAndSortSummaries", () => {
    it("groups reports by asset and sorts visits chronologically by arrival time", () => {
      const grouped = groupAndSortSummaries(sampleSummaries);
      expect(Object.keys(grouped)).toEqual(["AHU-02", "Chiller CH-04"]);
      expect(grouped["AHU-02"]).toHaveLength(2);
      expect(grouped["AHU-02"][0].report_id).toBe("FSR-3003"); // 2026-03-01 is earlier
      expect(grouped["AHU-02"][1].report_id).toBe("FSR-3002"); // 2026-03-02 is later
      expect(grouped["Chiller CH-04"]).toHaveLength(1);
    });
  });

  describe("generateBatchPdf", () => {
    it("generates a valid PDF", async () => {
      const pdfDoc = createBatchPdfDocument(sampleSummaries);
      expect(pdfDoc.info.Title).toBe('Northgate FM - Customer Field Report Summary');
    });

    it("handles empty summaries array gracefully", async () => {
      const pdfDoc = createBatchPdfDocument([]);
      expect(pdfDoc.info.Title).toBe('Northgate FM - Customer Field Report Summary');
    });
  });
});
