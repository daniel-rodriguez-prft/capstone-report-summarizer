import { describe, it, expect } from "vitest";
import { buildSummarizerSystemPrompt, buildSummarizerUserPrompt } from "../src/llm/prompt.js";
import { mockSummarizeReport } from "../src/llm/mock.js";
import { summarizeReportWithLLM } from "../src/llm/client.js";
import { RawFieldReport } from "../src/types.js";
import { analyzeReport } from "../src/heuristics.js";

describe("LLM Prompt & Mock Engine", () => {
  const sampleReport: RawFieldReport = {
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

  describe("System & User Prompts", () => {
    it("contains strict redaction rules and JSON keys in system prompt", () => {
      const systemPrompt = buildSummarizerSystemPrompt();
      expect(systemPrompt).toContain("Northgate FM");
      expect(systemPrompt).toContain("Do NOT include engineer names, technician IDs, or technician phone numbers");
      expect(systemPrompt).toContain("plain language");
      expect(systemPrompt).toContain("what_was_found");
      expect(systemPrompt).toContain("what_was_done");
      expect(systemPrompt).toContain("parts_fitted");
      expect(systemPrompt).toContain("recommendations");
    });

    it("builds user prompt with report details and quality alerts", () => {
      const analysis = analyzeReport(sampleReport);
      const userPrompt = buildSummarizerUserPrompt(sampleReport, analysis);
      expect(userPrompt).toContain("FSR-3001");
      expect(userPrompt).toContain("Chiller CH-04");
      expect(userPrompt).toContain("filter-drier FD-22");
    });
  });

  describe("mockSummarizeReport & summarizeReportWithLLM", () => {
    it("generates structured ReportSummary with all 6 required sections", () => {
      const analysis = analyzeReport(sampleReport);
      const summary = mockSummarizeReport(sampleReport, analysis);

      expect(summary.report_id).toBe("FSR-3001");
      expect(summary.asset).toBe("Chiller CH-04");
      expect(summary.visit_date).toBe("2026-03-02");
      expect(summary.time_on_site.formatted).toContain("08:15 - 10:45 (2.5 hrs)");
      expect(summary.what_was_found).toContain("short-cycling");
      expect(summary.what_was_done).toContain("filter-drier");
      expect(summary.parts_fitted).toEqual(["filter-drier FD-22"]);
      expect(summary.recommendations).toBeDefined();

      // Ensure no raw technician ID or employee name leaked into customer fields
      expect(summary.what_was_found).not.toContain("T-118");
      expect(summary.what_was_done).not.toContain("T-118");
      expect(summary.recommendations).not.toContain("T-118");
    });

    it("summarizeReportWithLLM works with mock option", async () => {
      const analysis = analyzeReport(sampleReport);
      const summary = await summarizeReportWithLLM(sampleReport, analysis, { mock: true });
      expect(summary.report_id).toBe("FSR-3001");
      expect(summary.asset).toBe("Chiller CH-04");
    });

    it("handles sparse reports cleanly with explicit disclosure and no hallucinations", () => {
      const sparseReport: RawFieldReport = {
        report_id: "FSR-3009",
        asset: "Pump P-02",
        technician_id: "T-999",
        arrived_at: "2026-03-05T09:00",
        departed_at: "2026-03-05T09:45",
        stated_duration_hours: 0.75,
        parts_used: [],
        resolution: "OK",
        technician_notes: "",
      };

      const analysis = analyzeReport(sparseReport);
      const summary = mockSummarizeReport(sparseReport, analysis);

      expect(summary.quality_alerts.some((a) => a.includes("Sparse report"))).toBe(true);
      expect(summary.parts_fitted).toHaveLength(0);
      expect(summary.recommendations).toContain("No specific follow-up recommendations recorded");
    });
  });
});
