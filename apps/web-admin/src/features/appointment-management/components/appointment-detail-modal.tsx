import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Calendar,
  User,
  Stethoscope,
  Video,
  MessageSquare,
  ShieldCheck,
  Clock,
  Star,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  appointmentManagementService,
  type Appointment,
  type AppointmentReview,
} from "../services/appointment-management.service";

export type { Appointment };

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
}: AppointmentDetailModalProps) {
  const { t } = useTranslation();
  const locale = t("common.dateLocale", "vi-VN");

  const [fetchedDetail, setFetchedDetail] = useState<Appointment | null>(null);
  const [fetchedReview, setFetchedReview] = useState<{
    appointmentId: string;
    value: AppointmentReview | null;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const detail =
    fetchedDetail?.id === appointment?.id ? fetchedDetail : appointment;
  const review =
    fetchedReview && fetchedReview.appointmentId === appointment?.id
      ? fetchedReview.value
      : null;

  useEffect(() => {
    if (!isOpen || !appointment?.id) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoadingDetail(true);

      Promise.all([
        appointmentManagementService
          .getAppointmentDetail(appointment.id, locale)
          .catch(() => appointment),
        appointmentManagementService
          .getConsultationReview(appointment.id)
          .catch(() => null),
      ])
        .then(([loadedDetail, loadedReview]) => {
          if (cancelled) return;
          setFetchedDetail(loadedDetail);
          setFetchedReview({
            appointmentId: appointment.id,
            value: loadedReview,
          });
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingDetail(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appointment, isOpen, locale]);

  if (!isOpen || !detail) return null;

  const isVideo = detail.type === "Video Call";
  const isChat = detail.type === "Chat";

  const statusBadgeClass =
    detail.status === "Completed"
      ? "bg-green-500 text-white"
      : detail.status === "In Progress"
        ? "bg-brand text-slate-900"
        : detail.status === "Waiting" || detail.status === "Scheduled"
          ? "bg-amber-500 text-white"
          : "bg-red-500 text-white";

  const reasonText =
    detail.cancellationReason ||
    detail.declinedReason ||
    detail.noShowReason ||
    detail.interruptionReason ||
    detail.callEndReason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              {t("appointmentManagement.detailModal.title")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("appointmentManagement.detailModal.desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("appointmentManagement.detailModal.close")}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Session banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand shrink-0">
                {isVideo ? (
                  <Video className="w-5 h-5" />
                ) : isChat ? (
                  <MessageSquare className="w-5 h-5" />
                ) : (
                  <Stethoscope className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-1.5">
                  <span>
                    {detail.mode === "on_demand"
                      ? t("appointmentManagement.detailModal.modeOnDemand", "Khám ngay")
                      : t("appointmentManagement.detailModal.modeScheduled", "Đặt lịch trước")}
                  </span>
                  {detail.quotaPolicy && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {detail.quotaPolicy === "care_program_included"
                        ? t("appointmentManagement.detailModal.careProgramIncluded", "Gói chăm sóc")
                        : t("appointmentManagement.detailModal.consultationLimit", "Lượt tư vấn")}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {detail.time}
                </p>
              </div>
            </div>

            <Badge variant="default" className={statusBadgeClass}>
              {detail.status === "Completed"
                ? t("appointmentManagement.status.completed")
                : detail.status === "In Progress"
                  ? t("appointmentManagement.status.inProgress")
                  : detail.status === "Waiting"
                    ? t("appointmentManagement.status.waiting")
                    : detail.status === "Scheduled"
                      ? t("appointmentManagement.status.scheduled")
                      : t("appointmentManagement.status.canceled")}
            </Badge>
          </div>

          {/* Patient & Doctor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <User size={12} />
                {t("appointmentManagement.detailModal.patient")}
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {detail.patient}
              </p>
              {detail.patientEmail && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {detail.patientEmail}
                </p>
              )}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono truncate">
                {t("appointmentManagement.detailModal.sessionId", "Mã phiên:")} {detail.id}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <Stethoscope size={12} />
                {t("appointmentManagement.detailModal.doctor")}
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {detail.doctor}
              </p>
              {detail.doctorSpecialty ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {detail.doctorSpecialty}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("appointmentManagement.detailModal.providerType")}
                </p>
              )}
            </div>
          </div>

          {loadingDetail ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Telemetry / Call room metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">
                    {t("appointmentManagement.detailModal.duration")}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-brand" />
                    {detail.duration ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">
                    {t("appointmentManagement.detailModal.waitTime", "Thời gian chờ")}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {typeof detail.estimatedWaitMinutes === "number"
                      ? `${detail.estimatedWaitMinutes} ${t("appointmentManagement.stats.minutesUnit", "phút")}`
                      : "—"}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500 dark:text-slate-400 block">
                    {t("appointmentManagement.detailModal.roomCode", "Phòng khám")}
                  </span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {detail.roomId ?? "—"}
                  </span>
                </div>
              </div>

              {/* Reason if canceled / declined / interrupted */}
              {reasonText && (
                <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      {t("appointmentManagement.detailModal.statusReason", "Lý do / Ghi nhận trạng thái")}
                    </p>
                    <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                      {reasonText}
                    </p>
                  </div>
                </div>
              )}

              {/* Clinical notes when present, otherwise privacy notice */}
              {detail.patientNotes || detail.doctorNotes ? (
                <div className="space-y-3">
                  {detail.patientNotes && (
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5 text-brand" />
                        {t("appointmentManagement.detailModal.symptoms")}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {detail.patientNotes}
                      </p>
                    </div>
                  )}
                  {detail.doctorNotes && (
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                        <Stethoscope className="w-3.5 h-3.5 text-brand" />
                        {t("appointmentManagement.detailModal.notes")}
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {detail.doctorNotes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {t("appointmentManagement.detailModal.privacyTitle")}
                    </span>{" "}
                    {t("appointmentManagement.detailModal.privacyDesc")}
                  </div>
                </div>
              )}

              {/* Consultation Review */}
              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    {t("appointmentManagement.detailModal.reviewTitle", "Đánh giá của bệnh nhân")}
                  </span>
                  {review && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {review.rating}/5
                      {review.flagged && (
                        <Badge variant="destructive" className="ml-1.5 text-[10px]">
                          {t("appointmentManagement.detailModal.flaggedReview", "Đã gắn cờ")}
                        </Badge>
                      )}
                    </span>
                  )}
                </div>
                {review ? (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {review.comment || t("appointmentManagement.detailModal.noReviewComment", "Không có nhận xét kèm theo.")}
                    </p>
                    {review.adminNotes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t("appointmentManagement.detailModal.adminNotes", "Ghi chú kiểm duyệt")}: {review.adminNotes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t("appointmentManagement.detailModal.noReview", "Chưa có đánh giá nào cho phiên tư vấn này.")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-brand text-white dark:text-slate-950 font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t("appointmentManagement.detailModal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
