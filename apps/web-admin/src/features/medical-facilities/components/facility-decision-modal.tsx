import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import type { MedicalFacilityItem } from "./facility-form-modal";

interface FacilityDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: MedicalFacilityItem | null;
  mode: "verify" | "reject";
  onConfirm: (facilityId: number, rejectionReason?: string, notes?: string) => void;
}

export function FacilityDecisionModal({
  isOpen,
  onClose,
  facility,
  mode,
  onConfirm,
}: FacilityDecisionModalProps) {
  const { t } = useTranslation();

  const [rejectionReason, setRejectionReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  if (!isOpen || !facility) return null;

  const isReject = mode === "reject";

  const handleConfirm = () => {
    if (isReject && !rejectionReason.trim()) {
      toast.warning(
        t(
          "medicalFacilities.toasts.reasonRequired",
          "Please provide a rejection reason"
        )
      );
      return;
    }

    onConfirm(
      facility.id,
      isReject ? rejectionReason.trim() : undefined,
      internalNotes.trim() || undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {isReject ? (
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <XCircle size={22} />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={22} />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isReject
                  ? t("medicalFacilities.decisionModal.rejectTitle", "Reject Medical Facility")
                  : t("medicalFacilities.decisionModal.approveTitle", "Verify Medical Facility")}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isReject
              ? t(
                  "medicalFacilities.decisionModal.rejectDesc",
                  "Reject this facility submission. A rejection reason is required for notification."
                )
              : t(
                  "medicalFacilities.decisionModal.approveDesc",
                  "Approve this facility to display publicly on the patient exploration map."
                )}
          </p>

          {/* Facility snapshot */}
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 text-xs space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {facility.name}
            </div>
            <div className="text-slate-500 truncate">{facility.address}</div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              {t("medicalFacilities.decisionModal.submittedBy", "Submitted By")}: {facility.submittedBy} • {facility.submittedDate}
            </div>
          </div>

          {/* Mandatory Rejection Reason */}
          {isReject && (
            <div>
              <label className="block text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1">
                <AlertTriangle size={13} />
                {t("medicalFacilities.decisionModal.reasonLabel", "Rejection Reason")} *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t(
                  "medicalFacilities.decisionModal.reasonPlaceholder",
                  "Specify reason (e.g., Invalid business license, unverifiable address)..."
                )}
                className="w-full rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.decisionModal.notes", "Internal Admin Notes")}
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder={t(
                "medicalFacilities.decisionModal.notesPlaceholder",
                "Optional administrative audit notes..."
              )}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            {t("medicalFacilities.decisionModal.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl font-bold text-xs shadow-sm transition-colors ${
              isReject
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-brand text-slate-900 hover:bg-brand/90"
            }`}
          >
            {isReject
              ? t("medicalFacilities.decisionModal.confirmReject", "Confirm Rejection")
              : t("medicalFacilities.decisionModal.confirmApprove", "Confirm Verification")}
          </button>
        </div>
      </div>
    </div>
  );
}
