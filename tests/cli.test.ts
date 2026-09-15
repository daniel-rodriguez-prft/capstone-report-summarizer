import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { runSummarizePipeline, runExportPdfPipeline } from "../src/pipeline.js";

describe("CLI & Pipeline End-to-End Integration", () => {
  const fixturePath = "tests/fixtures/sample-reports.jsonl";
  const tempDraftPath = "tmp/test-draft.md";
  const tempPdfPath = "tmp/test-summary.pdf";

  beforeEach(() => {
    if (!fs.existsSync("tmp")) {
      fs.mkdirSync("tmp", { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync("tmp")) {
      fs.rmSync("tmp", { recursive: true, force: true });
    }
  });

  it("executes summarize pipeline end-to-end and outputs structured review draft", async () => {
    const result = await runSummarizePipeline({
      inputPath: fixturePath,
      outputPath: tempDraftPath,
      mock: true,
    });

    expect(result.summaries).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(fs.existsSync(tempDraftPath)).toBe(true);

    const draftContent = fs.readFileSync(tempDraftPath, "utf8");
    expect(draftContent).toContain("## Report FSR-3001 | Asset: Chiller CH-04");
    expect(draftContent).toContain("## Report FSR-3002 | Asset: AHU-02");
    expect(draftContent).toContain("## Report FSR-3003 | Asset: Pump P-01");
    expect(draftContent).toContain("TIME_DISCREPANCY");
    expect(draftContent).toContain("SPARSE_REPORT");
  });

  it("executes export-pdf pipeline end-to-end and creates valid customer PDF", async () => {
    // Step 1: Generate draft
    await runSummarizePipeline({
      inputPath: fixturePath,
      outputPath: tempDraftPath,
      mock: true,
    });

    // Step 2: Compile PDF from draft
    const exportResult = await runExportPdfPipeline({
      draftPath: tempDraftPath,
      outputPath: tempPdfPath,
    });

    expect(exportResult.summariesCount).toBe(3);
    expect(fs.existsSync(tempPdfPath)).toBe(true);

    const pdfBuffer = fs.readFileSync(tempPdfPath);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
