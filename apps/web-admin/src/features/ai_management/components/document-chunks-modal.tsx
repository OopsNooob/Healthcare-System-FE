import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Layers } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { DocumentItem } from "./document-preview-modal";

export interface DocumentChunk {
  id: string;
  index: number;
  content: string;
  tokenCount: number;
  isActive: boolean;
  exclusionReason?: string;
}

interface DocumentChunksModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentChunksModal({
  document,
  isOpen,
  onClose,
}: DocumentChunksModalProps) {
  const { t } = useTranslation();

  const [chunks, setChunks] = useState<DocumentChunk[]>(() => {
    if (!document) return [];
    return [
      {
        id: `${document.id}-chunk-1`,
        index: 1,
        content: `Section 1: Clinical protocol overview for ${document.title}. Patients diagnosed with chronic conditions must be monitored regularly for vital metric stabilization across 90-day intervals. Target thresholds are defined by international guidelines.`,
        tokenCount: 420,
        isActive: true,
      },
      {
        id: `${document.id}-chunk-2`,
        index: 2,
        content: `Section 2: Pharmacological titration and contraindications. Dosage adjustments should only be made following consecutive abnormal readings over 48 hours unless systolic exceeds 180 mmHg or diastolic exceeds 120 mmHg (Urgent Alert Protocol).`,
        tokenCount: 385,
        isActive: true,
      },
      {
        id: `${document.id}-chunk-3`,
        index: 3,
        content: `Section 3: Dietary and lifestyle recommendations. Sodium intake limit < 2,300 mg daily, aerobic exercise 150 minutes weekly. Patient telemetry sync intervals: twice daily (morning 08:00 and evening 20:00).`,
        tokenCount: 310,
        isActive: false,
        exclusionReason: "Outdated sodium intake guidance, replaced by 2026 clinical update.",
      },
    ];
  });
  const [excludingChunkId, setExcludingChunkId] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  if (!isOpen || !document) return null;

  const total = chunks.length;
  const activeCount = chunks.filter((c) => c.isActive).length;
  const excludedCount = chunks.filter((c) => !c.isActive).length;

  const handleExclude = (id: string) => {
    if (!reasonInput.trim()) {
      showToast.error(t("aiManagement.chunksModal.reasonRequired", "Please provide an exclusion reason"));
      return;
    }
    setChunks((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isActive: false, exclusionReason: reasonInput.trim() } : c
      )
    );
    showToast.success(t("aiManagement.chunksModal.successExclude", "Chunk excluded from RAG retrieval"));
    setExcludingChunkId(null);
    setReasonInput("");
  };

  const handleRestore = (id: string) => {
    setChunks((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isActive: true, exclusionReason: undefined } : c
      )
    );
    showToast.success(t("aiManagement.chunksModal.successRestore", "Chunk restored to RAG retrieval"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 p-2 text-indigo-600 dark:text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("aiManagement.chunksModal.title", "Document Chunks Management")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {document.title} ({document.fileType.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Sub-header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 px-6 py-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-600 dark:text-slate-300">
              {t("aiManagement.chunksModal.totalChunks", "Total Chunks")}: <strong className="text-slate-900 dark:text-white">{total}</strong>
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              ● {t("aiManagement.chunksModal.activeChunks", "Active")}: {activeCount}
            </span>
            <span className="text-rose-700 dark:text-rose-400 font-semibold">
              ● {t("aiManagement.chunksModal.excludedChunks", "Excluded")}: {excludedCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            {t("aiManagement.chunksModal.exclusionNotice", "* Chunk exclusion disables RAG retrieval on this fragment without changing document publishing status.")}
          </p>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chunks.map((chunk) => (
            <div
              key={chunk.id}
              className={`rounded-2xl border p-4 transition-all ${
                chunk.isActive
                  ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  : "border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                    {t("aiManagement.chunksModal.chunkIndex", "Chunk #")}{chunk.index}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {chunk.tokenCount} {t("aiManagement.chunksModal.tokenCount", "tokens")}
                  </span>
                </div>
                <div>
                  {chunk.isActive ? (
                    <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px]">
                      {t("aiManagement.chunksModal.active", "Active")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px]">
                      {t("aiManagement.chunksModal.excluded", "Excluded")}
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-3">
                {chunk.content}
              </p>

              {!chunk.isActive && chunk.exclusionReason && (
                <div className="mb-3 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 p-2.5 text-xs text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
                  <span className="font-semibold">{t("aiManagement.chunksModal.exclusionReasonTitle", "Exclusion Reason")}:</span>{" "}
                  {chunk.exclusionReason}
                </div>
              )}

              {excludingChunkId === chunk.id ? (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300">
                    {t("aiManagement.chunksModal.exclusionReasonTitle", "Reason for Excluding Chunk")} *
                  </label>
                  <input
                    type="text"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder={t("aiManagement.chunksModal.exclusionReasonPlaceholder", "Enter clinical reason...")}
                    className="w-full rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setExcludingChunkId(null);
                        setReasonInput("");
                      }}
                      className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                    >
                      {t("aiManagement.chunksModal.cancel", "Cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExclude(chunk.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700"
                    >
                      {t("aiManagement.chunksModal.confirmExclude", "Confirm Exclude")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  {chunk.isActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        setExcludingChunkId(chunk.id);
                        setReasonInput("");
                      }}
                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1"
                    >
                      {t("aiManagement.chunksModal.excludeBtn", "Exclude Chunk")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestore(chunk.id)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
                    >
                      {t("aiManagement.chunksModal.restoreBtn", "Restore Chunk")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs hover:bg-slate-800 dark:hover:bg-white transition"
          >
            {t("aiManagement.chunksModal.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
