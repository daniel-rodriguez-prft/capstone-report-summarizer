import { z } from 'zod';

export const RawFieldReportSchema = z.object({
  report_id: z.string().min(1, "report_id is required"),
  asset: z.string().min(1, "asset is required"),
  technician_id: z.string().optional().nullable(),
  arrived_at: z.string().min(1, "arrived_at is required"),
  departed_at: z.string().min(1, "departed_at is required"),
  stated_duration_hours: z.number().optional().nullable(),
  parts_used: z.array(z.string()).optional().default([]),
  resolution: z.string().optional().default(''),
  technician_notes: z.string().optional().default(''),
});

export type RawFieldReport = z.infer<typeof RawFieldReportSchema>;

export interface TimeOnSite {
  arrived_at: string;
  departed_at: string;
  calculated_hours: number;
  stated_hours?: number | null;
  formatted: string;
}

export interface ReportQualityIssue {
  type: 'TIME_DISCREPANCY' | 'SPARSE_REPORT' | 'PARTS_INCONSISTENCY' | 'INVALID_TIMESTAMP';
  severity: 'warning' | 'info';
  message: string;
}

export interface ReportSummary {
  report_id: string;
  asset: string;
  visit_date: string;
  time_on_site: TimeOnSite;
  redaction_disclosure: string;
  quality_alerts: string[];
  what_was_found: string;
  what_was_done: string;
  parts_fitted: string[];
  recommendations: string;
}

export interface BatchSummary {
  generated_at: string;
  total_reports: number;
  assets_count: number;
  reports_by_asset: Record<string, ReportSummary[]>;
}
