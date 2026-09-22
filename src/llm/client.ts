import dotenv from "dotenv";
dotenv.config();

import { RawFieldReport, ReportSummary } from "../types.js";
import { analyzeReport } from "../heuristics.js";
import { buildSummarizerSystemPrompt, buildSummarizerUserPrompt } from "./prompt.js";
import { mockSummarizeReport } from "./mock.js";
import { Portkey } from 'portkey-ai';

export interface LLMClientOptions {
  mock?: boolean;
  model?: string;
}

/**
 * Summarizes a single field report using Portkey AI Gateway or fallback mock.
 */
export async function summarizeReportWithLLM(
  report: RawFieldReport,
  analysis: ReturnType<typeof analyzeReport>,
  options?: LLMClientOptions
): Promise<ReportSummary> {
  if (
    options?.mock || !process.env.PORTKEY_API_KEY
  ) {
    return mockSummarizeReport(report, analysis);
  }

  const systemPrompt = buildSummarizerSystemPrompt();
  const userPrompt = buildSummarizerUserPrompt(report, analysis);
  const model = options?.model || process.env.MODEL_NAME || "anthropic.claude-3-7-sonnet@20250219";
  const portkey = new Portkey({
    baseURL: process.env.PORTKEY_BASE_URL,
    apiKey: process.env.PORTKEY_API_KEY,
    provider: '@dsvertex'
  });

  try {
    let jsonText = "";

    const response = await portkey.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model,
      max_tokens: 512,
    }, {
      config: { "cache": { "mode": "semantic" } }
    });
    jsonText = response.choices[0].message?.content as string || "{}";

    // Clean markdown code blocks if returned
    const cleanedJson = jsonText.replace(/^\s*```(json)?/m, "").replace(/```\s*$/m, "").trim();
    const parsed = JSON.parse(cleanedJson);

    const visitDate = report.arrived_at.split("T")[0] || report.arrived_at;

    return {
      report_id: report.report_id,
      asset: report.asset,
      visit_date: visitDate,
      time_on_site: analysis.timeOnSite,
      quality_alerts: analysis.formattedAlerts,
      what_was_found: parsed.what_was_found || "Routine system check and inspection performed.",
      what_was_done: parsed.what_was_done || (report.resolution || "Routine service completed."),
      parts_fitted: Array.isArray(parsed.parts_fitted) ? parsed.parts_fitted : report.parts_used || [],
      recommendations: parsed.recommendations || "No specific follow-up recommendations recorded.",
      reason: parsed.reason
    };
  } catch (error: any) {
    console.warn(`LLM call failed for ${report.report_id}, falling back to deterministic mock: ${error.message}`);
    return mockSummarizeReport(report, analysis);
  }
}
