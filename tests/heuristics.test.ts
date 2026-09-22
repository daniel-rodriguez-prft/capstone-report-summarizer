import { describe, it, expect } from "vitest";
import {
  parseJsonlReports,
  calculateTimeOnSite,
  detectQualityIssues,
  analyzeReport,
} from "../src/heuristics.js";
import { RawFieldReport } from "../src/types.js";

describe("Domain Ingestion & Pre-Validation Heuristics", () => {
  describe("parseJsonlReports", () => {
    it("parses valid JSONL content into RawFieldReport array", async () => {
      const jsonl = [
        JSON.stringify({
          report_id: "FSR-3001",
          asset: "Chiller CH-04",
          technician_id: "T-118",
          arrived_at: "2026-03-02T08:15",
          departed_at: "2026-03-02T10:45",
          stated_duration_hours: 2.5,
          parts_used: ["filter-drier FD-22"],
          resolution: "Replaced clogged filter-drier, system recharged, running within spec.",
          technician_notes: "Unit had been short-cycling. Confirmed superheat normal after recharge.",
        }),
        JSON.stringify({
          report_id: "FSR-3002",
          asset: "AHU-02",
          technician_id: "T-205",
          arrived_at: "2026-03-02T11:00",
          departed_at: "2026-03-02T12:00",
          stated_duration_hours: 1.0,
          parts_used: [],
          resolution: "Monthly filter inspection complete. Belts adjusted.",
          technician_notes: "Minor belt slack corrected.",
        }),
      ];

      const result = parseJsonlReports(jsonl);
      expect(result.errors).toHaveLength(0);
      expect(result.reports).toHaveLength(2);
      expect(result.reports[0].report_id).toBe("FSR-3001");
      expect(result.reports[1].asset).toBe("AHU-02");
    });

    it("handles empty lines and captures invalid JSON/schema lines gracefully", () => {
      const jsonl = [
        "",
        JSON.stringify({
          report_id: "FSR-3001",
          asset: "Chiller CH-04",
          arrived_at: "2026-03-02T08:15",
          departed_at: "2026-03-02T10:45",
        }),
        "invalid json line",
        JSON.stringify({ report_id: "FSR-3003" }), // missing asset, arrived_at, departed_at
      ];

      const result = parseJsonlReports(jsonl);
      expect(result.reports).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].line).toBe(3);
      expect(result.errors[1].line).toBe(4);
    });
  });

  describe("calculateTimeOnSite", () => {
    it("computes exact calculated hours between arrival and departure", () => {
      const time = calculateTimeOnSite("2026-03-02T08:15", "2026-03-02T10:45", 2.5);
      expect(time.calculated_hours).toBe(2.5);
      expect(time.stated_hours).toBe(2.5);
      expect(time.formatted).toContain("08:15");
      expect(time.formatted).toContain("10:45");
      expect(time.formatted).toContain("2.5 hrs");
    });

    it("formats time on site accurately across morning and afternoon windows", () => {
      const time = calculateTimeOnSite("2026-03-02T13:00", "2026-03-02T14:30", 1.5);
      expect(time.calculated_hours).toBe(1.5);
      expect(time.formatted).toBe("13:00 - 14:30 (1.5 hrs)");
    });
  });

  describe("detectQualityIssues", () => {
    it("detects time discrepancy when stated hours differ from calculated hours by > 0.1 hr", () => {
      const report: RawFieldReport = {
        report_id: "FSR-3005",
        asset: "Pump P-01",
        technician_id: "T-118",
        arrived_at: "2026-03-02T08:00",
        departed_at: "2026-03-02T09:00", // 1.0 hr calculated
        stated_duration_hours: 2.5,       // 2.5 hrs stated
        parts_used: [],
        resolution: "Inspected mechanical seals and aligned motor shaft coupling successfully.",
        technician_notes: "Shaft alignment within 0.02mm tolerance.",
      };

      const time = calculateTimeOnSite(report.arrived_at, report.departed_at, report.stated_duration_hours);
      const issues = detectQualityIssues(report, time);

      const timeIssue = issues.find((i) => i.type === "TIME_DISCREPANCY");
      expect(timeIssue).toBeDefined();
      expect(timeIssue?.message).toContain("Stated duration was 2.5 hrs, but timestamps indicate 1.0 hr");
    });

    it("detects sparse content when notes and resolution are fewer than 5 words", () => {
      const report: RawFieldReport = {
        report_id: "FSR-3006",
        asset: "Boiler B-01",
        technician_id: "T-118",
        arrived_at: "2026-03-02T08:00",
        departed_at: "2026-03-02T09:00",
        stated_duration_hours: 1.0,
        parts_used: [],
        resolution: "Checked unit, OK.",
        technician_notes: "None.",
      };

      const time = calculateTimeOnSite(report.arrived_at, report.departed_at, report.stated_duration_hours);
      const issues = detectQualityIssues(report, time);

      const sparseIssue = issues.find((i) => i.type === "SPARSE_REPORT");
      expect(sparseIssue).toBeDefined();
      expect(sparseIssue?.message).toContain("Technician provided minimal field details");
    });
  });

  describe("analyzeReport", () => {
    it("returns comprehensive report analysis bundle", () => {
      const report: RawFieldReport = {
        report_id: "FSR-3001",
        asset: "Chiller CH-04",
        technician_id: "T-118",
        arrived_at: "2026-03-02T08:15",
        departed_at: "2026-03-02T10:45",
        stated_duration_hours: 2.5,
        parts_used: ["filter-drier FD-22"],
        resolution: "Replaced clogged filter-drier, system recharged, running within spec.",
        technician_notes: "Unit had been short-cycling. Confirmed superheat normal after recharge.",
      };

      const analysis = analyzeReport(report);
      expect(analysis.timeOnSite.calculated_hours).toBe(2.5);
      expect(analysis.qualityIssues).toHaveLength(0);
      expect(analysis.formattedAlerts).toHaveLength(0);
    });
  });
});
