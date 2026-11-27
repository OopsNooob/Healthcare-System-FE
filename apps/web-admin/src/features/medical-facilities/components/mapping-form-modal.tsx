import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, ChevronDown, GitBranch, Search, X } from "lucide-react";
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

interface ScopeOption {
  value: string;
  label: string;
  sublabel: string;
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
  const [scopeSearch, setScopeSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    mapping?.specialtyCodes ?? [],
  );
  const [sourcesText, setSourcesText] = useState(
    mapping?.sourceReferences?.join("\n") ?? "",
  );
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const scopeOptions = useMemo<ScopeOption[]>(() => {
    if (scope === "program") {
      const seen = new Map<string, ScopeOption>();
      for (const p of carePrograms) {
        const code = p.programCode.trim();
        const normalized = code.toLowerCase();
        if (!normalized || seen.has(normalized)) continue;
        const diseaseLabel = p.diseaseKey
          ? t(`careProgram.diseases.${p.diseaseKey}`, p.diseaseKey)
          : "";
        seen.set(normalized, {
          value: code,
          label: p.name || code,
          sublabel: diseaseLabel ? `${code} · ${diseaseLabel}` : code,
        });
      }
      return Array.from(seen.values());
    }

    const seen = new Map<string, ScopeOption>();
    for (const p of carePrograms) {
      const dk = p.diseaseKey.trim().toLowerCase();
      if (!dk || seen.has(dk)) continue;
      seen.set(dk, {
        value: dk,
        label: t(`careProgram.diseases.${dk}`, dk),
        sublabel: dk,
      });
    }
    return Array.from(seen.values());
  }, [carePrograms, scope, t]);

  const filteredOptions = useMemo(() => {
    const q = scopeSearch.trim().toLowerCase();
    if (!q) return scopeOptions;
    return scopeOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        opt.sublabel.toLowerCase().includes(q),
    );
  }, [scopeOptions, scopeSearch]);

  const selectedOption = useMemo(
    () =>
      scopeOptions.find(
        (opt) => opt.value.toLowerCase() === scopeKey.trim().toLowerCase(),
      ) ?? null,
    [scopeKey, scopeOptions],
  );

  if (!isOpen) return null;

  const activeSpecialties = specialties.filter((s) => s.status === "active");
  const activeCodeSet = new Set(activeSpecialties.map((s) => s.code));
  const extraCodes = selectedSpecialties.filter(
    (code) => !activeCodeSet.has(code),
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

    if (!isEdit && !normalizedKey) {
      showToast.warning(t("medicalFacilities.diseaseSpecialty.scopeKeyRequired"));
      return;
    }
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
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
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
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.diseaseSpecialty.scopeLabel")} *
              </label>
              <select
                value={scope}
                onChange={(e) => {
                  const nextScope = e.target
                    .value as FeTypes.DirectoryMappingScope;
                  setScope(nextScope);
                  setScopeKey("");
                  setScopeSearch("");
                  setDropdownOpen(false);
                }}
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

            <div className="sm:col-span-7" ref={comboboxRef}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.diseaseSpecialty.scopeKeyLabel")} *
              </label>
              {isEdit ? (
                <div className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950/70 px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                  <span className="truncate font-medium">
                    {selectedOption ? selectedOption.label : scopeKey}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    {scopeKey}
                  </span>
                </div>
              ) : scopeOptions.length === 0 ? (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    {t(
                      "medicalFacilities.diseaseSpecialty.noPublishedScopeHint",
                    )}
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-expanded={dropdownOpen}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-left text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-60"
                  >
                    <span
                      className={`truncate ${
                        selectedOption
                          ? "text-slate-900 dark:text-slate-100 font-medium"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {selectedOption
                        ? `${selectedOption.label} (${selectedOption.value})`
                        : scope === "program"
                          ? t(
                              "medicalFacilities.diseaseSpecialty.selectProgramPlaceholder",
                            )
                          : t(
                              "medicalFacilities.diseaseSpecialty.selectDiseasePlaceholder",
                            )}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute left-0 right-0 z-30 mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/70 dark:bg-slate-950/50">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          value={scopeSearch}
                          onChange={(e) => setScopeSearch(e.target.value)}
                          placeholder={t(
                            "medicalFacilities.diseaseSpecialty.searchScopePlaceholder",
                          )}
                          className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                          <div className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            {t(
                              "medicalFacilities.diseaseSpecialty.noScopeMatches",
                            )}
                          </div>
                        ) : (
                          filteredOptions.map((opt) => {
                            const isSelected =
                              opt.value.toLowerCase() ===
                              scopeKey.trim().toLowerCase();
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setScopeKey(opt.value);
                                  setDropdownOpen(false);
                                  setScopeSearch("");
                                }}
                                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                                  isSelected
                                    ? "bg-brand/20 text-slate-900 dark:text-slate-100"
                                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">
                                    {opt.label}
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {opt.sublabel}
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check
                                    size={14}
                                    className="text-emerald-600 dark:text-emerald-400 shrink-0"
                                  />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("medicalFacilities.diseaseSpecialty.selectSpecialtiesLabel")} *
            </label>
            {activeSpecialties.length === 0 ? (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {t("medicalFacilities.formModal.noActiveSpecialtiesHint")}
              </div>
            ) : (
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
            )}
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
            disabled={
              isSubmitting || (!isEdit && scopeOptions.length === 0)
            }
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
