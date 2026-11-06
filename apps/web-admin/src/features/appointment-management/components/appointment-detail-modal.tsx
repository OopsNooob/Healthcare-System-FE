import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  X,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  CheckCircle2,
  User,
  Stethoscope,
  ShieldAlert,
  ExternalLink,
  ListOrdered,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";

export interface Appointment {
  id: string;
  time: string;
  patient: string;
  doctor: string;
  type: string;
  mode?: "scheduled" | "on_demand";
  requestStatus?: "requested" | "accepted" | "declined" | "expired" | "cancelled";
  sessionStatus?: "scheduled" | "waiting" | "in_consultation" | "interrupted" | "completed" | "no_show" | "cancelled";
  status: string;
  queuePosition?: number | null;
  calledAt?: string | null;
  noShowReasonCode?: string | null;
  duration?: string;
}

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
  const navigate = useNavigate();

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="text-brand" size={22} />
              {t("appointmentManagement.detailModal.title")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("appointmentManagement.detailModal.desc")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-4 text-sm">
          {/* Privacy Boundary Notice */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
              <b>{t("appointmentManagement.detailModal.privacyTitle", "Bảo mật thông tin y tế:")}</b>{" "}
              {t(
                "appointmentManagement.detailModal.privacyDesc",
                "Triệu chứng lâm sàng, tin nhắn trao đổi và ghi chú chẩn đoán của Bác sĩ được bảo mật tuyệt đối và không hiển thị cho Quản trị viên."
              )}
            </p>
          </div>

          {/* Status & Channel Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {appointment.type === "Video Call" ? (
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Video size={18} />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare size={18} />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {appointment.type} •{" "}
                  <span>
                    {appointment.mode === "on_demand"
                      ? t("appointmentManagement.detailModal.modeOnDemand", "Khám ngay")
                      : t("appointmentManagement.detailModal.modeScheduled", "Đặt lịch trước")}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">{appointment.time}</p>
              </div>
            </div>

            <Badge
              variant="default"
              className={
                appointment.status === "Completed"
                  ? "bg-green-500 text-white"
                  : appointment.status === "In Progress"
                    ? "bg-brand text-slate-900"
                    : appointment.status === "Waiting" || appointment.status === "Scheduled"
                      ? "bg-amber-500 text-white"
                      : "bg-red-500 text-white"
              }
            >
              {appointment.status === "Completed"
                ? t("appointmentManagement.status.completed")
                : appointment.status === "In Progress"
                  ? t("appointmentManagement.status.inProgress")
                  : appointment.status === "Waiting"
                    ? t("appointmentManagement.status.waiting")
                    : appointment.status === "Scheduled"
                      ? t("appointmentManagement.status.scheduled")
                      : t("appointmentManagement.status.canceled")}
            </Badge>
          </div>

          {/* Patient & Doctor Pair */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <User size={12} />
                {t("appointmentManagement.detailModal.patient")}
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {appointment.patient}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t("appointmentManagement.detailModal.sessionId", "Mã phiên:")} {appointment.id}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <Stethoscope size={12} />
                {t("appointmentManagement.detailModal.doctor")}
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {appointment.doctor}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t("appointmentManagement.detailModal.providerType")}
              </p>
            </div>
          </div>

          {/* Operational State & Queue Metadata */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-800/20 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ListOrdered size={14} className="text-brand" />
              {t("appointmentManagement.detailModal.operationalStatus", "Trạng thái vận hành & Hàng đợi")}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
              <div>
                {t("appointmentManagement.detailModal.requestStatus", "Trạng thái yêu cầu:")}{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {appointment.requestStatus === "accepted" || !appointment.requestStatus
                    ? t("appointmentManagement.detailModal.accepted", "Đã chấp nhận")
                    : appointment.requestStatus}
                </span>
              </div>
              <div>
                {t("appointmentManagement.detailModal.sessionStatus", "Trạng thái phiên:")}{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {appointment.sessionStatus === "in_consultation"
                    ? t("appointmentManagement.detailModal.inConsultation", "Đang khám")
                    : appointment.sessionStatus === "waiting"
                      ? t("appointmentManagement.detailModal.waiting", "Đang chờ")
                      : appointment.sessionStatus === "scheduled"
                        ? t("appointmentManagement.detailModal.scheduled", "Đã lên lịch")
                        : appointment.sessionStatus === "no_show"
                          ? t("appointmentManagement.detailModal.noShow", "Vắng mặt")
                          : t("appointmentManagement.detailModal.completed", "Đã hoàn thành")}
                </span>
              </div>
              <div>
                {t("appointmentManagement.detailModal.queuePosition", "Vị trí hàng đợi:")}{" "}
                <span className="font-bold">
                  {appointment.queuePosition ? `#${appointment.queuePosition}` : "—"}
                </span>
              </div>
              <div>
                {t("appointmentManagement.detailModal.calledAt", "Thời điểm gọi:")}{" "}
                <span className="font-bold">
                  {appointment.calledAt || "—"}
                </span>
              </div>
            </div>
            {appointment.noShowReasonCode && (
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold pt-1">
                {t("appointmentManagement.detailModal.noShowReason", "Lý do vắng mặt:")}{" "}
                <span>
                  {appointment.noShowReasonCode === "patient_absent"
                    ? t("appointmentManagement.detailModal.patientAbsent", "Bệnh nhân không có mặt")
                    : appointment.noShowReasonCode}
                </span>
              </p>
            )}
          </div>

          {/* Metrics Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {t("appointmentManagement.detailModal.duration")}:{" "}
              {appointment.duration || "15 mins"}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={13} />
              {t("appointmentManagement.detailModal.clinicalDataRedacted", "Đã ẩn dữ liệu lâm sàng")}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/audit-logs");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <ExternalLink size={14} />
            {t("appointmentManagement.detailModal.viewAuditLogs", "Xem Nhật ký Kiểm toán")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            {t("appointmentManagement.detailModal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
