import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Link2,
  MapPin,
  X,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { FeTypes } from "@/lib/api";

interface DuplicateReviewModalProps {
  isOpen: boolean;
  candidates: FeTypes.FacilityDirectoryDuplicateCandidate[];
  truncated: boolean;
  candidatePlaceId?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onOpenCandidate: (candidateId: string) => void;
  onLinkPlaceIdToCandidate?: (
    candidate: FeTypes.FacilityDirectoryDuplicateCandidate,
  ) => Promise<void>;
  onConfirmDistinct: (
    review: FeTypes.FacilityDirectoryDuplicateReviewRequest,
  ) => Promise<void>;
}

function formatCandidateAddress(
  address?: FeTypes.FacilityDirectoryAddress,
): string {
  if (!address) return "--";
  return [address.street, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ");
}

export function DuplicateReviewModal({
  isOpen,
  candidates,
  truncated,
  candidatePlaceId,
  isSubmitting = false,
  onClose,
  onOpenCandidate,
  onLinkPlaceIdToCandidate,
  onConfirmDistinct,
}: DuplicateReviewModalProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    candidates.map((c) => c.id),
  );
  const [reason, setReason] = useState("");
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isBusy = isSubmitting || busyActionId !== null;
  const trimmedReason = reason.trim();
  const canConfirm =
    !truncated &&
    !isBusy &&
    confirmedDistinct &&
    selectedIds.length > 0 &&
    trimmedReason.length >= 10 &&
    trimmedReason.length <= 300;

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    if (truncated) {
      showToast.warning(t("medicalFacilities.duplicateModal.truncatedNotice"));
      return;
    }
    if (selectedIds.length === 0) {
      showToast.warning(t("medicalFacilities.duplicateModal.selectCandidateRequired"));
      return;
    }
    if (trimmedReason.length < 10 || trimmedReason.length > 300) {
      showToast.warning(t("medicalFacilities.duplicateModal.reasonLengthError"));
      return;
    }
    if (!confirmedDistinct) {
      showToast.warning(t("medicalFacilities.duplicateModal.confirmCheckRequired"));
      return;
    }
    await onConfirmDistinct({
      confirmedDistinct: true,
      reason: trimmedReason,
      reviewedFacilityIds: selectedIds,
    });
  };

  const handleLinkPlace = async (
    candidate: FeTypes.FacilityDirectoryDuplicateCandidate,
  ) => {
    if (!onLinkPlaceIdToCandidate || isBusy) return;
    setBusyActionId(candidate.id);
    try {
      await onLinkPlaceIdToCandidate(candidate);
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("medicalFacilities.duplicateModal.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("medicalFacilities.duplicateModal.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          {truncated && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  {t("medicalFacilities.duplicateModal.truncatedTitle")}
                </div>
                <p className="mt-1">
                  {t("medicalFacilities.duplicateModal.truncatedNotice")}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {candidates.map((candidate) => {
              const checked = selectedIds.includes(candidate.id);
              const canLinkPlace =
                Boolean(candidatePlaceId) &&
                Boolean(onLinkPlaceIdToCandidate) &&
                !candidate.googlePlaceId &&
                candidate.status !== "retired";
              return (
                <div
                  key={candidate.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                      {!truncated && (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleId(candidate.id)}
                          disabled={isBusy}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {candidate.name || t("medicalFacilities.unnamedFacility")}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[11px] uppercase border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                          >
                            {t(`medicalFacilities.status.${candidate.status}`)}
                          </Badge>
                          <span className="font-mono text-[11px] text-slate-400">
                            rev {candidate.revision}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300 mt-1">
                          <MapPin size={13} className="shrink-0 mt-0.5 text-slate-400" />
                          <span>{formatCandidateAddress(candidate.address)}</span>
                        </div>
                        {typeof candidate.distanceMeters === "number" && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {t("medicalFacilities.duplicateModal.distanceLabel", {
                              meters: candidate.distanceMeters,
                            })}
                          </div>
                        )}
                      </div>
                    </label>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onOpenCandidate(candidate.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        <ExternalLink size={12} />
                        {t("medicalFacilities.duplicateModal.openFacility")}
                      </button>
                      {canLinkPlace && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleLinkPlace(candidate)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <Link2 size={12} />
                          {busyActionId === candidate.id
                            ? t("medicalFacilities.saving")
                            : t("medicalFacilities.duplicateModal.linkPlaceToThis")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                    {candidate.reasonCodes.map((reasonCode) => (
                      <Badge
                        key={reasonCode}
                        variant="secondary"
                        className="text-[11px] bg-amber-100/80 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-none"
                      >
                        {t(`medicalFacilities.duplicateReasons.${reasonCode}`)}
                      </Badge>
                    ))}
                    {candidate.googlePlaceId && (
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Place ID: {candidate.googlePlaceId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!truncated && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("medicalFacilities.duplicateModal.reasonLabel")} *
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isBusy}
                  maxLength={300}
                  placeholder={t(
                    "medicalFacilities.duplicateModal.reasonPlaceholder",
                  )}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand resize-none"
                />
                <div className="text-[11px] text-slate-400 text-right mt-0.5">
                  {trimmedReason.length}/300
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedDistinct}
                  onChange={(e) => setConfirmedDistinct(e.target.checked)}
                  disabled={isBusy}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span>{t("medicalFacilities.duplicateModal.confirmCheckbox")}</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          {!truncated && (
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => void handleConfirm()}
              className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold text-xs shadow-sm hover:bg-brand/90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {isSubmitting
                ? t("medicalFacilities.saving")
                : t("medicalFacilities.duplicateModal.confirmButton")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

