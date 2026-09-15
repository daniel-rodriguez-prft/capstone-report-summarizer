#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import { runSummarizePipeline, runExportPdfPipeline } from "./pipeline.js";

const program = new Command();

program
  .name("northgate")
  .description("Northgate FM Field Report Summarizer CLI tool")
  .version("1.0.0");

program
  .command("summarize")
  .description("Ingest raw JSONL field reports, run heuristics, and generate editable Markdown draft")
  .argument("<inputJsonl>", "Path to raw JSONL field report file")
  .option("-o, --out <draftPath>", "Target path for generated Markdown draft", "drafts/summary-draft.md")
  .option("--mock", "Run in deterministic mock mode without invoking external LLM API")
  .option("-m, --model <modelName>", "Specify LLM model name (default: claude-3-5-sonnet-latest)")
  .action(async (inputJsonl, options) => {
    try {
      console.log(`\n🔍 Processing field reports from: ${inputJsonl}`);
      const result = await runSummarizePipeline({
        inputPath: path.resolve(process.cwd(), inputJsonl),
        outputPath: path.resolve(process.cwd(), options.out),
        mock: options.mock,
        model: options.model,
      });

      console.log(`✅ Successfully processed ${result.summaries.length} report(s).`);
      console.log(`📝 Review Draft written to: ${result.draftPath}`);
      console.log(`\n👉 NEXT STEP: Review and edit ${options.out} in your editor.`);
      console.log(`👉 Once finalized, run: npx northgate export-pdf ${options.out} --out output/customer-summary.pdf\n`);
    } catch (err: any) {
      console.error(`❌ Error during summarization: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("export-pdf")
  .description("Compile approved Markdown draft into customer-facing PDF document")
  .argument("<draftPath>", "Path to reviewed Markdown draft file")
  .option("-o, --out <pdfPath>", "Target path for generated customer PDF", "output/customer-summary.pdf")
  .action(async (draftPath, options) => {
    try {
      console.log(`\n📄 Compiling customer PDF from draft: ${draftPath}`);
      const result = await runExportPdfPipeline({
        draftPath: path.resolve(process.cwd(), draftPath),
        outputPath: path.resolve(process.cwd(), options.out),
      });

      console.log(`✅ Successfully compiled ${result.summariesCount} report(s) into PDF.`);
      console.log(`🎉 Customer PDF generated at: ${result.pdfPath}\n`);
    } catch (err: any) {
      console.error(`❌ Error compiling PDF: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
