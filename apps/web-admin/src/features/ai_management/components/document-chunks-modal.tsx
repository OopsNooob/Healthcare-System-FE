import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Layers,
  Search,
  Plus,
  Edit3,
  Trash2,
  Check,
  Database,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { showToast } from "@repo/ui/components/ui/toasts";
import {
  getDocumentChunks,
  getChunkDetail,
  createDocumentChunk,
  createManyDocumentChunks,
  updateDocumentChunk,
  deleteDocumentChunk,
  deleteAllDocumentChunks,
  type DocumentChunkItem,
  type DocumentItem,
} from "../services/ai-management.service";

interface DocumentChunksModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const CHUNK_PAGE_LIMIT = 15;

export function DocumentChunksModal({
  document,
  isOpen,
  onClose,
}: DocumentChunksModalProps) {
  const { t } = useTranslation();

  const [chunks, setChunks] = useState<DocumentChunkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const fetchChunks = useCallback(async () => {
    if (!document?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getDocumentChunks({
        documentId: document.id,
        page,
        limit: CHUNK_PAGE_LIMIT,
        search,
      });
      setChunks(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("aiManagement.chunksModal.loadFailed", "Không thể tải danh sách phân đoạn."),
      );
    } finally {
      setLoading(false);
    }
  }, [document, page, search, t]);

  useEffect(() => {
    if (!isOpen || !document?.id) return;
    const timer = window.setTimeout(() => {
      void fetchChunks();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchChunks, isOpen, document?.id]);

  if (!isOpen || !document) return null;

  const activeCount = chunks.filter((c) => c.isActive).length;

  const handleCreateChunkOrBatch = async () => {
    if (submitting) return;
    const raw = newContent.trim();
    if (!raw) {
      showToast.error(
        t("aiManagement.chunksModal.contentRequired", "Vui lòng nhập nội dung phân đoạn."),
      );
      return;
    }

    const sections = raw
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const nextBaseIndex =
        chunks.reduce((maxIdx, item) => Math.max(maxIdx, item.chunkIndex), 0) + 1;

      if (sections.length > 1) {
        await createManyDocumentChunks(
          sections.map((section, idx) => ({
            documentId: document.id,
            content: section,
            chunkIndex: nextBaseIndex + idx,
          })),
        );
      } else {
        await createDocumentChunk({
          documentId: document.id,
          content: sections[0]!,
          chunkIndex: nextBaseIndex,
        });
      }

      showToast.success(
        t("aiManagement.chunksModal.createSuccess", "Đã thêm phân đoạn tri thức mới."),
      );
      setNewContent("");
      setShowAddForm(false);
      await fetchChunks();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("aiManagement.chunksModal.createFailed", "Không thể thêm phân đoạn."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (submitting) return;
    if (!editContent.trim()) {
      showToast.error(
        t("aiManagement.chunksModal.contentRequired", "Nội dung phân đoạn không được để trống."),
      );
      return;
    }
    setSubmitting(true);
    try {
      await updateDocumentChunk(id, { content: editContent.trim() });
      showToast.success(
        t("aiManagement.chunksModal.updateSuccess", "Đã cập nhật phân đoạn."),
      );
      setEditingId(null);
      setEditContent("");
      await fetchChunks();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("aiManagement.chunksModal.updateFailed", "Không thể cập nhật phân đoạn."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectFreshChunk = async (id: string) => {
    try {
      const detail = await getChunkDetail(id);
      if (detail) {
        setEditingId(detail.id);
        setEditContent(detail.content);
      }
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("common.failed", "Thao tác thất bại"),
      );
    }
  };

  const handleDeleteChunk = async (id: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await deleteDocumentChunk(id);
      showToast.success(
        t("aiManagement.chunksModal.deleteSuccess", "Đã xoá phân đoạn."),
      );
      await fetchChunks();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("aiManagement.chunksModal.deleteFailed", "Không thể xoá phân đoạn."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllChunks = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await deleteAllDocumentChunks(document.id);
      setConfirmClearAll(false);
      showToast.success(
        t("aiManagement.chunksModal.deleteAllSuccess", "Đã xoá toàn bộ phân đoạn của tài liệu."),
      );
      setPage(1);
      await fetchChunks();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("aiManagement.chunksModal.deleteFailed", "Không thể xoá phân đoạn."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {t("aiManagement.chunksModal.title", "Quản lý phân đoạn tri thức")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {document.title} ({document.fileType.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header stats + Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 px-6 py-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-600 dark:text-slate-300">
              {t("aiManagement.chunksModal.totalChunks", "Tổng phân đoạn")}:{" "}
              <strong className="text-slate-900 dark:text-white">{total}</strong>
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              ● {t("aiManagement.chunksModal.activeChunks", "Đang dùng")}: {activeCount}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("aiManagement.chunksModal.searchPlaceholder", "Tìm trong phân đoạn...")}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            <button
              type="button"
              disabled={loading || submitting}
              onClick={() => void fetchChunks()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 dark:bg-brand px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-950 hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("aiManagement.chunksModal.addBtn", "Thêm phân đoạn")}
            </button>

            {total > 0 && !confirmClearAll && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/60 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("aiManagement.chunksModal.clearAllBtn", "Xoá hết")}
              </button>
            )}
          </div>
        </div>

        {/* Confirm Clear All Banner */}
        {confirmClearAll && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-rose-800 dark:text-rose-200">
              {t("aiManagement.chunksModal.confirmClearAll", "Xác nhận xoá toàn bộ phân đoạn của tài liệu này?")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleDeleteAllChunks()}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {t("common.confirm", "Xác nhận")}
              </button>
            </div>
          </div>
        )}

        {/* Add Chunk / Batch Form */}
        {showAddForm && (
          <div className="mx-6 mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {t("aiManagement.chunksModal.addFormLabel", "Nội dung phân đoạn (phân tách bằng 1 dòng trống để thêm hàng loạt)")}
              </label>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t("aiManagement.chunksModal.addPlaceholder", "Nhập nội dung kiến thức y khoa...")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand/30"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleCreateChunkOrBatch()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {t("aiManagement.chunksModal.saveBtn", "Lưu phân đoạn")}
              </button>
            </div>
          </div>
        )}

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void fetchChunks()}
                className="font-semibold underline cursor-pointer"
              >
                {t("appointmentManagement.retry", "Thử lại")}
              </button>
            </div>
          ) : loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`chunk-skel-${idx}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))
          ) : chunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Database className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {t("aiManagement.chunksModal.empty", "Chưa có phân đoạn tri thức nào cho tài liệu này.")}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("aiManagement.chunksModal.emptyDesc", "Các phân đoạn được tạo tự động khi tải lên hoặc thêm thủ công tại đây.")}
              </p>
            </div>
          ) : (
            chunks.map((chunk) => (
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
                      {t("aiManagement.chunksModal.chunkIndex", "Phân đoạn #")}
                      {chunk.chunkIndex}
                    </span>
                    {typeof chunk.tokenCount === "number" && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {chunk.tokenCount} {t("aiManagement.chunksModal.tokenCount", "tokens")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        chunk.isActive
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {chunk.isActive
                        ? t("aiManagement.chunksModal.active", "Đang dùng")
                        : t("aiManagement.chunksModal.excluded", "Tạm ẩn")}
                    </Badge>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleInspectFreshChunk(chunk.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer disabled:opacity-40"
                      title={t("aiManagement.chunksModal.editBtn", "Chỉnh sửa")}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleDeleteChunk(chunk.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer disabled:opacity-40"
                      title={t("aiManagement.actions.delete", "Xoá")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === chunk.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                        className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        {t("common.cancel", "Hủy")}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleSaveEdit(chunk.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("common.confirm", "Lưu")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {t("aiManagement.chunksModal.pageLabel", {
                page,
                totalPages,
                defaultValue: `Trang ${page} / ${totalPages}`,
              })}
            </span>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs hover:bg-slate-800 dark:hover:bg-white transition cursor-pointer"
          >
            {t("aiManagement.chunksModal.close", "Đóng")}
          </button>
        </div>
      </div>
    </div>
  );
}
