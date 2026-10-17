import { useTranslation } from "react-i18next";
import { X, FileText, Download } from "lucide-react";

export type DocumentType = "pdf" | "doc" | "docx" | "txt";
export type DocumentStatus = "processing" | "error" | "active" | "inactive";

export interface DocumentItem {
  id: string;
  title: string;
  fileUrl: string;
  fileType: DocumentType;
  status: DocumentStatus;
  uploadedBy: string;
  createdAt: string;
  isEnabled: boolean;
}

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

  if (!isOpen || !document) return null;

  const isPdf = document.fileType === "pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-[88vh] w-full max-w-6xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {document.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {document.fileType.toUpperCase()}{" "}
              {t("aiManagement.previewModal.previewDesc", "document preview")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          {isPdf ? (
            <iframe
              src={document.fileUrl}
              title={document.title}
              className="h-full w-full rounded-2xl border border-slate-200 dark:border-slate-800"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-6 text-center">
              <FileText className="mb-3 h-12 w-12 text-slate-400" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                {t(
                  "aiManagement.previewModal.notSupported",
                  "Preview is not supported for this file type."
                )}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t(
                  "aiManagement.previewModal.downloadPrompt",
                  "Please download the file to view full content."
                )}
              </p>
              <a
                href={document.fileUrl}
                download={document.title}
                className="mt-4 inline-flex items-center rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition"
              >
                <Download className="mr-2 h-4 w-4" />
                {t("aiManagement.previewModal.downloadBtn", "Download file")}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
