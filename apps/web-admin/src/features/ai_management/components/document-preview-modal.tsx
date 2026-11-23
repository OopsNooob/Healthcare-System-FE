import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  FileText,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  Lock,
  GitBranch,
  Globe,
  Languages,
  Upload,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  getDocumentById,
  type DocumentItem,
  type DocumentType,
  type DocumentStatus,
} from "../services/ai-management.service";

export type { DocumentItem, DocumentType, DocumentStatus };

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  const { t } = useTranslation();
  const locale = t("common.dateLocale", "vi-VN");
  const [fetchedDetail, setFetchedDetail] = useState<DocumentItem | null>(null);
  const detail = fetchedDetail?.id === document?.id ? fetchedDetail : document;

  useEffect(() => {
    if (!isOpen || !document?.id) return;

    let cancelled = false;
    void getDocumentById(document.id, locale)
      .then((fresh) => {
        if (!cancelled && fresh) {
          setFetchedDetail(fresh);
        }
      })
      .catch(() => {
        // Keep passed item if single detail fetch fails
      });

    return () => {
      cancelled = true;
    };
  }, [document?.id, isOpen, locale]);

  if (!isOpen || !detail) return null;

  const isRejected = detail.reviewStatus === "rejected";
  const isArchived =
    detail.reviewStatus === "archived" || detail.status === "inactive";
  const isError = detail.status === "error";

  const stepIndex = (() => {
    if (detail.status === "active") return 4;
    if (detail.status === "ready_for_activation") return 3;
    if (detail.status === "processing") return 2;
    if (detail.reviewStatus === "approved") return 1;
    return 0;
  })();

  const lifecycleSteps = [
    {
      key: "pending_review",
      label: t("aiManagement.reviewStatus.pending", "Chờ duyệt"),
    },
    {
      key: "pending_ingestion",
      label: t("aiManagement.status.pending_ingestion", "Chờ xử lý RAG"),
    },
    {
      key: "processing",
      label: t("aiManagement.status.processing", "Đang xử lý RAG"),
    },
    {
      key: "ready_for_activation",
      label: t(
        "aiManagement.status.ready_for_activation",
        "Sẵn sàng kích hoạt",
      ),
    },
    {
      key: "active",
      label: t("aiManagement.status.active", "Đang hoạt động"),
    },
  ];

  const formatValidUntil = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString(locale);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {detail.title}
              </h3>
              <Badge
                variant="outline"
                className="text-[11px] font-semibold dark:border-slate-700"
              >
                v{detail.documentVersion}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase">{detail.fileType}</span>
              <span>•</span>
              <Badge
                variant="outline"
                className="text-[11px] dark:border-slate-700"
              >
                <ShieldCheck className="mr-1 h-3 w-3 text-emerald-500" />
                {t(
                  `aiManagement.reviewStatus.${detail.reviewStatus === "pending_review" ? "pending" : detail.reviewStatus}`,
                  detail.reviewStatus,
                )}
              </Badge>
              <Badge
                variant="outline"
                className="text-[11px] dark:border-slate-700"
              >
                {t(`aiManagement.status.${detail.status}`, detail.status)}
              </Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-3">
              <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {t(
                "aiManagement.detailModal.lifecycleTitle",
                "Vòng đời kiểm duyệt & kích hoạt RAG",
              )}
            </div>

            {isRejected || isArchived || isError ? (
              <div
                className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
                  isRejected || isError
                    ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-200"
                    : "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {isArchived ? (
                  <Archive className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>
                  {isRejected
                    ? t(
                        "aiManagement.detailModal.rejectedBanner",
                        "Tài liệu đã bị từ chối kiểm duyệt và không được nạp vào RAG.",
                      )
                    : isError
                      ? t(
                          "aiManagement.detailModal.errorBanner",
                          "Quá trình xử lý RAG gặp sự cố. Hãy nộp phiên bản thay thế để thử lại.",
                        )
                      : t(
                          "aiManagement.detailModal.archivedBanner",
                          "Tài liệu đã được lưu trữ / ngừng kích hoạt khỏi RAG.",
                        )}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {lifecycleSteps.map((step, index) => {
                  const completed = index <= stepIndex;
                  const current = index === stepIndex;
                  return (
                    <div
                      key={step.key}
                      className={`rounded-xl border px-3 py-2 text-xs transition ${
                        current
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-500/70 dark:bg-emerald-950/40 dark:text-emerald-200 font-semibold"
                          : completed
                            ? "border-emerald-200 bg-white text-slate-700 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-slate-300"
                            : "border-slate-200 bg-white/60 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2
                          className={`h-3.5 w-3.5 shrink-0 ${
                            completed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                        <span>#{index + 1}</span>
                      </div>
                      <p className="leading-snug">{step.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {detail.reviewReason && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-100">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                {t("aiManagement.detailModal.reviewReason", "Lý do kiểm duyệt")}
              </p>
              <p>{detail.reviewReason}</p>
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <GitBranch className="h-3.5 w-3.5" />
                {t("aiManagement.detailModal.version", "Phiên bản")}
              </dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                v{detail.documentVersion}
                {detail.parentDocumentId ? (
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                    (
                    {t(
                      "aiManagement.detailModal.replacesId",
                      "Thay thế bản trước",
                    )}
                    )
                  </span>
                ) : null}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Upload className="h-3.5 w-3.5" />
                {t("aiManagement.detailModal.source", "Nguồn tài liệu")}
              </dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {detail.source}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Globe className="h-3.5 w-3.5" />
                {t("aiManagement.detailModal.scope", "Phạm vi")}
              </dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {detail.scope}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Languages className="h-3.5 w-3.5" />
                {t("aiManagement.detailModal.language", "Ngôn ngữ tri thức")}
              </dt>
              <dd className="mt-1 font-medium uppercase text-slate-900 dark:text-slate-100">
                {detail.knowledgeLanguage}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {t("aiManagement.detailModal.uploadedBy", "Người tải lên")}
              </dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {detail.uploadedBy} • {detail.createdAt}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                {t("aiManagement.previewModal.validUntil", "Hiệu lực đến")}
              </dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {formatValidUntil(detail.validUntil)}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {t("aiManagement.detailModal.reviewedAt", "Kiểm duyệt lúc")}
              </dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {detail.reviewedAt || "-"}
                {detail.reviewedBy ? ` (${detail.reviewedBy})` : ""}
              </dd>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {t("aiManagement.detailModal.approvedAt", "Phê duyệt lúc")}
              </dt>
              <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                {detail.approvedAt || "-"}
                {detail.approvedBy ? ` (${detail.approvedBy})` : ""}
              </dd>
            </div>
          </dl>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-3.5 text-xs text-slate-600 dark:text-slate-400">
            <Lock className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
            <span>
              {t(
                "aiManagement.detailModal.governanceNote",
                "Vì tuân thủ bảo mật tri thức y khoa, hệ thống chỉ hiển thị metadata kiểm duyệt và vòng đời tài liệu; URL lưu trữ gốc và nội dung chunk nội bộ không được trả ra ngoài.",
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
