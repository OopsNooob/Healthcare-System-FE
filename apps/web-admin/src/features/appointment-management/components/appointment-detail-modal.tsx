import { useTranslation } from "react-i18next";
import {
  X,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  CheckCircle2,
  FileText,
  User,
  Stethoscope,
  Activity,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";

export interface Appointment {
  id: string;
  time: string;
  patient: string;
  doctor: string;
  type: string;
  status: string;
  symptoms?: string;
  clinicalNotes?: string;
  duration?: string;
  roomUrl?: string;
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

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="text-brand" size={22} />
              {t("appointmentManagement.detailModal.title", "Appointment Consultation Details")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "appointmentManagement.detailModal.desc",
                "Teleconsultation session logs, triage symptoms, and doctor clinical notes"
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-4 text-sm">
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
                  {appointment.type === "Video Call"
                    ? t("appointmentManagement.types.videoCall", "Video Call")
                    : appointment.type === "Chat"
                    ? t("appointmentManagement.types.chat", "Chat")
                    : appointment.type}
                </p>
                <p className="text-[11px] text-slate-400">{appointment.time}</p>
              </div>
            </div>

            <Badge
              variant={
                appointment.status === "Completed"
                  ? "default"
                  : appointment.status === "In Progress"
                  ? "default"
                  : appointment.status === "Waiting" || appointment.status === "Scheduled"
                  ? "secondary"
                  : "destructive"
              }
              className={
                appointment.status === "Completed"
                  ? "bg-green-500 text-white"
                  : appointment.status === "In Progress"
                  ? "bg-brand text-slate-900"
                  : appointment.status === "Waiting" || appointment.status === "Scheduled"
                  ? "bg-amber-500 text-white"
                  : ""
              }
            >
              {appointment.status === "Completed"
                ? t("appointmentManagement.status.completed", "Completed")
                : appointment.status === "In Progress"
                ? t("appointmentManagement.status.inProgress", "In Progress")
                : appointment.status === "Waiting"
                ? t("appointmentManagement.status.waiting", "Waiting")
                : appointment.status === "Scheduled"
                ? t("appointmentManagement.status.scheduled", "Scheduled")
                : appointment.status === "Canceled"
                ? t("appointmentManagement.status.canceled", "Canceled")
                : appointment.status}
            </Badge>
          </div>

          {/* Patient & Doctor Pair */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <User size={12} />
                {t("appointmentManagement.detailModal.patient", "Patient")}
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {appointment.patient}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">ID: P-{appointment.id}</p>
            </div>

            <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                <Stethoscope size={12} />
                {t("appointmentManagement.detailModal.doctor", "Assigned Doctor")}
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {appointment.doctor}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t("appointmentManagement.detailModal.providerType", "Telemedicine Provider")}
              </p>
            </div>
          </div>

          {/* Symptoms & Triage */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-800/20">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Activity size={14} className="text-amber-500" />
              {t("appointmentManagement.detailModal.symptoms", "Chief Complaint / Symptoms")}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {appointment.symptoms ||
                t(
                  "appointmentManagement.detailModal.defaultSymptoms",
                  "Mild hypertension symptoms with headache and dizziness reported during pre-call intake survey."
                )}
            </p>
          </div>

          {/* Clinical Notes */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-800/20">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-brand" />
              {t("appointmentManagement.detailModal.notes", "Clinical Summary Notes")}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic">
              &quot;
              {appointment.clinicalNotes ||
                t(
                  "appointmentManagement.detailModal.defaultNotes",
                  "Advised patient to maintain low-sodium diet, track systolic/diastolic blood pressure twice daily, and prescribed follow-up teleconsultation."
                )}
              &quot;
            </p>
          </div>

          {/* Metrics Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {t("appointmentManagement.detailModal.duration", "Duration")}: {appointment.duration || "15 mins"}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={13} />
              {t("appointmentManagement.detailModal.encryptedWebRTC", "End-to-End Encrypted WebRTC")}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            {t("appointmentManagement.detailModal.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
