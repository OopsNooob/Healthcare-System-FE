import { useState } from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { showToast } from "@repo/ui/components/ui/toasts";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  Lock,
  MessageSquareWarning,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useUserViolationsHistory,
  useViolationDetail,
} from "../hooks/useReportManagement";
import {
  REPORT_TYPE_META,
  type ResolutionAction,
  type ViolationReport,
} from "../types";

interface ReportDetailModalProps {
  report: ViolationReport | null;
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onStartProcessing: (id: string) => Promise<void>;
  onResolve: (
    id: string,
    payload: {
      actionTaken: ResolutionAction;
      resolutionNote: string;
    },
  ) => Promise<void>;
  onDismiss: (id: string, resolutionNote: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ACTION_OPTIONS: Array<{
  value: ResolutionAction;
  labelKey: string;
  defaultLabel: string;
  icon: typeof MessageSquareWarning;
  activeClassName: string;
}> = [
  {
    value: "warning",
    labelKey: "violationReport.modal.actions.warning",
    defaultLabel: "Gửi cảnh báo",
    icon: MessageSquareWarning,
    activeClassName:
      "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  {
    value: "suspend",
    labelKey: "violationReport.modal.actions.suspend",
    defaultLabel: "Tạm đình chỉ",
    icon: Lock,
    activeClassName:
      "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  },
  {
    value: "ban",
    labelKey: "violationReport.modal.actions.ban",
    defaultLabel: "Khóa tài khoản vĩnh viễn",
    icon: Ban,
    activeClassName:
      "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  },
  {
    value: "none",
    labelKey: "violationReport.modal.actions.none",
    defaultLabel: "Không xử phạt thêm",
    icon: CheckCircle2,
    activeClassName:
      "border-slate-500 bg-slate-100 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-200",
  },
];

function formatDateTime(value?: string): string {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function ReportDetailModal({
  report,
  open,
  isSubmitting,
  onClose,
  onStartProcessing,
  onResolve,
  onDismiss,
  onDelete,
}: ReportDetailModalProps) {
  const { t } = useTranslation();
  const detailQuery = useViolationDetail(open && report?.id ? report.id : null);
  const current = detailQuery.data ?? report;

  const [selectedActionDraft, setSelectedActionDraft] =
    useState<ResolutionAction | null>(null);
  const [resolutionNoteDraft, setResolutionNoteDraft] = useState<string | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedAction: ResolutionAction =
    selectedActionDraft ?? current?.actionTaken ?? "warning";
  const resolutionNote: string =
    resolutionNoteDraft ?? current?.resolutionNote ?? "";

  const historyQuery = useUserViolationsHistory(
    open && current?.reportedUserId ? current.reportedUserId : null,
  );

  if (!open || !report || !current) return null;

  const typeMeta = REPORT_TYPE_META[current.reportType] ?? REPORT_TYPE_META.other;
  const TypeIcon = typeMeta.icon;
  const isTerminal =
    current.status === "resolved" || current.status === "dismissed";

  const statusBadgeClass =
    current.status === "resolved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      : current.status === "processing"
        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
        : current.status === "dismissed"
          ? "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300";

  const priorReports = (historyQuery.data?.items ?? []).filter(
    (item) => item.id !== current.id,
  );

  const handleResolveSubmit = async () => {
    const trimmed = resolutionNote.trim();
    if (!trimmed) {
      showToast.error(
        t(
          "violationReport.modal.noteRequired",
          "Vui lòng nhập ghi chú xử lý trước khi xác nhận.",
        ),
      );
      return;
    }
    await onResolve(current.id, {
      actionTaken: selectedAction,
      resolutionNote: trimmed,
    });
  };

  const handleDismissSubmit = async () => {
    await onDismiss(current.id, resolutionNote.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("violationReport.modal.title", "Chi tiết báo cáo vi phạm")}
              </h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {current.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t("common.close", "Đóng")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {detailQuery.isLoading && !detailQuery.data ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`gap-1.5 px-2.5 py-1 text-xs font-medium ${typeMeta.badgeClassName}`}
              >
                <TypeIcon className={`h-3.5 w-3.5 ${typeMeta.iconClassName}`} />
                {t(`violationReport.types.${typeMeta.labelKey}`, typeMeta.label)}
              </Badge>
              <Badge variant="outline" className={`px-2.5 py-1 text-xs ${statusBadgeClass}`}>
                {t(`violationReport.status.${current.status}`, current.status)}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>{formatDateTime(current.createdAt)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("violationReport.modal.reporter", "Người báo cáo")}
              </p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {current.reporterName || t("violationReport.unknownUser", "Người dùng ẩn danh")}
              </p>
              {current.reporterEmail ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {current.reporterEmail}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {current.reporterId}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t("violationReport.modal.reportedUser", "Người bị báo cáo")}
                </p>
                {current.reportedUserStatus === "banned" ? (
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 text-[10px] text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                  >
                    {t("violationReport.userStatus.banned", "Đã khóa")}
                  </Badge>
                ) : null}
              </div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {current.reportedUserName ||
                  t("violationReport.unknownUser", "Người dùng ẩn danh")}
              </p>
              {current.reportedUserEmail ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {current.reportedUserEmail}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {current.reportedUserId}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("violationReport.modal.reasonLabel", "Nội dung báo cáo")}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {current.reason}
            </p>
          </div>

          {current.reportedUserId ? (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t(
                      "violationReport.modal.userHistory",
                      "Lịch sử vi phạm trước đó",
                    )}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {historyQuery.isLoading
                    ? "..."
                    : `${priorReports.length} ${t("violationReport.modal.recordsCount", "báo cáo khác")}`}
                </span>
              </div>

              {historyQuery.isLoading ? (
                <Skeleton className="h-14 w-full rounded-lg" />
              ) : priorReports.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    "violationReport.modal.noPriorHistory",
                    "Chưa ghi nhận báo cáo vi phạm nào khác cho tài khoản này.",
                  )}
                </p>
              ) : (
                <ul className="space-y-2">
                  {priorReports.slice(0, 4).map((hist) => (
                    <li
                      key={hist.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60"
                    >
                      <span className="line-clamp-1 flex-1 text-slate-700 dark:text-slate-300">
                        {hist.reason}
                      </span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {t(`violationReport.status.${hist.status}`, hist.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {current.resolvedAt ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <UserCheck className="h-4 w-4" />
                <span>
                  {t("violationReport.modal.resolutionMeta", "Thông tin kết luận")}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t("violationReport.modal.resolvedAt", "Thời gian xử lý")}:{" "}
                <span className="font-medium">{formatDateTime(current.resolvedAt)}</span>
                {current.resolvedByName ? ` — ${current.resolvedByName}` : ""}
              </p>
              {current.actionTaken ? (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {t("violationReport.modal.actionTakenLabel", "Biện pháp")}:{" "}
                  <span className="font-semibold">
                    {t(
                      `violationReport.modal.actions.${current.actionTaken}`,
                      current.actionTaken,
                    )}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          {!isTerminal ? (
            <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("violationReport.modal.chooseAction", "Chọn biện pháp xử lý")}
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ACTION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = selectedAction === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setSelectedActionDraft(opt.value)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors disabled:opacity-50 ${
                        active
                          ? opt.activeClassName
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{t(opt.labelKey, opt.defaultLabel)}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label
                  htmlFor="violation-resolution-note"
                  className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  {t("violationReport.modal.noteLabel", "Ghi chú xử lý")}
                </label>
                <textarea
                  id="violation-resolution-note"
                  rows={3}
                  disabled={isSubmitting}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNoteDraft(e.target.value)}
                  placeholder={t(
                    "violationReport.modal.notePlaceholder",
                    "Nhập kết quả xác minh hoặc lý do quyết định...",
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          ) : current.resolutionNote ? (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("violationReport.modal.noteLabel", "Ghi chú xử lý")}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {current.resolutionNote}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/90">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => void onDelete(current.id)}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {t("violationReport.modal.confirmDelete", "Xác nhận xóa")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setConfirmDelete(false)}
                >
                  {t("common.cancel", "Hủy")}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setConfirmDelete(true)}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4" />
                {t("violationReport.modal.delete", "Xóa báo cáo")}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {current.status === "pending" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => void onStartProcessing(current.id)}
                className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/40"
              >
                <Clock3 className="h-4 w-4" />
                {t("violationReport.modal.markProcessing", "Đang xác minh")}
              </Button>
            ) : null}

            {!isTerminal ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => void handleDismissSubmit()}
                  className="gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  {t("violationReport.modal.dismiss", "Bỏ qua")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => void handleResolveSubmit()}
                  className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isSubmitting
                    ? t("common.saving", "Đang xử lý...")
                    : t("violationReport.modal.confirmResolve", "Xác nhận xử lý")}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                {t("common.close", "Đóng")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
