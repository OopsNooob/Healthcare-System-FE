import { useState } from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { showToast } from "@repo/ui/components/ui/toasts";
import {
  Bot,
  CheckCircle,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  REPORT_TYPE_META,
  type ResolutionAction,
  type ViolationReportItem,
} from "../types";

export type { ReportDetailModalProps };

interface ReportDetailModalProps {
  report: ViolationReportItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyResolution: (id: string, action: ResolutionAction, notes: string) => void;
  onDismissReport: (id: string) => void;
  isUpdating: boolean;
}

export function ReportDetailModal({
  report,
  isOpen,
  onClose,
  onApplyResolution,
  onDismissReport,
  isUpdating,
}: ReportDetailModalProps) {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<ResolutionAction>("warning");
  const [notes, setNotes] = useState("");

  if (!isOpen || !report) return null;

  const typeMeta = REPORT_TYPE_META[report.reportType] ?? REPORT_TYPE_META.other;

  const handleApply = () => {
    if (selectedAction !== "none" && !notes.trim()) {
      showToast.error(
        t(
          "violationReport.modal.notesRequired",
          "Please enter resolution notes/justification before applying action."
        )
      );
      return;
    }
    onApplyResolution(report.id, selectedAction, notes.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[880px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 p-2">
              <typeMeta.icon className={`h-5 w-5 ${typeMeta.iconClassName}`} />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-gray-100">
                {t(`violationReport.types.${report.reportType}`)}
              </p>
              <p className="text-sm text-slate-500 dark:text-gray-400">{report.createdAt}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 dark:text-gray-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Badge
          variant="outline"
          className={`mb-5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            report.status === "resolved"
              ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              : report.status === "dismissed"
              ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
          }`}
        >
          {report.status === "resolved"
            ? t("violationReport.modal.resolved")
            : report.status === "dismissed"
            ? t("violationReport.modal.dismissed", "Dismissed")
            : t("violationReport.modal.pending")}
        </Badge>

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-[#F7F8FA] dark:bg-slate-800 p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
              {t("violationReport.modal.reportedBy")}
            </p>
            <p className="text-base font-semibold text-slate-900 dark:text-gray-100">
              {report.reporterName}
            </p>
          </div>
          <div className="rounded-2xl bg-[#FEF2F2] dark:bg-red-900/20 p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
              {t("violationReport.modal.reportedAccount")}
            </p>
            <p className="text-base font-semibold text-slate-900 dark:text-gray-100">
              {report.reportedAccount}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 dark:border-purple-900/30 dark:bg-purple-900/10">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400">
              {t("violationReport.modal.aiClassification")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase dark:text-slate-400">
                {t("violationReport.modal.aiCategory")}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t(`violationReport.types.${report.reportType}`)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase dark:text-slate-400">
                {t("violationReport.modal.aiSeverity")}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("violationReport.modal.aiSeverityHighValue", "High (94%)")}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase dark:text-slate-400">
              {t("violationReport.modal.aiRationale")}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {t("violationReport.modal.aiRationaleValue")}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
            {t("violationReport.modal.details")}
          </p>
          <p className="text-sm text-slate-700 dark:text-gray-300 whitespace-pre-wrap">
            {report.reason}
          </p>
        </div>

        {/* Resolution Action Selector */}
        <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950/40">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {t("violationReport.modal.resolutionAction", "Resolution Action")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { id: "warning", label: t("violationReport.modal.actionWarning", "Warning") },
              { id: "suspend", label: t("violationReport.modal.actionSuspend", "Suspend 7d") },
              { id: "ban", label: t("violationReport.modal.actionBan", "Permanent Ban") },
              { id: "none", label: t("violationReport.modal.actionNone", "No Penalty") },
            ].map((action) => (
              <button
                type="button"
                key={action.id}
                onClick={() => setSelectedAction(action.id as ResolutionAction)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                  selectedAction === action.id
                    ? "bg-brand/20 border-brand text-slate-900 dark:text-brand"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t("violationReport.modal.resolutionNotes", "Resolution Notes")}
            {selectedAction !== "none" && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              "violationReport.modal.resolutionNotesPlaceholder",
              "Enter findings and justification for resolution..."
            )}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand resize-none"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            className="sm:min-w-32 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            {t("violationReport.modal.close")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="sm:min-w-36 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => onDismissReport(report.id)}
            disabled={isUpdating}
          >
            {t("violationReport.modal.dismissReport", "Dismiss Report")}
          </Button>
          <Button
            type="button"
            className="sm:min-w-40 bg-brand text-slate-900 font-bold hover:bg-brand/90 shadow-sm"
            onClick={handleApply}
            disabled={isUpdating}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t("violationReport.modal.applyResolution", "Apply Resolution")}
          </Button>
        </div>
      </div>
    </div>
  );
}
