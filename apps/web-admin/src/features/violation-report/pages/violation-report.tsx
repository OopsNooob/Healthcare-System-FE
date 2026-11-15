import { useMemo, useState } from "react";
import { OverviewCard } from "@repo/ui/components/data-display/overview-card";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { showToast } from "@repo/ui/components/ui/toasts";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Eye,
  Flag,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBanUser } from "@/features/user-management/hooks/useUserManagement";
import { ReportDetailModal } from "../components/report-detail-modal";
import {
  useChangeReportStatus,
  useFlagReview,
} from "../hooks/useChangeReportStatus";
import {
  useDoctorRating,
  useReportList,
  useReviewDetail,
  useReviewsModerationList,
  useTopRatedDoctors,
  useViolationStats,
} from "../hooks/useReportManagement";
import {
  REPORT_TYPE_META,
  type ReportStatus,
  type ReportType,
  type ResolutionAction,
  type ReviewModerationItem,
  type ViolationReport,
} from "../types";

type ActiveTab = "violations" | "reviews";

const STATUS_BADGE_MAP: Record<ReportStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  processing:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
  resolved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  dismissed:
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const PAGE_LIMIT = 10;

export function ViolationReport() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("violations");

  // Violations tab state
  const [violationsPage, setViolationsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ReportType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<ViolationReport | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  // Reviews tab state
  const [reviewsPage, setReviewsPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [reviewSortBy, setReviewSortBy] = useState<"createdAt" | "rating">(
    "createdAt",
  );
  const [selectedReview, setSelectedReview] =
    useState<ReviewModerationItem | null>(null);
  const [flagNotes, setFlagNotes] = useState("");

  // Queries & Mutations
  const statsQuery = useViolationStats();
  const reportsQuery = useReportList({
    page: violationsPage,
    limit: PAGE_LIMIT,
    status: statusFilter === "all" ? undefined : statusFilter,
    report_type: typeFilter === "all" ? undefined : typeFilter,
  });

  const {
    changeStatusAsync,
    resolveReportAsync,
    deleteReportAsync,
    isSubmitting: isReportMutating,
  } = useChangeReportStatus();
  const { submitBanUser, isLoading: isBanningUser } = useBanUser();

  const reviewsQuery = useReviewsModerationList({
    page: reviewsPage,
    limit: PAGE_LIMIT,
    doctorId: selectedDoctorId || undefined,
    rating: ratingFilter === "all" ? undefined : ratingFilter,
    sortBy: reviewSortBy,
    sortOrder: -1,
  });
  const topDoctorsQuery = useTopRatedDoctors(4);
  const doctorRatingQuery = useDoctorRating(selectedDoctorId || null);
  const reviewDetailQuery = useReviewDetail(selectedReview?.id ?? null);
  const flagReviewMutation = useFlagReview();

  const isBusyModal = isReportMutating || isBanningUser;

  const filteredReports = useMemo(() => {
    const items = reportsQuery.data?.items ?? [];
    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) return items;

    return items.filter((item) => {
      return (
        item.id.toLowerCase().includes(normalizedSearch) ||
        item.reporterName.toLowerCase().includes(normalizedSearch) ||
        item.reportedUserName.toLowerCase().includes(normalizedSearch) ||
        item.reason.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [reportsQuery.data?.items, searchQuery]);

  const handleOpenDetail = (report: ViolationReport) => {
    setSelectedReport(report);
    setModalOpen(true);
  };

  const handleStartProcessing = async (id: string) => {
    try {
      await changeStatusAsync({
        id,
        payload: { status: "processing" },
      });
      showToast.success(
        t("violationReport.toast.processingUpdated", "Đã chuyển trạng thái đang xử lý."),
      );
      setModalOpen(false);
    } catch {
      showToast.error(
        t("violationReport.toast.actionFailed", "Không thể cập nhật trạng thái báo cáo."),
      );
    }
  };

  const handleResolveReport = async (
    id: string,
    payload: {
      actionTaken: ResolutionAction;
      resolutionNote: string;
    },
  ) => {
    const target =
      selectedReport ??
      (reportsQuery.data?.items ?? []).find((item) => item.id === id) ??
      null;

    try {
      if (payload.actionTaken === "ban" && target?.reportedUserId) {
        await submitBanUser({
          id: target.reportedUserId,
          reason: payload.resolutionNote,
        });
      }

      await resolveReportAsync({
        id,
        payload: {
          status: "resolved",
          action_taken: payload.actionTaken,
          resolution_note: payload.resolutionNote,
        },
      });

      showToast.success(
        t("violationReport.toast.resolvedSuccess", "Đã xử lý báo cáo vi phạm thành công."),
      );
      setModalOpen(false);
    } catch {
      showToast.error(
        t("violationReport.toast.actionFailed", "Không thể cập nhật trạng thái báo cáo."),
      );
    }
  };

  const handleDismissReport = async (id: string, resolutionNote: string) => {
    try {
      await changeStatusAsync({
        id,
        payload: {
          status: "dismissed",
          action_taken: "none",
          resolution_note: resolutionNote || undefined,
        },
      });
      showToast.success(
        t("violationReport.toast.dismissedSuccess", "Đã bỏ qua báo cáo vi phạm."),
      );
      setModalOpen(false);
    } catch {
      showToast.error(
        t("violationReport.toast.actionFailed", "Không thể cập nhật trạng thái báo cáo."),
      );
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteReportAsync(id);
      showToast.success(
        t("violationReport.toast.deletedSuccess", "Đã xóa báo cáo vi phạm."),
      );
      setModalOpen(false);
    } catch {
      showToast.error(
        t("violationReport.toast.deleteFailed", "Không thể xóa báo cáo vi phạm."),
      );
    }
  };

  const handleOpenReviewFlagModal = (review: ReviewModerationItem) => {
    setSelectedReview(review);
    setFlagNotes(review.adminNotes ?? "");
  };

  const handleSubmitReviewFlag = async () => {
    if (!selectedReview) return;
    const trimmed = flagNotes.trim();
    if (!trimmed) {
      showToast.error(
        t(
          "violationReport.reviews.flagNoteRequired",
          "Vui lòng nhập ghi chú kiểm duyệt khi gắn cờ đánh giá.",
        ),
      );
      return;
    }

    try {
      await flagReviewMutation.mutateAsync({
        id: selectedReview.id,
        adminNotes: trimmed,
      });
      showToast.success(
        t("violationReport.reviews.flaggedSuccess", "Đã gắn cờ đánh giá thành công."),
      );
      setSelectedReview(null);
      setFlagNotes("");
    } catch {
      showToast.error(
        t("violationReport.reviews.flaggedFailed", "Không thể gắn cờ đánh giá."),
      );
    }
  };

  const totalViolationsPages = Math.max(1, reportsQuery.data?.totalPages ?? 1);
  const totalReviewsPages = Math.max(1, reviewsQuery.data?.totalPages ?? 1);
  const activeReviewDetail = reviewDetailQuery.data ?? selectedReview;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("violationReport.title", "Kiểm duyệt vi phạm & đánh giá")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "violationReport.subtitle",
              "Theo dõi báo cáo vi phạm người dùng và kiểm duyệt phản hồi chất lượng dịch vụ.",
            )}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={
            activeTab === "violations"
              ? reportsQuery.isFetching || statsQuery.isFetching
              : reviewsQuery.isFetching || topDoctorsQuery.isFetching
          }
          onClick={() => {
            if (activeTab === "violations") {
              void Promise.all([reportsQuery.refetch(), statsQuery.refetch()]);
            } else {
              void Promise.all([
                reviewsQuery.refetch(),
                topDoctorsQuery.refetch(),
              ]);
            }
          }}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              reportsQuery.isFetching || reviewsQuery.isFetching ? "animate-spin" : ""
            }`}
          />
          {t("common.refresh", "Làm mới")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("violations")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "violations"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          {t("violationReport.tabs.violations", "Báo cáo vi phạm")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "reviews"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Star className="h-4 w-4" />
          {t("violationReport.tabs.reviews", "Kiểm duyệt đánh giá")}
        </button>
      </div>

      {activeTab === "violations" ? (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-28 w-full rounded-2xl" />
              ))
            ) : (
              <>
                <OverviewCard
                  title={t("violationReport.stats.total", "Tổng báo cáo")}
                  stats={statsQuery.data?.total ?? 0}
                  subText={t(
                    "violationReport.stats.allRecorded",
                    "Tổng hợp trên toàn hệ thống",
                  )}
                  icon={<ShieldAlert className="h-5 w-5" />}
                  iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                />
                <OverviewCard
                  title={t("violationReport.stats.pending", "Chờ xử lý")}
                  stats={statsQuery.data?.pending ?? 0}
                  subText={t(
                    "violationReport.stats.pendingSub",
                    "Cần rà soát & xác minh",
                  )}
                  icon={<Clock3 className="h-5 w-5" />}
                  iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                />
                <OverviewCard
                  title={t("violationReport.stats.resolved", "Đã hoàn tất")}
                  stats={statsQuery.data?.resolved ?? 0}
                  subText={t(
                    "violationReport.stats.resolvedSub",
                    "Đã kết luận và ghi nhận",
                  )}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                />
                <OverviewCard
                  title={t("violationReport.stats.categories", "Nhóm vi phạm")}
                  stats={Object.keys(statsQuery.data?.by_type ?? {}).length}
                  subText={t(
                    "violationReport.stats.categoriesSub",
                    "Phân loại hành vi ghi nhận",
                  )}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                />
              </>
            )}
          </ul>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  "violationReport.searchPlaceholder",
                  "Tìm theo người báo cáo, người bị báo cáo hoặc nội dung...",
                )}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ReportStatus | "all");
                  setViolationsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="all">
                  {t("violationReport.filters.allStatuses", "Tất cả trạng thái")}
                </option>
                <option value="pending">
                  {t("violationReport.status.pending", "Chờ xử lý")}
                </option>
                <option value="processing">
                  {t("violationReport.status.processing", "Đang xác minh")}
                </option>
                <option value="resolved">
                  {t("violationReport.status.resolved", "Đã xử lý")}
                </option>
                <option value="dismissed">
                  {t("violationReport.status.dismissed", "Đã bỏ qua")}
                </option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as ReportType | "all");
                  setViolationsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="all">
                  {t("violationReport.filters.allTypes", "Tất cả loại vi phạm")}
                </option>
                {(Object.keys(REPORT_TYPE_META) as ReportType[]).map((key) => (
                  <option key={key} value={key}>
                    {t(
                      `violationReport.types.${REPORT_TYPE_META[key].labelKey}`,
                      REPORT_TYPE_META[key].label,
                    )}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {reportsQuery.isError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {t(
                  "violationReport.loadError",
                  "Không thể tải danh sách báo cáo vi phạm.",
                )}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void reportsQuery.refetch()}
              >
                {t("common.retry", "Thử lại")}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/60">
                    <TableHead>
                      {t("violationReport.table.reportedUser", "Đối tượng bị báo cáo")}
                    </TableHead>
                    <TableHead>
                      {t("violationReport.table.reporter", "Người gửi")}
                    </TableHead>
                    <TableHead>
                      {t("violationReport.table.type", "Loại vi phạm")}
                    </TableHead>
                    <TableHead>
                      {t("violationReport.table.reason", "Lý do")}
                    </TableHead>
                    <TableHead>
                      {t("violationReport.table.status", "Trạng thái")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("violationReport.table.action", "Thao tác")}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {reportsQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                          <Database className="h-8 w-8 opacity-60" />
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {t(
                              "violationReport.empty",
                              "Không có báo cáo vi phạm nào phù hợp bộ lọc hiện tại.",
                            )}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((item) => {
                      const typeMeta =
                        REPORT_TYPE_META[item.reportType] ??
                        REPORT_TYPE_META.other;
                      const TypeIcon = typeMeta.icon;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.reportedUserName || item.reportedUserId || "--"}
                            </div>
                            {item.reportedUserEmail ? (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {item.reportedUserEmail}
                              </div>
                            ) : null}
                          </TableCell>

                          <TableCell>
                            <div className="text-sm text-slate-700 dark:text-slate-200">
                              {item.reporterName || item.reporterId || "--"}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1.5 font-medium ${typeMeta.badgeClassName}`}
                            >
                              <TypeIcon
                                className={`h-3.5 w-3.5 ${typeMeta.iconClassName}`}
                              />
                              {t(
                                `violationReport.types.${typeMeta.labelKey}`,
                                typeMeta.label,
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell className="max-w-xs">
                            <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {item.reason}
                            </p>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={STATUS_BADGE_MAP[item.status]}
                            >
                              {t(
                                `violationReport.status.${item.status}`,
                                item.status,
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetail(item)}
                              className="gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t("violationReport.viewDetail", "Xem & xử lý")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>
                  {t("common.page", "Trang")} {reportsQuery.data?.page ?? violationsPage} /{" "}
                  {totalViolationsPages} ({reportsQuery.data?.total ?? 0}{" "}
                  {t("common.records", "bản ghi")})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={violationsPage <= 1 || reportsQuery.isFetching}
                    onClick={() => setViolationsPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      violationsPage >= totalViolationsPages ||
                      reportsQuery.isFetching
                    }
                    onClick={() =>
                      setViolationsPage((p) => Math.min(totalViolationsPages, p + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t(
                    "violationReport.reviews.topDoctorsTitle",
                    "Bác sĩ đánh giá cao nổi bật",
                  )}
                </h2>
              </div>

              {selectedDoctorId ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedDoctorId("");
                    setReviewsPage(1);
                  }}
                >
                  {t("violationReport.reviews.clearDoctorFilter", "Hiện tất cả bác sĩ")}
                </Button>
              ) : null}
            </div>

            {topDoctorsQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (topDoctorsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t(
                  "violationReport.reviews.noTopDoctors",
                  "Chưa có dữ liệu xếp hạng bác sĩ.",
                )}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(topDoctorsQuery.data ?? []).map((doc) => {
                  const active = selectedDoctorId === doc.doctorId;
                  return (
                    <button
                      key={doc.doctorId}
                      type="button"
                      onClick={() => {
                        setSelectedDoctorId(active ? "" : doc.doctorId);
                        setReviewsPage(1);
                      }}
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-colors ${
                        active
                          ? "border-blue-500 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/30"
                          : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {doc.doctorName}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {doc.specialty ||
                            t("violationReport.reviews.generalSpecialty", "Đa khoa")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1 font-bold text-amber-600 dark:text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>{doc.averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {doc.totalReviews}{" "}
                          {t("violationReport.reviews.reviewCountUnit", "đánh giá")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedDoctorId && doctorRatingQuery.data ? (
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-700 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {t("violationReport.reviews.ratingBreakdown", "Phân bố điểm đánh giá")}:
                </span>
                <span>5★: {doctorRatingQuery.data.starDistribution.fiveStar}</span>
                <span>4★: {doctorRatingQuery.data.starDistribution.fourStar}</span>
                <span>3★: {doctorRatingQuery.data.starDistribution.threeStar}</span>
                <span>2★: {doctorRatingQuery.data.starDistribution.twoStar}</span>
                <span>1★: {doctorRatingQuery.data.starDistribution.oneStar}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={ratingFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setRatingFilter(val === "all" ? "all" : Number(val));
                  setReviewsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="all">
                  {t("violationReport.reviews.allRatings", "Tất cả số sao")}
                </option>
                {[5, 4, 3, 2, 1].map((star) => (
                  <option key={star} value={star}>
                    {star} ★
                  </option>
                ))}
              </select>

              <select
                value={reviewSortBy}
                onChange={(e) => {
                  setReviewSortBy(e.target.value as "createdAt" | "rating");
                  setReviewsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="createdAt">
                  {t("violationReport.reviews.sortNewest", "Mới nhất")}
                </option>
                <option value="rating">
                  {t("violationReport.reviews.sortRating", "Điểm cao đến thấp")}
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-800/60">
                  <TableHead>{t("violationReport.reviews.patient", "Bệnh nhân")}</TableHead>
                  <TableHead>{t("violationReport.reviews.doctor", "Bác sĩ")}</TableHead>
                  <TableHead>{t("violationReport.reviews.rating", "Điểm")}</TableHead>
                  <TableHead>{t("violationReport.reviews.comment", "Nhận xét")}</TableHead>
                  <TableHead>{t("violationReport.reviews.flagStatus", "Kiểm duyệt")}</TableHead>
                  <TableHead className="text-right">
                    {t("violationReport.table.action", "Thao tác")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (reviewsQuery.data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                      {t("violationReport.reviews.empty", "Chưa có đánh giá nào phù hợp.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  (reviewsQuery.data?.items ?? []).map((rev) => (
                    <TableRow key={rev.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {rev.patientName || rev.patientId}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {rev.doctorName || rev.doctorId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          <span>{rev.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                          {rev.comment}
                        </p>
                      </TableCell>
                      <TableCell>
                        {rev.flagged ? (
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                          >
                            {t("violationReport.reviews.flagged", "Đã gắn cờ")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            {t("violationReport.reviews.normal", "Hợp lệ")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReviewFlagModal(rev)}
                          className="gap-1.5"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          {t("violationReport.reviews.inspectFlag", "Kiểm tra")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                {t("common.page", "Trang")} {reviewsQuery.data?.page ?? reviewsPage} /{" "}
                {totalReviewsPages} ({reviewsQuery.data?.total ?? 0}{" "}
                {t("common.records", "bản ghi")})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={reviewsPage <= 1 || reviewsQuery.isFetching}
                  onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    reviewsPage >= totalReviewsPages || reviewsQuery.isFetching
                  }
                  onClick={() =>
                    setReviewsPage((p) => Math.min(totalReviewsPages, p + 1))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReportDetailModal
        key={selectedReport?.id ?? "closed"}
        report={selectedReport}
        open={modalOpen}
        isSubmitting={isBusyModal}
        onClose={() => setModalOpen(false)}
        onStartProcessing={handleStartProcessing}
        onResolve={handleResolveReport}
        onDismiss={handleDismissReport}
        onDelete={handleDeleteReport}
      />

      {selectedReview && activeReviewDetail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t("violationReport.reviews.modalTitle", "Kiểm duyệt đánh giá")}
                </h3>
              </div>
              <button
                type="button"
                disabled={flagReviewMutation.isPending}
                onClick={() => setSelectedReview(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("violationReport.reviews.patient", "Bệnh nhân")}
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {activeReviewDetail.patientName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("violationReport.reviews.doctor", "Bác sĩ")}
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {activeReviewDetail.doctorName}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t("violationReport.reviews.comment", "Nhận xét")}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {activeReviewDetail.rating}/5
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200">
                  {activeReviewDetail.comment}
                </p>
              </div>

              <div>
                <label
                  htmlFor="review-admin-notes"
                  className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  {t(
                    "violationReport.reviews.adminNotesLabel",
                    "Ghi chú kiểm duyệt nội bộ",
                  )}
                </label>
                <textarea
                  id="review-admin-notes"
                  rows={3}
                  disabled={flagReviewMutation.isPending}
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                  placeholder={t(
                    "violationReport.reviews.adminNotesPlaceholder",
                    "Nhập lý do gắn cờ nội dung không phù hợp...",
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={flagReviewMutation.isPending}
                onClick={() => setSelectedReview(null)}
              >
                {t("common.cancel", "Hủy")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={flagReviewMutation.isPending}
                onClick={() => void handleSubmitReviewFlag()}
                className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
              >
                <Flag className="h-4 w-4" />
                {flagReviewMutation.isPending
                  ? t("common.saving", "Đang xử lý...")
                  : t("violationReport.reviews.submitFlag", "Gắn cờ đánh giá")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ViolationReport;
