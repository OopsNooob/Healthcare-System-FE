import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { OverviewCard } from "@repo/ui/components/data-display/overview-card";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useAuthStore } from "@repo/ui/store/useAuthStore";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Stethoscope,
  Video,
  X,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  connectConsultationsSocket,
  consultationsSocket,
  SOCKET_EVENTS,
} from "@/lib/api";
import { AppointmentDetailModal } from "../components/appointment-detail-modal";
import {
  appointmentManagementService,
  type Appointment,
} from "../services/appointment-management.service";

const PAGE_LIMIT = 20;

export function AppointmentManagement() {
  const { t } = useTranslation();
  const locale = t("common.dateLocale", "vi-VN");
  const token = useAuthStore((state) => state.token);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const inFlightRef = useRef(false);

  const fetchAppointments = useCallback(
    async (targetPage: number, statusFilter: string) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await appointmentManagementService.listAppointments({
          page: targetPage,
          limit: PAGE_LIMIT,
          status: statusFilter,
          locale,
        });
        setAppointments(result.items);
        setTotalCount(result.total);
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : t(
                "appointmentManagement.errors.loadFailed",
                "Không thể tải danh sách lịch hẹn.",
              );
        setError(msg);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [locale, t],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAppointments(page, selectedStatus);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAppointments, page, selectedStatus]);

  // Realtime updates via /consultations Socket.IO namespace
  useEffect(() => {
    if (!token) return;
    connectConsultationsSocket(token);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fetchAppointments(page, selectedStatus);
      }, 300);
    };

    const events = [
      SOCKET_EVENTS.consultations.server.consultationChanged,
      SOCKET_EVENTS.consultations.server.queueChanged,
      SOCKET_EVENTS.consultations.server.queueCalled,
    ] as const;

    events.forEach((eventName) => {
      consultationsSocket.on(eventName, scheduleRefresh);
    });

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((eventName) => {
        consultationsSocket.off(eventName, scheduleRefresh);
      });
    };
  }, [fetchAppointments, page, selectedStatus, token]);

  const doctorOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const apt of appointments) {
      if (apt.doctor && apt.doctor !== "-") unique.add(apt.doctor);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((apt) => {
      if (selectedStatus === "Canceled" && apt.status !== "Canceled") {
        return false;
      }
      if (selectedType !== "all" && apt.type !== selectedType) {
        return false;
      }
      if (selectedDoctor !== "all" && apt.doctor !== selectedDoctor) {
        return false;
      }
      if (q) {
        const hay = `${apt.patient} ${apt.doctor} ${apt.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [appointments, searchQuery, selectedStatus, selectedType, selectedDoctor]);

  const activeFiltersCount =
    (selectedStatus !== "all" ? 1 : 0) +
    (selectedType !== "all" ? 1 : 0) +
    (selectedDoctor !== "all" ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedDoctor("all");
    setSearchQuery("");
    setPage(1);
  };

  const statsSummary = useMemo(() => {
    const pageLen = appointments.length;
    const completed = appointments.filter(
      (a) => a.status === "Completed",
    ).length;
    const canceled = appointments.filter(
      (a) => a.status === "Canceled",
    ).length;
    const waitValues = appointments
      .map((a) => a.estimatedWaitMinutes)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const avgWait =
      waitValues.length > 0
        ? Math.round(
            (waitValues.reduce((acc, v) => acc + v, 0) / waitValues.length) *
              10,
          ) / 10
        : null;

    const completionRate =
      pageLen > 0 ? Math.round((completed / pageLen) * 100) : 0;
    const cancelRate =
      pageLen > 0 ? Math.round((canceled / pageLen) * 100) : 0;

    return {
      total: totalCount,
      completed,
      canceled,
      completionRate,
      cancelRate,
      avgWaitText:
        avgWait !== null
          ? `${avgWait} ${t("appointmentManagement.stats.minutesUnit", "phút")}`
          : "—",
    };
  }, [appointments, t, totalCount]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("appointmentManagement.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("appointmentManagement.subtitle")}
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void fetchAppointments(page, selectedStatus)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("appointmentManagement.refresh", "Làm mới")}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 flex items-center justify-between gap-3 text-xs text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchAppointments(page, selectedStatus)}
            className="font-semibold underline hover:no-underline cursor-pointer disabled:opacity-50"
          >
            {t("appointmentManagement.retry", "Thử lại")}
          </button>
        </div>
      )}

      {/* Overview Stats */}
      <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard
          title={t("appointmentManagement.stats.totalAll", "Tổng ca tư vấn")}
          stats={statsSummary.total}
          subText={t("appointmentManagement.stats.shownInPage", {
            count: appointments.length,
            defaultValue: `${appointments.length} ca trên trang này`,
          })}
          icon={<Calendar className="w-5 h-5" />}
          iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <OverviewCard
          title={t("appointmentManagement.stats.completed")}
          stats={statsSummary.completed}
          subText={`${t("appointmentManagement.stats.completionRate")}: ${statsSummary.completionRate}%`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <OverviewCard
          title={t("appointmentManagement.stats.canceled")}
          stats={statsSummary.canceled}
          subText={`${t("appointmentManagement.stats.cancelationRate")}: ${statsSummary.cancelRate}%`}
          icon={<XCircle className="w-5 h-5" />}
          iconClassName="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
        <OverviewCard
          title={t("appointmentManagement.stats.avgWaitTime")}
          stats={statsSummary.avgWaitText}
          subText={t("appointmentManagement.stats.liveQueueSub", "Theo dữ liệu hàng chờ")}
          icon={<Clock className="w-5 h-5" />}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </ul>

      {/* Queue & Consultations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("appointmentManagement.queue.title")}
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("appointmentManagement.queue.searchPlaceholder")}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 py-2 pl-9 pr-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`px-3 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isFilterOpen || activeFiltersCount > 0
                  ? "bg-brand text-slate-950 border-brand"
                  : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <Filter className="w-4 h-4" />
              {t("appointmentManagement.queue.filter")}
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-900 text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {isFilterOpen && (
          <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("appointmentManagement.filters.title")}
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                >
                  {t("appointmentManagement.filters.reset")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("appointmentManagement.filters.status")}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("appointmentManagement.filters.allStatuses")}</option>
                  <option value="In Progress">{t("appointmentManagement.status.inProgress")}</option>
                  <option value="Waiting">{t("appointmentManagement.status.waiting")}</option>
                  <option value="Scheduled">{t("appointmentManagement.status.scheduled")}</option>
                  <option value="Completed">{t("appointmentManagement.status.completed")}</option>
                  <option value="Canceled">{t("appointmentManagement.status.canceled")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("appointmentManagement.filters.type")}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("appointmentManagement.filters.allTypes")}</option>
                  <option value="Video Call">{t("appointmentManagement.types.videoCall")}</option>
                  <option value="Chat">{t("appointmentManagement.types.chat")}</option>
                  <option value="Direct Consultation">{t("appointmentManagement.types.consultation")}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("appointmentManagement.filters.doctor")}
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("appointmentManagement.filters.allDoctors")}</option>
                  {doctorOptions.map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active filter pills */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {t("appointmentManagement.filters.filteringBy")}:
            </span>
            {selectedStatus !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/20 text-slate-800 dark:text-brand font-medium">
                {selectedStatus === "In Progress"
                  ? t("appointmentManagement.status.inProgress")
                  : selectedStatus === "Waiting"
                    ? t("appointmentManagement.status.waiting")
                    : selectedStatus === "Scheduled"
                      ? t("appointmentManagement.status.scheduled")
                      : selectedStatus === "Completed"
                        ? t("appointmentManagement.status.completed")
                        : t("appointmentManagement.status.canceled")}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatus("all");
                    setPage(1);
                  }}
                  className="hover:text-rose-500 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedType !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/20 text-slate-800 dark:text-brand font-medium">
                {selectedType === "Video Call"
                  ? t("appointmentManagement.types.videoCall")
                  : selectedType === "Chat"
                    ? t("appointmentManagement.types.chat")
                    : t("appointmentManagement.types.consultation")}
                <button
                  type="button"
                  onClick={() => setSelectedType("all")}
                  className="hover:text-rose-500 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedDoctor !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/20 text-slate-800 dark:text-brand font-medium">
                {selectedDoctor}
                <button
                  type="button"
                  onClick={() => setSelectedDoctor("all")}
                  className="hover:text-rose-500 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-500 hover:underline ml-auto font-medium cursor-pointer"
            >
              {t("appointmentManagement.filters.clearAll")}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                <th className="px-6 py-3 font-medium whitespace-nowrap">
                  {t("appointmentManagement.table.timePos")}
                </th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">
                  {t("appointmentManagement.table.patient")}
                </th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">
                  {t("appointmentManagement.table.doctor")}
                </th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">
                  {t("appointmentManagement.table.type")}
                </th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">
                  {t("appointmentManagement.table.status")}
                </th>
                <th className="px-6 py-3 font-medium text-right whitespace-nowrap">
                  {t("appointmentManagement.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-6 w-8 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => (
                  <tr
                    key={apt.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      <div>{apt.time}</div>
                      <div className="text-[11px] font-normal text-gray-400 dark:text-gray-500">
                        {apt.mode === "on_demand"
                          ? t("appointmentManagement.detailModal.modeOnDemand", "Khám ngay")
                          : t("appointmentManagement.detailModal.modeScheduled", "Đặt lịch trước")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {apt.patient}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-700 dark:text-gray-300">
                        {apt.doctor}
                      </div>
                      {apt.doctorSpecialty && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                          {apt.doctorSpecialty}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {apt.type === "Video Call" ? (
                          <Video className="w-3.5 h-3.5 mr-1.5 text-brand" />
                        ) : apt.type === "Chat" ? (
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        ) : (
                          <Stethoscope className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                        )}
                        {apt.type === "Video Call"
                          ? t("appointmentManagement.types.videoCall")
                          : apt.type === "Chat"
                            ? t("appointmentManagement.types.chat")
                            : t("appointmentManagement.types.consultation")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          apt.status === "Completed" || apt.status === "In Progress"
                            ? "default"
                            : apt.status === "Waiting" || apt.status === "Scheduled"
                              ? "secondary"
                              : "destructive"
                        }
                        className={`whitespace-nowrap inline-flex items-center ${
                          apt.status === "Completed"
                            ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                            : apt.status === "Waiting" || apt.status === "Scheduled"
                              ? "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                              : ""
                        }`}
                      >
                        {apt.status === "Completed"
                          ? t("appointmentManagement.status.completed")
                          : apt.status === "In Progress"
                            ? t("appointmentManagement.status.inProgress")
                            : apt.status === "Waiting"
                              ? t("appointmentManagement.status.waiting")
                              : apt.status === "Scheduled"
                                ? t("appointmentManagement.status.scheduled")
                                : t("appointmentManagement.status.canceled")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title={t("appointmentManagement.table.viewDetails")}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Database className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">
                        {t("appointmentManagement.table.noAppointments")}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {t("appointmentManagement.table.tryAdjusting")}
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold text-brand bg-brand/10 hover:bg-brand/20 rounded-lg transition-colors cursor-pointer"
                        >
                          {t("appointmentManagement.filters.reset")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {t("appointmentManagement.pagination.summary", {
              page,
              totalPages,
              total: totalCount,
              defaultValue: `Trang ${page} / ${totalPages} (${totalCount} kết quả)`,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t("appointmentManagement.pagination.prev", "Trước")}
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              {t("appointmentManagement.pagination.next", "Sau")}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        appointment={selectedAppointment}
      />
    </div>
  );
}
