import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Video,
  XCircle,
  Search,
  Filter,
  Database,
  Eye,
  X,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { AppointmentDetailModal } from "../components/appointment-detail-modal";
import type { Appointment } from "../components/appointment-detail-modal";

export function AppointmentManagement() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setAppointments([
        {
          id: "APT-101",
          time: "09:00 AM",
          patient: "Vu Quoc Huy",
          doctor: "Dr. Sarah Connor",
          type: "Video Call",
          mode: "scheduled",
          requestStatus: "accepted",
          sessionStatus: "completed",
          status: "Completed",
          queuePosition: null,
          calledAt: "08:59 AM",
          duration: "18 mins",
        },
        {
          id: "APT-102",
          time: "In Session",
          patient: "Do Dinh Khang",
          doctor: "Dr. John Doe",
          type: "Video Call",
          mode: "scheduled",
          requestStatus: "accepted",
          sessionStatus: "in_consultation",
          status: "In Progress",
          queuePosition: null,
          calledAt: "10:02 AM",
          duration: "Active (12m)",
        },
        {
          id: "APT-103",
          time: "Queue #1",
          patient: "Nguyen Van A",
          doctor: "Dr. John Doe",
          type: "Chat",
          mode: "on_demand",
          requestStatus: "accepted",
          sessionStatus: "waiting",
          status: "Waiting",
          queuePosition: 1,
          calledAt: "10:14 AM",
          duration: "Queued (4m)",
        },
        {
          id: "APT-104",
          time: "11:30 AM",
          patient: "Tran Thi B",
          doctor: "Dr. Sarah Connor",
          type: "Video Call",
          mode: "scheduled",
          requestStatus: "accepted",
          sessionStatus: "scheduled",
          status: "Scheduled",
          queuePosition: null,
          calledAt: null,
          duration: "Estimated 15 mins",
        },
        {
          id: "APT-105",
          time: "10:00 AM",
          patient: "Le Van C",
          doctor: "Dr. Emily Chen",
          type: "Chat",
          mode: "scheduled",
          requestStatus: "accepted",
          sessionStatus: "no_show",
          status: "Canceled",
          noShowReasonCode: "patient_absent",
          duration: "0 mins",
        },
      ]);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const doctorOptions = useMemo(() => {
    return Array.from(new Set(appointments.map((a) => a.doctor))).filter(Boolean);
  }, [appointments]);

  const activeFiltersCount =
    (selectedStatus !== "all" ? 1 : 0) +
    (selectedType !== "all" ? 1 : 0) +
    (selectedDoctor !== "all" ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedDoctor("all");
  };

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return appointments.filter((apt) => {
      const matchesSearch =
        query === "" ||
        apt.patient.toLowerCase().includes(query) ||
        apt.doctor.toLowerCase().includes(query) ||
        apt.id.toLowerCase().includes(query);

      const matchesStatus =
        selectedStatus === "all" ||
        apt.status.toLowerCase() === selectedStatus.toLowerCase() ||
        apt.sessionStatus?.toLowerCase() === selectedStatus.toLowerCase();

      const matchesType =
        selectedType === "all" ||
        apt.type.toLowerCase() === selectedType.toLowerCase();

      const matchesDoctor =
        selectedDoctor === "all" ||
        apt.doctor === selectedDoctor;

      return matchesSearch && matchesStatus && matchesType && matchesDoctor;
    });
  }, [appointments, searchQuery, selectedStatus, selectedType, selectedDoctor]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("appointmentManagement.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("appointmentManagement.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("appointmentManagement.stats.totalToday")}
            </p>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">42</h3>
          <p className="text-xs text-green-500 font-medium mt-2">{t("appointmentManagement.stats.subtitles.increaseFromYesterday", "+12% from yesterday")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("appointmentManagement.stats.completed")}
            </p>
            <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">28</h3>
          <p className="text-xs text-gray-400 font-medium mt-2">{t("appointmentManagement.stats.subtitles.completionRate", "66% Completion Rate")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("appointmentManagement.stats.canceled")}
            </p>
            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">3</h3>
          <p className="text-xs text-gray-400 font-medium mt-2">{t("appointmentManagement.stats.subtitles.cancelRate", "7% Cancelation Rate")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("appointmentManagement.stats.avgWaitTime")}
            </p>
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">8.5 min</h3>
          <p className="text-xs text-red-500 font-medium mt-2">{t("appointmentManagement.stats.subtitles.thanAverage", "+1.5m than average")}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("appointmentManagement.queue.title")}
          </h2>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("appointmentManagement.queue.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-full sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeFiltersCount > 0 || isFilterOpen
                  ? "border-brand bg-brand/10 text-slate-900 dark:text-brand font-semibold"
                  : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t("appointmentManagement.queue.filter")}
              {activeFiltersCount > 0 && (
                <span className="ml-1.5 w-5 h-5 rounded-full bg-brand text-slate-900 text-xs font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Filter Bar */}
        {isFilterOpen && (
          <div className="border-b border-gray-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 px-6 py-4 space-y-3.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand" />
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {t("appointmentManagement.filters.title", "Bộ lọc nâng cao")}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand text-xs font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                  >
                    {t("appointmentManagement.filters.reset", "Đặt lại")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                  title={t("common.close", "Đóng")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Trạng thái (Status) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("appointmentManagement.filters.status", "Trạng thái")}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("appointmentManagement.filters.allStatuses", "Tất cả trạng thái")}</option>
                  <option value="In Progress">{t("appointmentManagement.status.inProgress", "Đang khám")}</option>
                  <option value="Waiting">{t("appointmentManagement.status.waiting", "Đang chờ")}</option>
                  <option value="Scheduled">{t("appointmentManagement.status.scheduled", "Đã lên lịch")}</option>
                  <option value="Completed">{t("appointmentManagement.status.completed", "Hoàn thành")}</option>
                  <option value="Canceled">{t("appointmentManagement.status.canceled", "Đã huỷ")}</option>
                </select>
              </div>

              {/* Hình thức (Type) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("appointmentManagement.filters.type", "Hình thức")}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("appointmentManagement.filters.allTypes", "Tất cả hình thức")}</option>
                  <option value="Video Call">{t("appointmentManagement.types.videoCall", "Cuộc gọi Video")}</option>
                  <option value="Chat">{t("appointmentManagement.types.chat", "Nhắn tin Chat")}</option>
                </select>
              </div>

              {/* Bác sĩ (Doctor) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("appointmentManagement.filters.doctor", "Bác sĩ phụ trách")}
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="all">{t("appointmentManagement.filters.allDoctors", "Tất cả bác sĩ")}</option>
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

        {/* Filter tags row */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {t("appointmentManagement.filters.filteringBy", "Đang lọc theo")}:
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
                  : selectedStatus === "Canceled"
                  ? t("appointmentManagement.status.canceled")
                  : selectedStatus}
                <button
                  type="button"
                  onClick={() => setSelectedStatus("all")}
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
                  : selectedType}
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
              {t("appointmentManagement.filters.clearAll", "Xoá tất cả lọc")}
            </button>
          </div>
        )}

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <th className="px-6 py-3 font-medium whitespace-nowrap">{t("appointmentManagement.table.timePos")}</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">{t("appointmentManagement.table.patient")}</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">{t("appointmentManagement.table.doctor")}</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">{t("appointmentManagement.table.type")}</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">{t("appointmentManagement.table.status")}</th>
                <th className="px-6 py-3 font-medium text-right whitespace-nowrap">{t("appointmentManagement.table.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-6 w-8 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{apt.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{apt.patient}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-600 dark:text-gray-300">{apt.doctor}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {apt.type === "Video Call" ? <Video className="w-3 h-3 mr-1 text-gray-400" /> : null}
                        {apt.type === "Video Call"
                          ? t("appointmentManagement.types.videoCall", "Video Call")
                          : apt.type === "Chat"
                          ? t("appointmentManagement.types.chat", "Chat")
                          : apt.type === "Routine Checkup"
                          ? t("appointmentManagement.types.routineCheckup", "Routine Checkup")
                          : apt.type === "Direct Consultation"
                          ? t("appointmentManagement.types.consultation", "Direct Consultation")
                          : apt.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          apt.status === "Completed"
                            ? "default"
                            : apt.status === "In Progress"
                            ? "default"
                            : apt.status === "Waiting" || apt.status === "Scheduled"
                            ? "secondary"
                            : "destructive"
                        }
                        className={`whitespace-nowrap inline-flex items-center ${
                          apt.status === "Completed"
                            ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
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
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="View Details"
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
                          {t("appointmentManagement.filters.reset", "Đặt lại bộ lọc")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
