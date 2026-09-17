import fs from "fs";
import path from "path";
import { parseJsonlReports, analyzeReport } from "./heuristics.js";
import { summarizeReportWithLLM } from "./llm/client.js";
import { generateDraftMarkdown } from "./markdown/generator.js";
import { parseDraftMarkdown } from "./markdown/parser.js";
import { writeBatchPdfToFile } from "./pdf/document.js";
import { ReportSummary } from "./types.js";
import parseJSONL from "./tools/jsonl-parser.js";
import { mapConcurrent } from "./tools/concurrent-helper.js";


export interface SummarizePipelineOptions {
  inputPath: string;
  outputPath?: string;
  mock?: boolean;
  model?: string;
  concurrency?: number;
}

export interface SummarizePipelineResult {
  summaries: ReportSummary[];
  draftPath: string;
  errors: Array<{ line: number; error: string }>;
}

export interface ExportPdfPipelineOptions {
  draftPath: string;
  outputPath?: string;
}

export interface ExportPdfPipelineResult {
  summariesCount: number;
  pdfPath: string;
}

/**
 * Runs the ingestion, pre-validation heuristics, and LLM summarization pipeline.
 */
export async function runSummarizePipeline(
  options: SummarizePipelineOptions
): Promise<SummarizePipelineResult> {
  if (!fs.existsSync(options.inputPath)) {
    throw new Error(`Input file not found: ${options.inputPath}`);
  }

  const parsedJsonl = await parseJSONL(options.inputPath);
  const { reports, errors } = parseJsonlReports(parsedJsonl);

  if (errors.length > 0) {
    console.warn(`Encountered ${errors.length} validation warning(s) during JSONL parsing:`);
    for (const err of errors) {
      console.warn(`  - Line ${err.line}: ${err.error}`);
    }
  }

  const concurrency = options.concurrency ?? 5;

  // Process all reports with bounded concurrency
  const summaries = await mapConcurrent(reports, concurrency, async (report) => {
    const analysis = analyzeReport(report);
    return summarizeReportWithLLM(report, analysis, {
      mock: options.mock,
      model: options.model,
    });
  });

  const draftMarkdown = generateDraftMarkdown(summaries);
  const draftPath = options.outputPath || "drafts/summary-draft.md";

  const dir = path.dirname(draftPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(draftPath, draftMarkdown, "utf8");

  return {
    summaries,
    draftPath,
    errors,
  };
}

/**
 * Runs the PDF export pipeline from a reviewed Markdown draft.
 */
export async function runExportPdfPipeline(
  options: ExportPdfPipelineOptions
): Promise<ExportPdfPipelineResult> {
  if (!fs.existsSync(options.draftPath)) {
    throw new Error(`Draft file not found: ${options.draftPath}`);
  }

  const draftMarkdown = fs.readFileSync(options.draftPath, "utf8");
  const summaries = parseDraftMarkdown(draftMarkdown);

  if (summaries.length === 0) {
    console.warn("Warning: No report summaries were found in the provided Markdown draft.");
  }

  const pdfPath = options.outputPath || "output/customer-summary.pdf";
  await writeBatchPdfToFile(summaries, pdfPath);

  return {
    summariesCount: summaries.length,
    pdfPath,
  };
}
