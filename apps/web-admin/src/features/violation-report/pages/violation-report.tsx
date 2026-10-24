import { useEffect, useMemo, useState } from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/ui/combobox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@repo/ui/components/ui/pagination";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { Search, Database } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

import { useReportList } from "../hooks/useReportManagement";
import { useChangeReportStatus } from "../hooks/useChangeReportStatus";
import { useBanUser } from "@/features/user-management/hooks/useUserManagement";
import { showToast } from "@repo/ui/components/ui/toasts";
import { ReportDetailModal } from "../components/report-detail-modal";
import { REPORT_TYPE_META } from "../types";
import type {
  ReportType,
  ReportStatus,
  ResolutionAction,
  ViolationReportItem,
} from "../types";

export function ViolationReport() {
  const { t } = useTranslation();
  const [reportOverrides, setReportOverrides] = useState<
    Record<
      string,
      Partial<Pick<ViolationReportItem, "status" | "accountStatus">>
    >
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ReportType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 8;
  const {
    response: reportListResponse,
    isLoading: isReportListLoading,
    error: reportListError,
    loadReportList,
  } = useReportList();
  const {
    isLoading: isChangingReportStatus,
    error: changeReportStatusError,
  } = useChangeReportStatus();
  const {
    submitBanUser,
    isLoading: isBanningUser,
    error: banUserError,
  } = useBanUser();

  const modalLoading = isChangingReportStatus || isBanningUser;

  useEffect(() => {
    const fetchReports = async () => {
      const loaded = await loadReportList();
      if (loaded === null) {
        showToast.error(t("violationReport.toasts.loadFailed", "Failed to load violation reports"));
      }
    };

    void fetchReports();
  }, [loadReportList, t]);

  const reportList = useMemo(() => {
    if (!reportListResponse) {
      return [] as ViolationReportItem[];
    }

    return reportListResponse.reportListReceiver.map((item) => ({
      id: item.id,
      reportedUserId: item.reportedUserId,
      reporterName: item.reporterName,
      reportedAccount: item.reportedAccount,
      reportType: item.reportType,
      reason: item.reason,
      status: reportOverrides[item.id]?.status ?? item.status,
      accountStatus:
        reportOverrides[item.id]?.accountStatus ?? item.accountStatus,
      createdAt: item.createdAt,
    }));
  }, [reportListResponse, reportOverrides]);

  const selectedReport = useMemo(
    () => reportList.find((item) => item.id === selectedReportId) ?? null,
    [reportList, selectedReportId],
  );

  const filteredReports = useMemo(() => {
    return reportList.filter((report) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        report.reporterName.toLowerCase().includes(query) ||
        report.reportedAccount.toLowerCase().includes(query) ||
        report.reason.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;
      const matchesType =
        typeFilter === "all" || report.reportType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reportList, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / itemsPerPage),
  );
  const currentSafePage = Math.min(currentPage, totalPages);
  const startIndex = (currentSafePage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const pendingCount = reportList.filter((x) => x.status === "pending").length;

  const openReportModal = (report: ViolationReportItem) => {
    setSelectedReportId(report.id);
    setIsModalOpen(true);
  };

  const handleBanUser = async (id: string) => {
    const targetReport = reportList.find((item) => item.id === id);
    if (!targetReport?.reportedUserId) return;
    try {
      await submitBanUser({
        id: targetReport.reportedUserId,
        reason: `Violation report ${id}`,
      });
      setReportOverrides((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          accountStatus: "banned",
        },
      }));
    } catch {
      showToast.error(t("violationReport.toasts.cannotBan", "Cannot ban this user!"));
    }
  };

  const handleApplyResolution = async (
    id: string,
    action: ResolutionAction,
    notes: string
  ) => {
    const targetReport = reportList.find((item) => item.id === id);
    if (!targetReport) return;

    if (action === "ban" && targetReport.reportedUserId) {
      await handleBanUser(id);
    }

    setReportOverrides((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: "resolved",
      },
    }));

    showToast.success(
      t("violationReport.toasts.resolutionApplied", "Resolution applied ({{action}})", { action }) +
        (notes ? `: ${notes}` : "") + "!"
    );
    setIsModalOpen(false);
  };

  const handleDismissReport = (id: string) => {
    setReportOverrides((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: "dismissed",
      },
    }));

    showToast.success(t("violationReport.toasts.dismissSuccess", "Report dismissed."));
    setIsModalOpen(false);
  };

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-5">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-gray-100">
            {t("violationReport.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {t("violationReport.subtitle")}
          </p>
          <p className="py-4 text-2xl dark:text-gray-200">
            <Trans
              i18nKey="violationReport.pendingCount"
              values={{ count: pendingCount }}
              components={[<span key="1" className="font-bold text-amber-500" />]}
            />
          </p>
        </div>

        {/* Loading */}
        {isReportListLoading ? (
          <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-500 dark:text-gray-400">
            {t("violationReport.loading", "Loading violation reports...")}
          </div>
        ) : null}

        {reportListError || changeReportStatusError || banUserError ? (
          <div className="mb-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {reportListError || changeReportStatusError || banUserError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t("violationReport.filters.search")}
                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-xs text-slate-700 dark:text-gray-200 outline-none ring-brand/30 transition focus:ring-2 md:w-72"
                />
              </div>

              <Combobox
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as "all" | ReportType);
                  setCurrentPage(1);
                }}
              >
                <ComboboxInput
                  placeholder={t("violationReport.filters.filterType")}
                  className="w-full md:w-52 bg-white dark:bg-slate-900 dark:border-slate-700"
                />
                <ComboboxContent className="dark:bg-slate-900">
                  <ComboboxEmpty>{t("violationReport.filters.noTypeFound", "No type found.")}</ComboboxEmpty>
                  <ComboboxList>
                    <ComboboxItem value="all">{t("violationReport.filters.allTypes")}</ComboboxItem>
                    {Object.keys(REPORT_TYPE_META).map((value) => (
                      <ComboboxItem key={value} value={value}>
                        {t(`violationReport.types.${value}`)}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>

              <Combobox
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as "all" | ReportStatus);
                  setCurrentPage(1);
                }}
              >
                <ComboboxInput
                  placeholder={t("violationReport.filters.filterStatus")}
                  className="w-full md:w-44 bg-white dark:bg-slate-900 dark:border-slate-700"
                />
                <ComboboxContent className="dark:bg-slate-900">
                  <ComboboxEmpty>{t("violationReport.filters.noStatusFound", "No status found.")}</ComboboxEmpty>
                  <ComboboxList>
                    <ComboboxItem value="all">{t("violationReport.filters.allStatus")}</ComboboxItem>
                    <ComboboxItem value="pending">{t("violationReport.filters.pending")}</ComboboxItem>
                    <ComboboxItem value="resolved">{t("violationReport.filters.resolved")}</ComboboxItem>
                    <ComboboxItem value="dismissed">{t("violationReport.filters.dismissed", "Dismissed")}</ComboboxItem>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm dark:border-b dark:border-slate-800">
                  <TableHead className="px-3 text-xs text-slate-400 dark:text-slate-500">
                    {t("violationReport.table.type")}
                  </TableHead>
                  <TableHead className="px-3 text-xs text-slate-400 dark:text-slate-500">
                    {t("violationReport.table.reportedBy")}
                  </TableHead>
                  <TableHead className="px-3 text-xs text-slate-400 dark:text-slate-500">
                    {t("violationReport.table.reportedAccount")}
                  </TableHead>
                  <TableHead className="px-3 text-xs text-slate-400 dark:text-slate-500">
                    {t("violationReport.table.details")}
                  </TableHead>
                  <TableHead className="px-3 text-xs text-slate-400 dark:text-slate-500">
                    {t("violationReport.table.date")}
                  </TableHead>
                  <TableHead className="px-3 text-xs text-slate-400 dark:text-slate-500">
                    {t("violationReport.table.status")}
                  </TableHead>
                  <TableHead className="px-3 text-xs text-slate-400 dark:text-slate-500">
                    {t("violationReport.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {isReportListLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell className="px-4"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-8 w-16 rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((report) => {
                  const typeMeta = REPORT_TYPE_META[report.reportType];
                  const TypeIcon = typeMeta.icon;

                  return (
                    <TableRow key={report.id}>
                      <TableCell className="px-4">
                        <Badge
                          variant="outline"
                          className={`h-6 gap-1 rounded-full border px-2 text-[11px] ${typeMeta.badgeClassName}`}
                        >
                          <TypeIcon
                            className={`h-3.5 w-3.5 ${typeMeta.iconClassName}`}
                          />
                          {t(`violationReport.types.${report.reportType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 text-sm font-medium text-slate-700 dark:text-gray-300">
                        {report.reporterName}
                      </TableCell>
                      <TableCell className="px-4 text-sm text-slate-600 dark:text-gray-400">
                        {report.reportedAccount}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate px-4 text-sm text-slate-500 dark:text-gray-500">
                        {report.reason}
                      </TableCell>
                      <TableCell className="px-4 text-sm text-slate-500 dark:text-gray-500">
                        {report.createdAt}
                      </TableCell>
                      <TableCell className="px-4">
                        <Badge
                          variant="outline"
                          className={`h-5 rounded-full border px-2 text-[10px] font-medium ${
                            report.status === "pending"
                              ? "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                              : report.status === "dismissed"
                              ? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              : "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {report.status === "pending"
                            ? t("violationReport.modal.pending")
                            : report.status === "dismissed"
                            ? t("violationReport.modal.dismissed", "Dismissed")
                            : t("violationReport.modal.resolved")}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 text-left">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                          onClick={() => openReportModal(report)}
                          disabled={modalLoading}
                        >
                          {t("violationReport.table.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-3 py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Database className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      </div>
                      <h3 className="text-slate-900 dark:text-gray-100 font-medium mb-1">{t("violationReport.table.noReports")}</h3>
                      <p className="text-slate-500 dark:text-gray-500 text-sm">{t("violationReport.table.tryAdjusting")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-400 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {t("violationReport.pagination.showing", {
                count: paginatedReports.length,
                total: filteredReports.length,
                defaultValue: `Showing ${paginatedReports.length} of ${filteredReports.length} results`,
              })}
            </p>

            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text=""
                      className={
                        currentSafePage === 1
                          ? "pointer-events-none opacity-40"
                          : ""
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentSafePage > 1) {
                          setCurrentPage(currentSafePage - 1);
                        }
                      }}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }).map((_, index) => {
                    const page = index + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentSafePage}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          className="h-7 w-7 rounded-lg text-xs"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text=""
                      className={
                        currentSafePage === totalPages
                          ? "pointer-events-none opacity-40"
                          : ""
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentSafePage < totalPages) {
                          setCurrentPage(currentSafePage + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>

        <ReportDetailModal
          key={selectedReport?.id}
          report={selectedReport}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedReportId(null);
          }}
          onApplyResolution={handleApplyResolution}
          onDismissReport={handleDismissReport}
          isUpdating={modalLoading}
        />
      </div>
    </div>
  );
}
