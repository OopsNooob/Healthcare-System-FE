import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import {
  ActionCard,
  type ActionCardItem,
} from "@repo/ui/components/ui/action-card";
import {
  Ban,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Download,
  Edit3,
  Ellipsis,
  Eye,
  FileText,
  Layers,
  MessageSquareHeart,
  RefreshCw,
  Search,
  ShieldAlert,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import {
  useAiFeedbackList,
  useDeleteDocument,
  useDocumentMutations,
  useGetDocumentList,
  useToggleDocumentStatus,
} from "../hooks/useAiManagement";
import {
  createAiDocument,
  markAiFeedbackHelpful,
  type DocumentItem,
  type DocumentStatus,
  type DocumentType,
} from "../services/ai-management.service";
import {
  useAddKeyword,
  useCheckBlacklistContent,
  useDeleteKeyword,
  useGetKeywords,
  useUpdateKeyword,
} from "../hooks/useBlacklistKeywords";
import { showToast } from "@repo/ui/components/ui/toasts";
import { Spinner } from "@repo/ui/components/ui/spinner";
import { useTranslation } from "react-i18next";
import { DocumentPreviewModal } from "../components/document-preview-modal";
import { DocumentChunksModal } from "../components/document-chunks-modal";

type TabSwitch = "doc" | "words" | "feedbacks";
const PAGE_LIMIT = 15;

function getStatusClassName(status: DocumentStatus) {
  if (status === "active") {
    return "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "inactive") {
    return "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
  }
  if (status === "processing") {
    return "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
  }
  return "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300";
}

export function AIManagement() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

  const [tab, setTab] = useState<TabSwitch>("doc");
  const [searchDoc, setSearchDoc] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | DocumentType>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | DocumentStatus>(
    "all",
  );
  const [currentPage, setCurrentPage] = useState(1);

  const [openActionFor, setOpenActionFor] = useState<string | null>(null);
  const [openActionRect, setOpenActionRect] = useState<DOMRect | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [chunksDoc, setChunksDoc] = useState<DocumentItem | null>(null);
  const [isChunksModalOpen, setIsChunksModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Edit / Archive metadata modal
  const [editModalDoc, setEditModalDoc] = useState<DocumentItem | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [editValidUntilInput, setEditValidUntilInput] = useState("");
  const [editStatusInput, setEditStatusInput] = useState<DocumentStatus>("active");

  // Blacklist keywords state
  const [searchWord, setSearchWord] = useState("");
  const [newWord, setNewWord] = useState("");
  const [editingKeywordId, setEditingKeywordId] = useState<string | null>(null);
  const [editingKeywordText, setEditingKeywordText] = useState("");
  const [checkSampleText, setCheckSampleText] = useState("");

  // AI Feedbacks tab state
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackConvFilter, setFeedbackConvFilter] = useState("");
  const [verifyingFeedbackId, setVerifyingFeedbackId] = useState<string | null>(null);

  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const handleToggleActionMenu = (
    event: MouseEvent<HTMLButtonElement>,
    docId: string,
  ) => {
    const nextIsOpen = openActionFor !== docId;
    setOpenActionFor(nextIsOpen ? docId : null);
    setOpenActionRect(
      nextIsOpen ? event.currentTarget.getBoundingClientRect() : null,
    );
  };

  const {
    data: documentData,
    isLoading: isDocsLoading,
    error: loadError,
    refresh,
  } = useGetDocumentList({
    page: currentPage,
    limit: PAGE_LIMIT,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    search: searchDoc,
    locale,
  });

  const { toggleStatus, isLoading: isToggling } = useToggleDocumentStatus();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDocument();
  const {
    archiveDoc,
    indexDoc,
    ragIngestDoc,
    updateDoc,
    isLoading: isMutatingDoc,
  } = useDocumentMutations();

  const {
    data: keywordData,
    isLoading: isKeywordsLoading,
    error: keywordLoadError,
    refresh: refreshKeyword,
  } = useGetKeywords();
  const { submitAddKeyword, isLoading: isAdding } = useAddKeyword();
  const { submitUpdateKeyword, isLoading: isUpdatingKeyword } = useUpdateKeyword();
  const { submitDeleteKeyword, isLoading: isDeletingKeyword } =
    useDeleteKeyword();
  const {
    checkContent,
    result: checkResult,
    isLoading: isCheckingContent,
  } = useCheckBlacklistContent();

  const {
    data: feedbackData,
    isLoading: isFeedbacksLoading,
    error: feedbackLoadError,
    refresh: refreshFeedbacks,
    submitVerify,
  } = useAiFeedbackList({
    page: feedbackPage,
    limit: PAGE_LIMIT,
    aiConversationId: feedbackConvFilter,
    locale,
    enabled: tab === "feedbacks",
  });

  const isProcessing =
    isToggling ||
    isDeleting ||
    isUploading ||
    isMutatingDoc ||
    isAdding ||
    isUpdatingKeyword ||
    isDeletingKeyword;

  const docList = useMemo(() => documentData?.items ?? [], [documentData]);
  const totalDocs = documentData?.total ?? docList.length;
  const totalPages = documentData?.totalPages ?? 1;

  const keywordList = useMemo(
    () => keywordData?.keywordList ?? [],
    [keywordData],
  );
  const blacklistWords = useMemo(
    () => keywordList.map((item) => item.keyword),
    [keywordList],
  );

  useEffect(() => {
    if (loadError) showToast.error(loadError);
  }, [loadError]);

  useEffect(() => {
    if (openActionFor) return;
    const timer = window.setTimeout(() => {
      setOpenActionRect(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openActionFor]);

  useEffect(() => {
    if (keywordLoadError) showToast.error(keywordLoadError);
  }, [keywordLoadError]);

  useEffect(() => {
    if (feedbackLoadError) showToast.error(feedbackLoadError);
  }, [feedbackLoadError]);

  const filteredDocs = useMemo(() => {
    return docList.filter((doc) => {
      if (selectedType !== "all" && doc.fileType !== selectedType) return false;
      return true;
    });
  }, [docList, selectedType]);

  const filteredWords = useMemo(() => {
    const q = searchWord.trim().toLowerCase();
    if (!q) return keywordList;
    return keywordList.filter((item) => item.keyword.toLowerCase().includes(q));
  }, [keywordList, searchWord]);

  const activeDocuments = docList.filter((x) => x.status === "active").length;
  const inactiveDocuments = docList.filter(
    (x) => x.status === "inactive",
  ).length;
  const errorDocuments = docList.filter((x) => x.status === "error").length;

  const openPreview = (doc: DocumentItem) => {
    setPreviewDoc(doc);
    setIsPreviewOpen(true);
    setOpenActionFor(null);
  };

  const handleDownload = (doc: DocumentItem) => {
    if (!doc.fileUrl) return;
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.title;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setOpenActionFor(null);
  };

  const handleDelete = async (id: string) => {
    if (isProcessing) return;
    try {
      const res = await deleteDoc(id);
      if (!res) return;
      setOpenActionFor(null);
      showToast.success(
        t("aiManagement.toasts.deleteSuccess", "Đã xoá tài liệu thành công"),
      );
      void refresh();
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : t("common.failed", "Thao tác thất bại"),
      );
    }
  };

  const handleToggleEnable = async (id: string) => {
    if (isProcessing) return;
    try {
      const targetDoc = docList.find((doc) => doc.id === id);
      if (!targetDoc) return;
      const nextEnabled = !targetDoc.isEnabled;
      const res = nextEnabled
        ? await indexDoc(id, 0)
        : await toggleStatus(id, "inactive");
      if (!res) return;
      setOpenActionFor(null);
      showToast.success(
        nextEnabled
          ? t("aiManagement.toasts.activated", "Đã kích hoạt tài liệu")
          : t("aiManagement.toasts.deactivated", "Đã tạm ngưng tài liệu"),
      );
      void refresh();
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : t("aiManagement.toasts.statusUpdateFailed", "Không thể đổi trạng thái"),
      );
    }
  };

  const handleReingest = async (doc: DocumentItem) => {
    if (isProcessing) return;
    setOpenActionFor(null);
    try {
      await ragIngestDoc(doc.id);
      showToast.success(t("aiManagement.actions.reindexSuccess"));
      void refresh();
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : t("aiManagement.actions.reindexFailed", "Không thể lập chỉ mục lại tài liệu"),
      );
    }
  };

  const handleArchiveDoc = async (doc: DocumentItem) => {
    if (isProcessing) return;
    setOpenActionFor(null);
    try {
      await archiveDoc(doc.id);
      showToast.success(
        t("aiManagement.toasts.archivedSuccess", "Đã lưu trữ tài liệu"),
      );
      void refresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : t("common.failed", "Thao tác thất bại"),
      );
    }
  };

  const openEditModal = (doc: DocumentItem) => {
    setEditModalDoc(doc);
    setEditTitleInput(doc.title);
    setEditValidUntilInput(doc.validUntil ? doc.validUntil.slice(0, 10) : "");
    setEditStatusInput(doc.status);
    setOpenActionFor(null);
  };

  const handleSaveDocMetadata = async () => {
    if (!editModalDoc || isProcessing) return;
    if (!editTitleInput.trim()) {
      showToast.error(
        t("aiManagement.reviewModal.titleRequired", "Tên tài liệu không được để trống"),
      );
      return;
    }
    try {
      await updateDoc(editModalDoc.id, {
        title: editTitleInput.trim(),
        status: editStatusInput,
        validUntil: editValidUntilInput
          ? new Date(editValidUntilInput).toISOString()
          : null,
      });
      showToast.success(t("aiManagement.reviewModal.statusUpdated"));
      setEditModalDoc(null);
      void refresh();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : t("common.failed", "Thao tác thất bại"),
      );
    }
  };

  const getActionItems = (
    doc: DocumentItem,
    isDocAvailable: boolean,
  ): ActionCardItem[] => {
    const canMutate = !isProcessing && isDocAvailable;
    const canDelete = !isProcessing;

    return [
      {
        id: `view-${doc.id}`,
        title: t("aiManagement.actions.view"),
        icon: <Eye className="h-4 w-4" />,
        onHandle: () => openPreview(doc),
      },
      {
        id: `download-${doc.id}`,
        title: t("aiManagement.actions.download"),
        icon: <Download className="h-4 w-4" />,
        onHandle: () => handleDownload(doc),
      },
      {
        id: `chunks-${doc.id}`,
        title: t("aiManagement.actions.manageChunks"),
        icon: <Layers className="h-4 w-4" />,
        onHandle: () => {
          setChunksDoc(doc);
          setIsChunksModalOpen(true);
          setOpenActionFor(null);
        },
      },
      {
        id: `edit-${doc.id}`,
        title: t("aiManagement.actions.editMeta", "Chỉnh sửa thông tin"),
        icon: <Edit3 className="h-4 w-4" />,
        disabled: isProcessing,
        onHandle: () => openEditModal(doc),
      },
      {
        id: `toggle-${doc.id}`,
        title: doc.isEnabled
          ? t("aiManagement.actions.deactivate")
          : t("aiManagement.actions.activate"),
        icon: <CircleSlash className="h-4 w-4" />,
        disabled: !canMutate,
        onHandle: () => void handleToggleEnable(doc.id),
      },
      {
        id: `reingest-${doc.id}`,
        title: t("aiManagement.actions.reindex"),
        icon: <Upload className="h-4 w-4" />,
        disabled: isProcessing,
        onHandle: () => void handleReingest(doc),
      },
      {
        id: `archive-${doc.id}`,
        title: t("aiManagement.actions.archive"),
        icon: <Ban className="h-4 w-4" />,
        disabled: isProcessing || doc.status === "inactive",
        onHandle: () => void handleArchiveDoc(doc),
      },
      {
        id: `delete-${doc.id}`,
        title: t("aiManagement.actions.delete"),
        icon: <Trash2 className="h-4 w-4" />,
        iconColor: "text-red-600",
        disabled: !canDelete,
        onHandle: () => void handleDelete(doc.id),
      },
    ];
  };

  const handleUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return;
    void (async () => {
      setIsUploading(true);
      try {
        let createdCount = 0;
        for (const file of Array.from(files)) {
          await createAiDocument(file, file.name);
          createdCount += 1;
        }
        showToast.success(
          t("aiManagement.toasts.uploadSuccess", {
            count: createdCount,
            defaultValue:
              createdCount === 1
                ? "Tải tài liệu lên thành công"
                : `Đã tải lên ${createdCount} tài liệu thành công`,
          }),
        );
        setCurrentPage(1);
        void refresh();
      } catch (error) {
        showToast.error(
          error instanceof Error
            ? error.message
            : t("aiManagement.toasts.uploadFailed", "Tải tài liệu lên thất bại"),
        );
        void refresh();
      } finally {
        setIsUploading(false);
      }
    })();
  };

  const addBlacklistWord = () => {
    const sanitized = newWord.trim().toLowerCase();
    if (!sanitized || isAdding || blacklistWords.includes(sanitized)) return;

    void (async () => {
      try {
        await submitAddKeyword(sanitized);
        showToast.success(
          t("aiManagement.toasts.addKeywordSuccess", "Đã thêm từ khoá cấm"),
        );
        setNewWord("");
        void refreshKeyword();
      } catch (error) {
        showToast.error(
          error instanceof Error
            ? error.message
            : t("aiManagement.toasts.addKeywordFailed", "Không thể thêm từ khoá"),
        );
      }
    })();
  };

  const saveEditKeyword = async (id: string) => {
    const trimmed = editingKeywordText.trim().toLowerCase();
    if (!trimmed || isUpdatingKeyword) return;
    try {
      await submitUpdateKeyword(id, trimmed);
      showToast.success(
        t("aiManagement.toasts.updateKeywordSuccess", "Đã cập nhật từ khoá"),
      );
      setEditingKeywordId(null);
      setEditingKeywordText("");
      void refreshKeyword();
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : t("common.failed", "Thao tác thất bại"),
      );
    }
  };

  const removeBlacklistWord = (id: string) => {
    if (isDeletingKeyword) return;
    void (async () => {
      try {
        await submitDeleteKeyword(id);
        showToast.success(
          t("aiManagement.toasts.removeKeywordSuccess", "Đã xoá từ khoá"),
        );
        void refreshKeyword();
      } catch (error) {
        showToast.error(
          error instanceof Error
            ? error.message
            : t("aiManagement.toasts.removeKeywordFailed", "Không thể xoá từ khoá"),
        );
      }
    })();
  };

  const handleVerifyFeedback = async (id: string) => {
    if (verifyingFeedbackId) return;
    setVerifyingFeedbackId(id);
    try {
      await submitVerify(id);
      showToast.success(
        t("aiManagement.feedbacks.verifiedSuccess", "Đã xác nhận phản hồi AI."),
      );
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : t("common.failed", "Thao tác thất bại"),
      );
    } finally {
      setVerifyingFeedbackId(null);
    }
  };

  const handleMarkHelpfulFeedback = async (id: string) => {
    if (verifyingFeedbackId) return;
    setVerifyingFeedbackId(id);
    try {
      await markAiFeedbackHelpful(id);
      void refreshFeedbacks();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : t("common.failed", "Thao tác thất bại"),
      );
    } finally {
      setVerifyingFeedbackId(null);
    }
  };

  return (
    <div className="relative w-full p-6">
      {isProcessing ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 shadow-lg">
            <Spinner size="md" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("aiManagement.processing", "Đang xử lý thay đổi...")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-gray-100">
              {t("aiManagement.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {t("aiManagement.subtitle")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDocsLoading || isKeywordsLoading || isFeedbacksLoading}
            onClick={() => {
              if (tab === "doc") void refresh();
              else if (tab === "words") void refreshKeyword();
              else void refreshFeedbacks();
            }}
            className="rounded-xl dark:border-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isDocsLoading || isKeywordsLoading || isFeedbacksLoading ? "animate-spin" : ""}`}
            />
            {t("common.refresh", "Làm mới")}
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-6 min-w-max">
            <button
              type="button"
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition cursor-pointer ${
                tab === "doc"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setTab("doc")}
            >
              <BookOpen className="h-4 w-4" />
              {t("aiManagement.tabs.documents")}
              <span className="ml-1 text-xs text-slate-400 dark:text-gray-500">
                {totalDocs}
              </span>
            </button>

            <button
              type="button"
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition cursor-pointer ${
                tab === "words"
                  ? "border-red-400 text-red-500"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setTab("words")}
            >
              <Ban className="h-4 w-4" />
              {t("aiManagement.tabs.blacklist")}
              <span className="ml-1 text-xs text-slate-400 dark:text-gray-500">
                {keywordData?.total ?? blacklistWords.length}
              </span>
            </button>

            <button
              type="button"
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition cursor-pointer ${
                tab === "feedbacks"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              onClick={() => setTab("feedbacks")}
            >
              <MessageSquareHeart className="h-4 w-4" />
              {t("aiManagement.tabs.feedbacks", "Phản hồi AI")}
              <span className="ml-1 text-xs text-slate-400 dark:text-gray-500">
                {feedbackData?.total ?? ""}
              </span>
            </button>
          </div>
        </div>

        {tab === "doc" ? (
          <div>
            {/* Stat cards */}
            <ul className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <li className="rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">
                  {totalDocs}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  {t("aiManagement.stats.total")}
                </p>
              </li>
              <li className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                  <Check className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">
                  {activeDocuments}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  {t("aiManagement.stats.active")}
                </p>
              </li>
              <li className="rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                  <CircleSlash className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">
                  {inactiveDocuments}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  {t("aiManagement.stats.inactive")}
                </p>
              </li>
              <li className="rounded-2xl border border-red-100 dark:border-red-900/50 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-gray-100">
                  {errorDocuments}
                </p>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  {t("aiManagement.stats.error")}
                </p>
              </li>
            </ul>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchDoc}
                      onChange={(e) => {
                        setSearchDoc(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={t("aiManagement.filters.searchDoc")}
                      className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs text-slate-700 dark:text-gray-200 outline-none transition focus:ring-2 focus:ring-brand/30 md:w-64"
                    />
                  </div>

                  <Combobox
                    value={selectedType}
                    onValueChange={(value) => {
                      setSelectedType(value as "all" | DocumentType);
                      setCurrentPage(1);
                    }}
                  >
                    <ComboboxInput
                      placeholder={t("aiManagement.filters.allTypes")}
                      className="w-full md:w-44 bg-white dark:bg-slate-900 dark:border-slate-700"
                    />
                    <ComboboxContent className="dark:bg-slate-900">
                      <ComboboxEmpty>{t("aiManagement.combobox.noType")}</ComboboxEmpty>
                      <ComboboxList>
                        <ComboboxItem value="all">{t("aiManagement.filters.allTypes")}</ComboboxItem>
                        <ComboboxItem value="pdf">PDF</ComboboxItem>
                        <ComboboxItem value="doc">DOC</ComboboxItem>
                        <ComboboxItem value="docx">DOCX</ComboboxItem>
                        <ComboboxItem value="txt">TXT</ComboboxItem>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>

                  <Combobox
                    value={selectedStatus}
                    onValueChange={(value) => {
                      setSelectedStatus(value as "all" | DocumentStatus);
                      setCurrentPage(1);
                    }}
                  >
                    <ComboboxInput
                      placeholder={t("aiManagement.filters.allStatus")}
                      className="w-full md:w-44 bg-white dark:bg-slate-900 dark:border-slate-700"
                    />
                    <ComboboxContent className="dark:bg-slate-900">
                      <ComboboxEmpty>{t("aiManagement.combobox.noStatus")}</ComboboxEmpty>
                      <ComboboxList>
                        <ComboboxItem value="all">{t("aiManagement.filters.allStatus")}</ComboboxItem>
                        <ComboboxItem value="active">{t("aiManagement.status.active", "Hoạt động")}</ComboboxItem>
                        <ComboboxItem value="inactive">{t("aiManagement.status.inactive", "Tạm ngưng")}</ComboboxItem>
                        <ComboboxItem value="processing">{t("aiManagement.status.processing", "Đang xử lý")}</ComboboxItem>
                        <ComboboxItem value="error">{t("aiManagement.status.error", "Lỗi")}</ComboboxItem>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                <div>
                  <input
                    ref={inputFileRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      handleUploadFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    className="h-9 rounded-full bg-lime-500 px-4 text-white hover:bg-lime-600 cursor-pointer"
                    onClick={() => inputFileRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    {t("aiManagement.actions.upload")}
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3 text-xs text-slate-400">
                      {t("aiManagement.table.docName")}
                    </TableHead>
                    <TableHead className="px-3 text-xs text-slate-400">
                      {t("aiManagement.table.uploadedBy")}
                    </TableHead>
                    <TableHead className="px-3 text-xs text-slate-400">
                      {t("aiManagement.table.uploadedDate")}
                    </TableHead>
                    <TableHead className="px-3 text-xs text-slate-400">
                      {t("aiManagement.table.status")}
                    </TableHead>
                    <TableHead className="px-3 text-xs text-slate-400">
                      {t("aiManagement.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isDocsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`doc-skel-${i}`}>
                        <TableCell className="px-3 py-3"><Skeleton className="h-6 w-48" /></TableCell>
                        <TableCell className="px-3"><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell className="px-3"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="px-3"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell className="px-3"><Skeleton className="h-6 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => {
                      const availableDoc =
                        doc.status === "active" || doc.status === "inactive";
                      const actions = getActionItems(doc, availableDoc);
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <FileText className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {doc.title}
                                </p>
                                <p className="text-xs uppercase tracking-wide text-slate-400">
                                  {doc.fileType}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 text-sm text-slate-600 dark:text-slate-300 font-mono text-xs">
                            {doc.uploadedBy}
                          </TableCell>
                          <TableCell className="px-3 text-sm text-slate-500 dark:text-slate-400">
                            {doc.createdAt}
                          </TableCell>
                          <TableCell className="px-3">
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className={`h-5 w-fit rounded-full border px-2 text-[10px] font-medium ${getStatusClassName(doc.status)}`}
                              >
                                {doc.status === "active"
                                  ? t("aiManagement.ingestionStatus.indexed")
                                  : doc.status === "processing"
                                    ? t("aiManagement.ingestionStatus.processing")
                                    : doc.status === "error"
                                      ? t("aiManagement.status.error", "Lỗi")
                                      : t("aiManagement.status.inactive", "Lưu trữ")}
                              </Badge>
                              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                                {doc.reviewStatus === "approved"
                                  ? t("aiManagement.reviewStatus.approved")
                                  : doc.reviewStatus === "rejected"
                                    ? t("aiManagement.reviewStatus.rejected")
                                    : doc.reviewStatus === "archived"
                                      ? t("aiManagement.reviewStatus.archived")
                                      : t("aiManagement.reviewStatus.pending")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-3">
                            <div className="relative inline-flex items-center gap-2">
                              <button
                                type="button"
                                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                onClick={(event) => handleToggleActionMenu(event, doc.id)}
                              >
                                <Ellipsis className="h-4 w-4" />
                              </button>

                              {openActionFor === doc.id ? (
                                <ActionCard
                                  actions={actions}
                                  onClickOutside={() => {
                                    setOpenActionFor(null);
                                    setOpenActionRect(null);
                                  }}
                                  anchorRect={openActionRect}
                                />
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="px-3 py-10 text-center text-sm text-slate-500"
                      >
                        {t("aiManagement.table.noDocs")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {t("aiManagement.pagination.showing")} {filteredDocs.length}{" "}
                  {t("aiManagement.pagination.of")} {totalDocs}{" "}
                  {t("aiManagement.pagination.documents")}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDocsLoading || currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t("appointmentManagement.pagination.prev", "Trước")}
                  </button>
                  <span>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={isDocsLoading || currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    {t("appointmentManagement.pagination.next", "Sau")}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : tab === "words" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-500">
                    <Ban className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {t("aiManagement.blacklistTab.title")}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("aiManagement.blacklistTab.subtitle")}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-1 text-sm text-red-500 dark:text-red-400"
                >
                  {blacklistWords.length} {t("aiManagement.blacklistTab.wordsCount")}
                </Badge>
              </div>

              <div className="p-5">
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchWord}
                      onChange={(e) => setSearchWord(e.target.value)}
                      placeholder={t("aiManagement.blacklistTab.searchPlaceholder")}
                      className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30"
                    />
                  </div>

                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder={t("aiManagement.blacklistTab.inputPlaceholder")}
                    className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30"
                  />

                  <Button
                    type="button"
                    className="h-10 rounded-lg bg-red-500 px-5 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    onClick={addBlacklistWord}
                    disabled={
                      isAdding ||
                      !newWord.trim() ||
                      blacklistWords.includes(newWord.trim().toLowerCase())
                    }
                  >
                    {t("aiManagement.blacklistTab.addWord")}
                  </Button>
                </div>

                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("aiManagement.blacklistTab.allWords")}
                </p>

                {isKeywordsLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <Skeleton key={`kw-skel-${idx}`} className="h-8 w-24 rounded-full" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredWords.length > 0 ? (
                      filteredWords.map((item) =>
                        editingKeywordId === item.id ? (
                          <div
                            key={item.id}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1"
                          >
                            <input
                              type="text"
                              value={editingKeywordText}
                              onChange={(e) => setEditingKeywordText(e.target.value)}
                              className="w-28 bg-transparent text-xs text-slate-900 dark:text-slate-100 outline-none"
                            />
                            <button
                              type="button"
                              disabled={isUpdatingKeyword}
                              onClick={() => void saveEditKeyword(item.id)}
                              className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingKeywordId(null)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-1 text-sm font-medium text-red-500 dark:text-red-400"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {item.keyword}
                            <button
                              type="button"
                              className="rounded p-0.5 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer"
                              onClick={() => {
                                setEditingKeywordId(item.id);
                                setEditingKeywordText(item.keyword);
                              }}
                              title={t("aiManagement.chunksModal.editBtn", "Sửa")}
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-0.5 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 cursor-pointer"
                              onClick={() => removeBlacklistWord(item.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ),
                      )
                    ) : (
                      <p className="text-sm text-slate-500">
                        {t("aiManagement.blacklistTab.noWordsFound")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content moderation quick checker */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t("aiManagement.blacklistTab.checkTitle", "Kiểm thử bộ lọc nội dung")}
                </h4>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={checkSampleText}
                  onChange={(e) => setCheckSampleText(e.target.value)}
                  placeholder={t("aiManagement.blacklistTab.checkPlaceholder", "Nhập câu mẫu cần kiểm tra từ khoá cấm...")}
                  className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand/30"
                />
                <Button
                  type="button"
                  disabled={isCheckingContent || !checkSampleText.trim()}
                  onClick={() => void checkContent(checkSampleText)}
                  className="h-10 rounded-lg bg-slate-900 dark:bg-brand text-white dark:text-slate-950 px-4 cursor-pointer"
                >
                  {t("aiManagement.blacklistTab.checkBtn", "Kiểm tra")}
                </Button>
              </div>
              {checkResult && (
                <div
                  className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                    checkResult.flagged
                      ? "border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                      : "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {checkResult.flagged ? (
                    <span>
                      {t("aiManagement.blacklistTab.flaggedResult", "Phát hiện từ khoá vi phạm")}:{" "}
                      <strong>{checkResult.flaggedWords.join(", ")}</strong>
                    </span>
                  ) : (
                    <span>
                      {t("aiManagement.blacklistTab.cleanResult", "Nội dung hợp lệ, không chứa từ khoá cấm.")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 3: AI Feedbacks */
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t("aiManagement.feedbacks.title", "Phản hồi của người dùng về Trợ lý AI")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("aiManagement.feedbacks.subtitle", "Xem và xác minh chất lượng các phản hồi từ hội thoại AI")}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={feedbackConvFilter}
                  onChange={(e) => {
                    setFeedbackConvFilter(e.target.value);
                    setFeedbackPage(1);
                  }}
                  placeholder={t("aiManagement.feedbacks.filterConvPlaceholder", "Lọc theo mã hội thoại...")}
                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs text-slate-700 dark:text-slate-200 outline-none"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 text-xs text-slate-400">
                    {t("aiManagement.feedbacks.patientCol", "Người gửi")}
                  </TableHead>
                  <TableHead className="px-4 text-xs text-slate-400">
                    {t("aiManagement.feedbacks.conversationCol", "Hội thoại")}
                  </TableHead>
                  <TableHead className="px-4 text-xs text-slate-400">
                    {t("aiManagement.feedbacks.contentCol", "Nội dung phản hồi")}
                  </TableHead>
                  <TableHead className="px-4 text-xs text-slate-400">
                    {t("aiManagement.feedbacks.helpfulCol", "Hữu ích")}
                  </TableHead>
                  <TableHead className="px-4 text-xs text-slate-400">
                    {t("aiManagement.feedbacks.verifyCol", "Trạng thái")}
                  </TableHead>
                  <TableHead className="px-4 text-xs text-slate-400 text-right">
                    {t("aiManagement.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFeedbacksLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={`fb-skel-${i}`}>
                      <TableCell className="px-4"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-5 w-52" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell className="px-4"><Skeleton className="h-7 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (feedbackData?.items ?? []).length > 0 ? (
                  (feedbackData?.items ?? []).map((fb) => (
                    <TableRow key={fb.id}>
                      <TableCell className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                        {fb.patientId}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {fb.aiConversationId}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 max-w-md">
                        {fb.content}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        <button
                          type="button"
                          disabled={verifyingFeedbackId === fb.id}
                          onClick={() => void handleMarkHelpfulFeedback(fb.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <ThumbsUp className="h-3 w-3 text-blue-500" />
                          {fb.helpfulCount}
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${
                            fb.verified
                              ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {fb.verified
                            ? t("aiManagement.feedbacks.verified", "Đã xác minh")
                            : t("aiManagement.feedbacks.unverified", "Chờ xem xét")}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {!fb.verified && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={verifyingFeedbackId === fb.id}
                            onClick={() => void handleVerifyFeedback(fb.id)}
                            className="h-7 rounded-lg text-xs cursor-pointer dark:border-slate-700"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                            {t("aiManagement.feedbacks.verifyBtn", "Xác minh")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                      {t("aiManagement.feedbacks.empty", "Chưa có phản hồi AI nào.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {t("aiManagement.feedbacks.summary", {
                  page: feedbackPage,
                  totalPages: feedbackData?.totalPages ?? 1,
                  total: feedbackData?.total ?? 0,
                  defaultValue: `Trang ${feedbackPage} / ${feedbackData?.totalPages ?? 1} (${feedbackData?.total ?? 0})`,
                })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFeedbacksLoading || feedbackPage <= 1}
                  onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={
                    isFeedbacksLoading ||
                    feedbackPage >= (feedbackData?.totalPages ?? 1)
                  }
                  onClick={() =>
                    setFeedbackPage((p) =>
                      Math.min(feedbackData?.totalPages ?? 1, p + 1),
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <DocumentPreviewModal
          document={previewDoc}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewDoc(null);
          }}
        />

        <DocumentChunksModal
          key={chunksDoc?.id || "chunks-modal"}
          document={chunksDoc}
          isOpen={isChunksModalOpen}
          onClose={() => {
            setIsChunksModalOpen(false);
            setChunksDoc(null);
          }}
        />

        {/* Edit Document Metadata Modal */}
        {editModalDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("aiManagement.actions.editMeta", "Cập nhật thông tin tài liệu")}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditModalDoc(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t("aiManagement.table.docName")}
                </label>
                <input
                  type="text"
                  value={editTitleInput}
                  onChange={(e) => setEditTitleInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t("aiManagement.table.status")}
                </label>
                <select
                  value={editStatusInput}
                  onChange={(e) =>
                    setEditStatusInput(e.target.value as DocumentStatus)
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="active">{t("aiManagement.status.active", "Hoạt động")}</option>
                  <option value="inactive">{t("aiManagement.status.inactive", "Tạm ngưng")}</option>
                  <option value="processing">{t("aiManagement.status.processing", "Đang xử lý")}</option>
                  <option value="error">{t("aiManagement.status.error", "Lỗi")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t("aiManagement.previewModal.validUntil", "Hiệu lực đến")}
                </label>
                <input
                  type="date"
                  value={editValidUntilInput}
                  onChange={(e) => setEditValidUntilInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t("common.cancel", "Hủy")}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void handleSaveDocMetadata()}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {t("common.confirm", "Lưu")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
