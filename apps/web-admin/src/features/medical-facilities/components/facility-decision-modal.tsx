import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { FeTypes } from "@/lib/api";
import { getDisplayFacilityDetails } from "../services/medical-facilities.service";

export type DecisionTarget =
  | {
      kind: "facility";
      mode: "verify" | "retire";
      record: FeTypes.FacilityDirectoryAdminRecord;
    }
  | {
      kind: "specialty";
      mode: "retire";
      record: FeTypes.FacilityDirectoryAdminSpecialty;
    }
  | {
      kind: "mapping";
      mode: "retire";
      record: FeTypes.FacilityDirectoryMapping;
    };

interface FacilityDecisionModalProps {
  isOpen: boolean;
  target: DecisionTarget | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmVerify: (
    facility: FeTypes.FacilityDirectoryAdminRecord,
    providerReviewed: boolean,
  ) => Promise<void>;
  onConfirmRetire: (reason: string) => Promise<void>;
}

export function FacilityDecisionModal({
  isOpen,
  target,
  isSubmitting = false,
  onClose,
  onConfirmVerify,
  onConfirmRetire,
}: FacilityDecisionModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [providerReviewed, setProviderReviewed] = useState(false);

  if (!isOpen || !target) return null;

  const isVerify = target.kind === "facility" && target.mode === "verify";
  const hasGooglePlace =
    target.kind === "facility" && Boolean(target.record.googlePlaceId);
  const facilityDetails =
    target.kind === "facility" ? getDisplayFacilityDetails(target.record) : undefined;

  const trimmedReason = reason.trim();
  const canConfirm = isVerify
    ? !isSubmitting && (!hasGooglePlace || providerReviewed)
    : !isSubmitting && trimmedReason.length >= 2 && trimmedReason.length <= 300;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    if (isVerify) {
      if (hasGooglePlace && !providerReviewed) {
        showToast.warning(
          t("medicalFacilities.decisionModal.providerCheckRequired"),
        );
        return;
      }
      await onConfirmVerify(target.record, providerReviewed);
      return;
    }

    if (trimmedReason.length < 2 || trimmedReason.length > 300) {
      showToast.warning(t("medicalFacilities.decisionModal.reasonLengthError"));
      return;
    }
    await onConfirmRetire(trimmedReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {isVerify ? (
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={22} />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <Archive size={22} />
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isVerify
                ? t("medicalFacilities.decisionModal.verifyTitle")
                : target.kind === "facility"
                  ? t("medicalFacilities.decisionModal.retireFacilityTitle")
                  : target.kind === "specialty"
                    ? t("medicalFacilities.decisionModal.retireSpecialtyTitle")
                    : t("medicalFacilities.decisionModal.retireMappingTitle")}
            </h3>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isVerify
              ? t("medicalFacilities.decisionModal.verifyDesc")
              : t("medicalFacilities.decisionModal.retireDesc")}
          </p>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 text-xs space-y-1">
            {target.kind === "facility" ? (
              <>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {facilityDetails?.name || t("medicalFacilities.unnamedFacility")}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  rev {target.record.revision} • {target.record.status}
                  {target.record.googlePlaceId
                    ? ` • Place ID: ${target.record.googlePlaceId}`
                    : ""}
                </div>
              </>
            ) : target.kind === "specialty" ? (
              <>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {target.record.nameVi}
                </div>
                <div className="font-mono text-slate-500 dark:text-slate-400">
                  {target.record.code} • rev {target.record.revision}
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {target.record.scope}: {target.record.scopeKey}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  v{target.record.version} • rev {target.record.revision}
                </div>
              </>
            )}
          </div>

          {isVerify && hasGooglePlace && (
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={providerReviewed}
                onChange={(e) => setProviderReviewed(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-brand focus:ring-brand"
              />
              <span>
                {t("medicalFacilities.decisionModal.providerOfficialCheckLabel")}
              </span>
            </label>
          )}

          {!isVerify && (
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">
                <ShieldAlert size={13} />
                {t("medicalFacilities.decisionModal.retireReasonLabel")} *
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                maxLength={300}
                placeholder={t(
                  "medicalFacilities.decisionModal.retireReasonPlaceholder",
                )}
                className="w-full rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
            className={`px-5 py-2 rounded-xl font-bold text-xs shadow-sm disabled:opacity-50 ${
              isVerify
                ? "bg-brand text-slate-900 hover:bg-brand/90"
                : "bg-rose-600 text-white hover:bg-rose-700"
            }`}
          >
            {isSubmitting
              ? t("medicalFacilities.saving")
              : isVerify
                ? t("medicalFacilities.decisionModal.confirmVerify")
                : t("medicalFacilities.decisionModal.confirmRetire")}
          </button>
        </div>
      </div>
    </div>
  );
}
