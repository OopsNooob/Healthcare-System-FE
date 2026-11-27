import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Stethoscope, X } from "lucide-react";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { FeTypes } from "@/lib/api";

interface SpecialtyFormModalProps {
  isOpen: boolean;
  specialty: FeTypes.FacilityDirectoryAdminSpecialty | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (payload: {
    mode: "create" | "update";
    code: string;
    nameVi: string;
    synonyms: string[];
    expectedRevision?: number;
  }) => Promise<void>;
}

export function SpecialtyFormModal({
  isOpen,
  specialty,
  isSubmitting = false,
  onClose,
  onSave,
}: SpecialtyFormModalProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(specialty);

  const [code, setCode] = useState(specialty?.code ?? "");
  const [nameVi, setNameVi] = useState(specialty?.nameVi ?? "");
  const [synonymsInput, setSynonymsInput] = useState(
    specialty?.synonyms?.join(", ") ?? "",
  );

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const normalizedCode = code.trim().toLowerCase();
    const trimmedName = nameVi.trim();

    if (!isEdit && !/^[a-z0-9][a-z0-9._-]{1,59}$/.test(normalizedCode)) {
      showToast.warning(t("medicalFacilities.specialtyModal.codeInvalid"));
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 120) {
      showToast.warning(t("medicalFacilities.specialtyModal.nameInvalid"));
      return;
    }

    const synonyms = Array.from(
      new Set(
        synonymsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    if (synonyms.length > 30 || synonyms.some((s) => s.length > 100)) {
      showToast.warning(t("medicalFacilities.specialtyModal.synonymsInvalid"));
      return;
    }

    await onSave({
      mode: isEdit ? "update" : "create",
      code: isEdit ? specialty!.code : normalizedCode,
      nameVi: trimmedName,
      synonyms,
      expectedRevision: specialty?.revision,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="text-brand" size={22} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEdit
                ? t("medicalFacilities.specialtyModal.editTitle")
                : t("medicalFacilities.specialtyModal.createTitle")}
            </h3>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.specialtyModal.codeLabel")} *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEdit || isSubmitting}
              placeholder="cardiology"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.specialtyModal.nameViLabel")} *
            </label>
            <input
              type="text"
              value={nameVi}
              onChange={(e) => setNameVi(e.target.value)}
              disabled={isSubmitting}
              placeholder={t("medicalFacilities.specialtyModal.namePlaceholder")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.specialtyModal.synonymsLabel")}
            </label>
            <input
              type="text"
              value={synonymsInput}
              onChange={(e) => setSynonymsInput(e.target.value)}
              disabled={isSubmitting}
              placeholder={t("medicalFacilities.specialtyModal.synonymsPlaceholder")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
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
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold text-xs shadow-sm hover:bg-brand/90 disabled:opacity-50"
          >
            {isSubmitting ? t("medicalFacilities.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

