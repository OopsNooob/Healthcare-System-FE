import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch, X } from "lucide-react";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { FeTypes } from "@/lib/api";
import type { CareProgramOption } from "../services/medical-facilities.service";

interface MappingFormModalProps {
  isOpen: boolean;
  mapping: FeTypes.FacilityDirectoryMapping | null;
  specialties: FeTypes.FacilityDirectoryAdminSpecialty[];
  carePrograms: CareProgramOption[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (payload: {
    mode: "create" | "update";
    id?: string;
    scope: FeTypes.DirectoryMappingScope;
    scopeKey: string;
    specialtyCodes: string[];
    sourceReferences: string[];
    expectedRevision?: number;
  }) => Promise<void>;
}

export function MappingFormModal({
  isOpen,
  mapping,
  specialties,
  carePrograms,
  isSubmitting = false,
  onClose,
  onSave,
}: MappingFormModalProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(mapping);

  const [scope, setScope] = useState<FeTypes.DirectoryMappingScope>(
    mapping?.scope ?? "program",
  );
  const [scopeKey, setScopeKey] = useState(mapping?.scopeKey ?? "");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    mapping?.specialtyCodes ?? [],
  );
  const [sourcesText, setSourcesText] = useState(
    mapping?.sourceReferences?.join("\n") ?? "",
  );

  if (!isOpen) return null;

  const activeSpecialties = specialties.filter((s) => s.status === "active");
  const activeCodeSet = new Set(activeSpecialties.map((s) => s.code));
  const extraCodes = selectedSpecialties.filter(
    (code) => !activeCodeSet.has(code),
  );

  const suggestedKeys = Array.from(
    new Set(
      carePrograms
        .map((p) => (scope === "program" ? p.programCode : p.diseaseKey))
        .filter(Boolean),
    ),
  );

  const toggleSpecialty = (code: string) => {
    if (isSubmitting) return;
    setSelectedSpecialties((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const normalizedKey = scopeKey.trim().toLowerCase();

    if (!isEdit && !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(normalizedKey)) {
      showToast.warning(t("medicalFacilities.diseaseSpecialty.keyInvalid"));
      return;
    }
    if (selectedSpecialties.length === 0 || selectedSpecialties.length > 20) {
      showToast.warning(
        t("medicalFacilities.diseaseSpecialty.specialtiesRequired"),
      );
      return;
    }

    const sources = Array.from(
      new Set(
        sourcesText
          .split(/\r?\n|,/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    if (sources.length === 0 || sources.length > 10) {
      showToast.warning(t("medicalFacilities.diseaseSpecialty.sourcesRequired"));
      return;
    }
    if (sources.some((s) => !/^https:\/\//i.test(s) || s.length > 1000)) {
      showToast.warning(t("medicalFacilities.diseaseSpecialty.sourcesHttpsError"));
      return;
    }

    await onSave({
      mode: isEdit ? "update" : "create",
      id: mapping?.id,
      scope: isEdit ? mapping!.scope : scope,
      scopeKey: isEdit ? mapping!.scopeKey : normalizedKey,
      specialtyCodes: selectedSpecialties,
      sourceReferences: sources,
      expectedRevision: mapping?.revision,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GitBranch className="text-brand" size={20} />
            {isEdit
              ? t("medicalFacilities.diseaseSpecialty.editTitle")
              : t("medicalFacilities.diseaseSpecialty.addTitle")}
          </h3>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.diseaseSpecialty.scopeLabel")} *
              </label>
              <select
                value={scope}
                onChange={(e) =>
                  setScope(e.target.value as FeTypes.DirectoryMappingScope)
                }
                disabled={isEdit || isSubmitting}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              >
                <option value="program">
                  {t("medicalFacilities.diseaseSpecialty.scopeProgram")}
                </option>
                <option value="disease">
                  {t("medicalFacilities.diseaseSpecialty.scopeDisease")}
                </option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.diseaseSpecialty.scopeKeyLabel")} *
              </label>
              <input
                list="mapping-scope-suggestions"
                type="text"
                value={scopeKey}
                onChange={(e) => setScopeKey(e.target.value)}
                disabled={isEdit || isSubmitting}
                placeholder={
                  scope === "program"
                    ? "hypertension-care"
                    : "hypertension"
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              />
              <datalist id="mapping-scope-suggestions">
                {suggestedKeys.map((key) => (
                  <option key={key} value={key} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("medicalFacilities.diseaseSpecialty.fieldSpecialties")} *
            </label>
            <div className="flex flex-wrap gap-2">
              {activeSpecialties.map((sp) => {
                const selected = selectedSpecialties.includes(sp.code);
                return (
                  <button
                    key={sp.code}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => toggleSpecialty(sp.code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      selected
                        ? "bg-brand text-slate-900 border-brand"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {sp.nameVi} ({sp.code})
                  </button>
                );
              })}
              {extraCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => toggleSpecialty(code)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.diseaseSpecialty.sourcesLabel")} *
            </label>
            <textarea
              rows={3}
              value={sourcesText}
              onChange={(e) => setSourcesText(e.target.value)}
              disabled={isSubmitting}
              placeholder="https://kcb.vn/phac-do-tang-huyet-ap"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {t("medicalFacilities.diseaseSpecialty.sourcesHint")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 text-xs font-bold hover:bg-brand/90 disabled:opacity-50"
          >
            {isSubmitting
              ? t("medicalFacilities.saving")
              : t("medicalFacilities.diseaseSpecialty.saveMapping")}
          </button>
        </div>
      </div>
    </div>
  );
}

