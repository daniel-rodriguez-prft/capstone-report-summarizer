import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { ReportSummary } from "../types.js";
import { PDF_STYLES } from "./styles.js";

/**
 * Groups report summaries by asset and sorts visits chronologically.
 */
export function groupAndSortSummaries(
  summaries: ReportSummary[]
): Record<string, ReportSummary[]> {
  const grouped: Record<string, ReportSummary[]> = {};

  for (const summary of summaries) {
    if (!grouped[summary.asset]) {
      grouped[summary.asset] = [];
    }
    grouped[summary.asset].push(summary);
  }

  // Sort assets alphabetically
  const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const result: Record<string, ReportSummary[]> = {};

  for (const key of sortedKeys) {
    // Sort visits within asset chronologically
    result[key] = grouped[key].sort((a, b) => {
      const timeA = new Date(a.time_on_site.arrived_at).getTime() || 0;
      const timeB = new Date(b.time_on_site.arrived_at).getTime() || 0;
      return timeA - timeB;
    });
  }

  return result;
}

/**
 * Generates a consolidated minimalist PDF buffer from an array of ReportSummaries.
 */
export async function generateBatchPdf(summaries: ReportSummary[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PDF_STYLES.margins.top,
      bufferPages: true,
      info: {
        Title: "Northgate FM - Customer Field Report Summary",
        Author: "Northgate FM",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const contentWidth = doc.page.width - PDF_STYLES.margins.left - PDF_STYLES.margins.right;

    // Helper: Check page space and add page if needed
    const ensureSpace = (neededHeight: number) => {
      if (doc.y + neededHeight > doc.page.height - PDF_STYLES.margins.bottom) {
        doc.addPage();
      }
    };

    // Header
    doc
      .fontSize(16)
      .font(PDF_STYLES.fonts.bold)
      .fillColor(PDF_STYLES.colors.text)
      .text("NORTHGATE FM", { align: "left" });

    doc
      .fontSize(11)
      .font(PDF_STYLES.fonts.regular)
      .fillColor(PDF_STYLES.colors.secondary)
      .text("Facility Maintenance Visit Summary (Customer Deliverable)", { align: "left" });

    doc.moveDown(0.5);

    // Batch Metadata Sub-bar
    const grouped = groupAndSortSummaries(summaries);
    const assetCount = Object.keys(grouped).length;
    const totalVisits = summaries.length;
    const reportDate = new Date().toISOString().split("T")[0];

    doc
      .fontSize(9)
      .font(PDF_STYLES.fonts.regular)
      .fillColor(PDF_STYLES.colors.muted)
      .text(
        `Generated: ${reportDate}   |   Assets Serviced: ${assetCount}   |   Total Visits: ${totalVisits}`,
        { align: "left" }
      );

    doc
      .moveTo(PDF_STYLES.margins.left, doc.y + 4)
      .lineTo(doc.page.width - PDF_STYLES.margins.right, doc.y + 4)
      .strokeColor(PDF_STYLES.colors.border)
      .lineWidth(0.75)
      .stroke();

    doc.moveDown(1);

    if (summaries.length === 0) {
      doc
        .fontSize(10)
        .font(PDF_STYLES.fonts.regular)
        .fillColor(PDF_STYLES.colors.secondary)
        .text("No visit summaries found in this batch.", { align: "center" });
    } else {
      // Iterate Asset Groups
      for (const [assetName, visits] of Object.entries(grouped)) {
        ensureSpace(80);

        // Asset Group Title Banner
        doc
          .fontSize(12)
          .font(PDF_STYLES.fonts.bold)
          .fillColor(PDF_STYLES.colors.text)
          .text(`Asset: ${assetName}`, { underline: false });

        doc.moveDown(0.4);

        for (const visit of visits) {
          ensureSpace(120);

          // Visit Card Header Box
          const cardStartY = doc.y;

          doc
            .fontSize(9.5)
            .font(PDF_STYLES.fonts.bold)
            .fillColor(PDF_STYLES.colors.text)
            .text(`Report Reference: ${visit.report_id}   |   Visit Date: ${visit.visit_date}`);

          doc
            .fontSize(9)
            .font(PDF_STYLES.fonts.regular)
            .fillColor(PDF_STYLES.colors.secondary)
            .text(`Time on Site: ${visit.time_on_site.formatted}`);

          doc.moveDown(0.3);

          // Redaction Notice
          if (visit.redaction_disclosure) {
            doc
              .fontSize(8)
              .font(PDF_STYLES.fonts.oblique)
              .fillColor(PDF_STYLES.colors.redactionText)
              .text(visit.redaction_disclosure);
            doc.moveDown(0.3);
          }

          // Quality Warnings
          if (visit.quality_alerts && visit.quality_alerts.length > 0) {
            for (const alert of visit.quality_alerts) {
              doc
                .fontSize(8.5)
                .font(PDF_STYLES.fonts.bold)
                .fillColor(PDF_STYLES.colors.alertText)
                .text(alert);
            }
            doc.moveDown(0.3);
          }

          // Section 1: What was found
          doc
            .fontSize(9)
            .font(PDF_STYLES.fonts.bold)
            .fillColor(PDF_STYLES.colors.text)
            .text("1. What was found:");
          doc
            .fontSize(8.5)
            .font(PDF_STYLES.fonts.regular)
            .fillColor(PDF_STYLES.colors.secondary)
            .text(visit.what_was_found || "Routine inspection logged.", { indent: 10 });
          doc.moveDown(0.3);

          // Section 2: What was done
          doc
            .fontSize(9)
            .font(PDF_STYLES.fonts.bold)
            .fillColor(PDF_STYLES.colors.text)
            .text("2. What was done:");
          doc
            .fontSize(8.5)
            .font(PDF_STYLES.fonts.regular)
            .fillColor(PDF_STYLES.colors.secondary)
            .text(visit.what_was_done || "Routine maintenance completed.", { indent: 10 });
          doc.moveDown(0.3);

          // Section 3: Parts fitted
          doc
            .fontSize(9)
            .font(PDF_STYLES.fonts.bold)
            .fillColor(PDF_STYLES.colors.text)
            .text("3. Parts fitted:");
          if (visit.parts_fitted && visit.parts_fitted.length > 0) {
            for (const part of visit.parts_fitted) {
              doc
                .fontSize(8.5)
                .font(PDF_STYLES.fonts.regular)
                .fillColor(PDF_STYLES.colors.secondary)
                .text(`• ${part}`, { indent: 15 });
            }
          } else {
            doc
              .fontSize(8.5)
              .font(PDF_STYLES.fonts.regular)
              .fillColor(PDF_STYLES.colors.secondary)
              .text("None recorded", { indent: 15 });
          }
          doc.moveDown(0.3);

          // Section 4: Recommendations
          doc
            .fontSize(9)
            .font(PDF_STYLES.fonts.bold)
            .fillColor(PDF_STYLES.colors.text)
            .text("4. Outstanding / Recommended Next Steps:");
          doc
            .fontSize(8.5)
            .font(PDF_STYLES.fonts.regular)
            .fillColor(PDF_STYLES.colors.secondary)
            .text(visit.recommendations || "No specific follow-up recommendations recorded.", { indent: 10 });

          doc.moveDown(0.8);

          // Visit Divider
          doc
            .moveTo(PDF_STYLES.margins.left, doc.y)
            .lineTo(doc.page.width - PDF_STYLES.margins.right, doc.y)
            .strokeColor(PDF_STYLES.colors.cardBorder)
            .lineWidth(0.5)
            .stroke();

          doc.moveDown(0.8);
        }
      }
    }

    doc.end();
  });
}

/**
 * Writes batch PDF directly to a target file path.
 */
export async function writeBatchPdfToFile(
  summaries: ReportSummary[],
  outputPath: string
): Promise<void> {
  const buffer = await generateBatchPdf(summaries);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, buffer);
}
