import { webAdminApi } from "@/lib/api";

export type ReportType =
  | "harassment"
  | "spam"
  | "misinformation"
  | "inappropriate_content"
  | "impersonation"
  | "fraud"
  | "ai_hallucination"
  | "other";

export interface ApiCreateReport {
  reportedUserId: string;
  reportType: ReportType;
  reason: string;
}

export async function createReport(payload: ApiCreateReport) {
  return webAdminApi.violationsCreate({
    reported_user_id: payload.reportedUserId,
    report_type: payload.reportType,
    reason: payload.reason,
  });
}
