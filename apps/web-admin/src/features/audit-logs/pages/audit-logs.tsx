import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizePaginatedList } from "@healthcare/api-client";
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
  Activity,
  AlertCircle,
  BellRing,
  ClipboardList,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Stethoscope,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { webAdminApi } from "@/lib/api";

type AuditTab = "careAlert" | "operations";
type OperationsSourceFilter = "all" | "violation" | "consultation" | "review";

interface CareAlertAuditEvent {
  id: string;
  domain: string;
  entityType: string;
  entityId?: string;
  action: string;
  userId?: string;
  actorId?: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  expiresAt?: string;
  raw: Record<string, unknown>;
}

interface OperationalFeedEntry {
  id: string;
  source: Exclude<OperationsSourceFilter, "all">;
  action: string;
  status: string;
  summary: string;
  actorOrSubject: string;
  timestamp: string;
  raw: Record<string, unknown>;
}

function formatDateTime(value?: string): string {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function extractRefLabel(ref: unknown): string {
  if (!ref) return "--";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object") {
    const obj = ref as { fullName?: string; name?: string; _id?: string; id?: string };
    return obj.fullName ?? obj.name ?? obj._id ?? obj.id ?? "--";
  }
  return "--";
}

export function AuditLogs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AuditTab>("careAlert");

  // Tab 1: Care Alert Audit lookup (GET /api/v1/care-alerts/:id/audit)
  const [alertIdInput, setAlertIdInput] = useState("");
  const [queriedAlertId, setQueriedAlertId] = useState<string | null>(null);
  const [alertEvents, setAlertEvents] = useState<CareAlertAuditEvent[]>([]);
  const [isAlertLoading, setIsAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Tab 2: Live Operational & Moderation Audit Feed
  const [sourceFilter, setSourceFilter] =
    useState<OperationsSourceFilter>("all");
  const [feedSearch, setFeedSearch] = useState("");

  // Inspect payload modal
  const [inspectPayload, setInspectPayload] = useState<{
    title: string;
    data: Record<string, unknown>;
  } | null>(null);

  const handleQueryCareAlertAudit = async () => {
    const trimmed = alertIdInput.trim();
    if (!trimmed) {
      showToast.error(
        t(
          "auditLogs.careAlert.idRequired",
          "Vui lòng nhập mã cảnh báo chăm sóc để tra cứu.",
        ),
      );
      return;
    }

    setIsAlertLoading(true);
    setAlertError(null);
    setQueriedAlertId(trimmed);

    try {
      const response = await webAdminApi.careAlertAudit({
        params: { id: trimmed },
      });
      const list = Array.isArray(response)
        ? response
        : normalizePaginatedList<Record<string, unknown>>(response).items;

      const mapped: CareAlertAuditEvent[] = (
        list as Array<Record<string, unknown>>
      ).map((item, idx) => ({
        id: String(item._id ?? item.id ?? `${trimmed}-${idx}`),
        domain: String(item.domain ?? "chronic-care"),
        entityType: String(item.entityType ?? "CareAlert"),
        entityId:
          typeof item.entityId === "string" ? item.entityId : undefined,
        action: String(item.action ?? "event"),
        userId: typeof item.userId === "string" ? item.userId : undefined,
        actorId: typeof item.actorId === "string" ? item.actorId : undefined,
        fromStatus:
          typeof item.fromStatus === "string" ? item.fromStatus : undefined,
        toStatus: typeof item.toStatus === "string" ? item.toStatus : undefined,
        reason: typeof item.reason === "string" ? item.reason : undefined,
        metadata:
          item.metadata && typeof item.metadata === "object"
            ? (item.metadata as Record<string, unknown>)
            : undefined,
        ipAddress:
          typeof item.ipAddress === "string" ? item.ipAddress : undefined,
        userAgent:
          typeof item.userAgent === "string" ? item.userAgent : undefined,
        expiresAt:
          typeof item.expiresAt === "string" ? item.expiresAt : undefined,
        raw: item,
      }));

      setAlertEvents(mapped);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(
              "auditLogs.careAlert.loadError",
              "Không thể tải lịch sử kiểm toán cho cảnh báo này.",
            );
      setAlertError(message);
      setAlertEvents([]);
    } finally {
      setIsAlertLoading(false);
    }
  };

  const fetchOperationalFeed = async (): Promise<OperationalFeedEntry[]> => {
    const [violationsRes, consultationsRes, reviewsRes] =
      await Promise.allSettled([
        webAdminApi.violationsFindAll({ query: { page: 1, limit: 15 } }),
        webAdminApi.adminGetAllConsultations({
          query: { page: 1, limit: 15, sortBy: "updatedAt", sortOrder: -1 },
        }),
        webAdminApi.reviewsFindAll({
          query: { page: 1, limit: 15, sortBy: "createdAt", sortOrder: -1 },
        }),
      ]);

    const entries: OperationalFeedEntry[] = [];

    if (violationsRes.status === "fulfilled") {
      const list = normalizePaginatedList<Record<string, unknown>>(
        violationsRes.value,
      ).items;
      for (const item of list) {
        entries.push({
          id: `violation-${String(item._id ?? item.id ?? Math.random())}`,
          source: "violation",
          action: String(item.reportType ?? item.report_type ?? "violation"),
          status: String(item.status ?? "pending"),
          summary: String(item.reason ?? "--"),
          actorOrSubject: `${extractRefLabel(item.reporterId)} -> ${extractRefLabel(item.reportedUserId)}`,
          timestamp: String(item.updatedAt ?? item.createdAt ?? ""),
          raw: item,
        });
      }
    }

    if (consultationsRes.status === "fulfilled") {
      const list = normalizePaginatedList<Record<string, unknown>>(
        consultationsRes.value,
      ).items;
      for (const item of list) {
        entries.push({
          id: `consultation-${String(item._id ?? item.id ?? Math.random())}`,
          source: "consultation",
          action: String(item.consultationType ?? "consultation"),
          status: String(item.status ?? "pending"),
          summary: `${extractRefLabel(item.patientId)} / ${extractRefLabel(item.doctorId)}`,
          actorOrSubject: String(item.consultationNumber ?? item._id ?? "--"),
          timestamp: String(item.updatedAt ?? item.createdAt ?? ""),
          raw: item,
        });
      }
    }

    if (reviewsRes.status === "fulfilled") {
      const list = normalizePaginatedList<Record<string, unknown>>(
        reviewsRes.value,
      ).items;
      for (const item of list) {
        entries.push({
          id: `review-${String(item._id ?? item.id ?? Math.random())}`,
          source: "review",
          action: item.flagged ? "review_flagged" : "review_posted",
          status: item.flagged ? "flagged" : `${item.rating ?? 0}★`,
          summary: String(item.comment ?? "--"),
          actorOrSubject: `${extractRefLabel(item.patientId)} -> ${extractRefLabel(item.doctorId)}`,
          timestamp: String(item.createdAt ?? item.updatedAt ?? ""),
          raw: item,
        });
      }
    }

    if (
      violationsRes.status === "rejected" &&
      consultationsRes.status === "rejected" &&
      reviewsRes.status === "rejected"
    ) {
      throw new Error(
        t(
          "auditLogs.operations.loadError",
          "Không thể kết nối dữ liệu nhật ký hoạt động.",
        ),
      );
    }

    entries.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return entries;
  };

  const feedQuery = useQuery({
    queryKey: ["audit-logs", "operations-feed"],
    queryFn: fetchOperationalFeed,
    enabled: activeTab === "operations",
  });

  const isFeedLoading = feedQuery.isLoading || feedQuery.isFetching;
  const feedError =
    feedQuery.error instanceof Error
      ? feedQuery.error.message
      : feedQuery.isError
        ? t(
            "auditLogs.operations.loadError",
            "Không thể kết nối dữ liệu nhật ký hoạt động.",
          )
        : null;

  const filteredFeed = useMemo(() => {
    const query = feedSearch.trim().toLowerCase();
    return (feedQuery.data ?? []).filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      if (!query) return true;
      return (
        item.action.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.actorOrSubject.toLowerCase().includes(query)
      );
    });
  }, [feedQuery.data, feedSearch, sourceFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("auditLogs.title", "Nhật ký kiểm toán & vận hành")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "auditLogs.subtitle",
              "Tra cứu dấu vết xử lý cảnh báo chăm sóc và theo dõi hoạt động hệ thống theo thời gian thực.",
            )}
          </p>
        </div>

        {activeTab === "operations" ? (
          <Button
            type="button"
            variant="outline"
            disabled={isFeedLoading}
            onClick={() => void feedQuery.refetch()}
            className="gap-2 self-start sm:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFeedLoading ? "animate-spin" : ""}`}
            />
            {t("common.refresh", "Làm mới")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("careAlert")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "careAlert"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <BellRing className="h-4 w-4" />
          {t("auditLogs.tabs.careAlertAudit", "Dấu vết cảnh báo chăm sóc")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "operations"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          {t("auditLogs.tabs.operationsFeed", "Hoạt động vận hành gần đây")}
        </button>
      </div>

      {activeTab === "careAlert" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t(
                "auditLogs.careAlert.promptTitle",
                "Nhập mã cảnh báo để xem toàn bộ lịch sử chuyển trạng thái và người thực hiện",
              )}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={alertIdInput}
                  disabled={isAlertLoading}
                  onChange={(e) => setAlertIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleQueryCareAlertAudit();
                    }
                  }}
                  placeholder={t(
                    "auditLogs.careAlert.inputPlaceholder",
                    "Ví dụ: 6791b4c2d1e8f9a012345678",
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-10 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <Button
                type="button"
                disabled={isAlertLoading}
                onClick={() => void handleQueryCareAlertAudit()}
                className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Activity className="h-4 w-4" />
                {isAlertLoading
                  ? t("auditLogs.careAlert.searching", "Đang tra cứu...")
                  : t("auditLogs.careAlert.searchBtn", "Tra cứu dấu vết")}
              </Button>
            </div>
          </div>

          {alertError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {alertError}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/60">
                    <TableHead>{t("auditLogs.table.action", "Hành động")}</TableHead>
                    <TableHead>
                      {t("auditLogs.table.transition", "Chuyển trạng thái")}
                    </TableHead>
                    <TableHead>{t("auditLogs.table.actor", "Người thực hiện")}</TableHead>
                    <TableHead>{t("auditLogs.table.reason", "Lý do")}</TableHead>
                    <TableHead>{t("auditLogs.table.ip", "Địa chỉ IP")}</TableHead>
                    <TableHead className="text-right">
                      {t("auditLogs.table.details", "Dữ liệu")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAlertLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : alertEvents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        {queriedAlertId
                          ? t(
                              "auditLogs.careAlert.noEventsFound",
                              "Không tìm thấy sự kiện kiểm toán nào cho mã cảnh báo này.",
                            )
                          : t(
                              "auditLogs.careAlert.idlePrompt",
                              "Hãy nhập mã cảnh báo để xem chi tiết lịch sử kiểm toán.",
                            )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    alertEvents.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ev.action}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {ev.domain} · {ev.entityType}
                          </div>
                        </TableCell>

                        <TableCell>
                          {ev.fromStatus || ev.toStatus ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Badge variant="outline">
                                {ev.fromStatus ?? "--"}
                              </Badge>
                              <span>→</span>
                              <Badge
                                variant="outline"
                                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                              >
                                {ev.toStatus ?? "--"}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">--</span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                          {ev.actorId ?? ev.userId ?? "--"}
                        </TableCell>

                        <TableCell className="max-w-xs text-sm text-slate-700 dark:text-slate-300">
                          {ev.reason ?? "--"}
                        </TableCell>

                        <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {ev.ipAddress ?? "--"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setInspectPayload({
                                title: `${ev.entityType} — ${ev.action}`,
                                data: ev.metadata ?? ev.raw,
                              })
                            }
                            className="gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {t("auditLogs.inspect", "Xem")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                placeholder={t(
                  "auditLogs.operations.searchPlaceholder",
                  "Lọc theo hành động, chủ thể hoặc nội dung...",
                )}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(e.target.value as OperationsSourceFilter)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">
                {t("auditLogs.operations.allSources", "Tất cả nguồn sự kiện")}
              </option>
              <option value="violation">
                {t("auditLogs.operations.sources.violation", "Vi phạm")}
              </option>
              <option value="consultation">
                {t("auditLogs.operations.sources.consultation", "Ca tư vấn")}
              </option>
              <option value="review">
                {t("auditLogs.operations.sources.review", "Đánh giá")}
              </option>
            </select>
          </div>

          {feedError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {feedError}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void feedQuery.refetch()}
              >
                {t("common.retry", "Thử lại")}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/60">
                    <TableHead>{t("auditLogs.operations.source", "Phân hệ")}</TableHead>
                    <TableHead>{t("auditLogs.table.action", "Sự kiện")}</TableHead>
                    <TableHead>{t("auditLogs.operations.subject", "Đối tượng")}</TableHead>
                    <TableHead>{t("auditLogs.table.reason", "Tóm tắt")}</TableHead>
                    <TableHead>{t("auditLogs.operations.time", "Thời gian")}</TableHead>
                    <TableHead className="text-right">
                      {t("auditLogs.table.details", "Chi tiết")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFeedLoading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredFeed.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        {t(
                          "auditLogs.operations.empty",
                          "Không có bản ghi hoạt động nào phù hợp.",
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFeed.map((entry) => {
                      const SourceIcon =
                        entry.source === "violation"
                          ? ShieldAlert
                          : entry.source === "consultation"
                            ? Stethoscope
                            : Star;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Badge variant="outline" className="gap-1.5">
                              <SourceIcon className="h-3.5 w-3.5" />
                              {t(
                                `auditLogs.operations.sources.${entry.source}`,
                                entry.source,
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {entry.action}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {entry.status}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                            {entry.actorOrSubject}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                              {entry.summary}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateTime(entry.timestamp)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setInspectPayload({
                                  title: `${entry.source.toUpperCase()} — ${entry.action}`,
                                  data: entry.raw,
                                })
                              }
                              className="gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t("auditLogs.inspect", "Xem")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {inspectPayload ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {inspectPayload.title}
              </h3>
              <button
                type="button"
                onClick={() => setInspectPayload(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(inspectPayload.data, null, 2)}
              </pre>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-3 dark:border-slate-800">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setInspectPayload(null)}
              >
                {t("common.close", "Đóng")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AuditLogs;
