import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, FileText, Download, Calendar, ShieldCheck } from "lucide-react";
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

  const isPdf = detail.fileType === "pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-[88vh] w-full max-w-6xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              {detail.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase">{detail.fileType}</span>
              <span>•</span>
              <Badge
                variant="outline"
                className="text-[11px] dark:border-slate-700"
              >
                <ShieldCheck className="mr-1 h-3 w-3 text-emerald-500" />
                {t(`aiManagement.reviewStatus.${detail.reviewStatus === "pending_review" ? "pending" : detail.reviewStatus}`, detail.reviewStatus)}
              </Badge>
              {detail.validUntil && (
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {t("aiManagement.previewModal.validUntil", "Hiệu lực đến")}:{" "}
                  {new Date(detail.validUntil).toLocaleDateString(locale)}
                </span>
              )}
              {detail.publicId && (
                <span className="font-mono text-[11px] text-slate-400 truncate max-w-xs">
                  {detail.publicId}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detail.fileUrl && (
              <a
                href={detail.fileUrl}
                download={detail.title}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Download className="h-3.5 w-3.5" />
                {t("aiManagement.previewModal.downloadBtn", "Tải xuống")}
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          {isPdf && detail.fileUrl ? (
            <iframe
              src={detail.fileUrl}
              title={detail.title}
              className="h-full w-full rounded-2xl border border-slate-200 dark:border-slate-800"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-6 text-center">
              <FileText className="mb-3 h-12 w-12 text-slate-400" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                {t(
                  "aiManagement.previewModal.notSupported",
                  "Preview is not supported for this file type.",
                )}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t(
                  "aiManagement.previewModal.downloadPrompt",
                  "Please download the file to view full content.",
                )}
              </p>
              {detail.fileUrl && (
                <a
                  href={detail.fileUrl}
                  download={detail.title}
                  className="mt-4 inline-flex items-center rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("aiManagement.previewModal.downloadBtn", "Download file")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
