import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check, Users, Settings } from "lucide-react";
import { toast } from "react-toastify";
import type { TFunction } from "i18next";
import { BASELINE_OPTIONS } from "../constants";

export interface ProgramItem {
  id: number;
  name: string;
  version: string;
  status: "published" | "draft";
  patients: number;
  lastUpdated: string;
  baseline: string[];
  tasks: number;
  completion: string;
}

interface EditProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: ProgramItem | null;
  onSave: (updated: ProgramItem) => void;
}

function resolveInitialBaselines(
  baseline: string[],
  t: TFunction
): string[] {
  const matchedKeys: string[] = [];
  BASELINE_OPTIONS.forEach((opt) => {
    const translated = t(`careProgram.baseline.${opt.key}`, opt.defaultLabel).toLowerCase();
    const defaultLbl = opt.defaultLabel.toLowerCase();
    const optKey = opt.key.toLowerCase();

    const isIncluded = baseline.some((item) => {
      const itemLower = item.toLowerCase();
      return (
        itemLower === optKey ||
        itemLower === defaultLbl ||
        itemLower === translated ||
        itemLower.includes(defaultLbl) ||
        itemLower.includes(optKey)
      );
    });

    if (isIncluded) {
      matchedKeys.push(opt.key);
    }
  });

  return matchedKeys.length > 0 ? matchedKeys : ["bloodPressure"];
}

interface EditProgramFormProps {
  program: ProgramItem;
  onClose: () => void;
  onSave: (updated: ProgramItem) => void;
}

function EditProgramForm({ program, onClose, onSave }: EditProgramFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(program.name);
  const [version, setVersion] = useState(program.version);
  const [status, setStatus] = useState<"published" | "draft">(program.status);
  const [selectedBaselines, setSelectedBaselines] = useState<string[]>(() =>
    resolveInitialBaselines(program.baseline, t)
  );
  const [dailyTaskCount, setDailyTaskCount] = useState(program.tasks);
  const [completionCriteria, setCompletionCriteria] = useState(program.completion);

  const toggleBaseline = (itemKey: string) => {
    setSelectedBaselines((prev) =>
      prev.includes(itemKey) ? prev.filter((b) => b !== itemKey) : [...prev, itemKey]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.warning(t("careProgram.toasts.nameRequired", "Please enter a program name"));
      return;
    }

    const baselineLabels = selectedBaselines.map((key) =>
      t(`careProgram.baseline.${key}`, key)
    );

    onSave({
      ...program,
      name: name.trim(),
      version: version.trim() || "v1.0",
      status,
      baseline: baselineLabels.length > 0 ? baselineLabels : program.baseline,
      tasks: dailyTaskCount,
      completion:
        completionCriteria.trim() ||
        t("careProgram.editModal.completionCriteriaPlaceholder", "80% adherence over 90 days"),
      lastUpdated: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand/10 dark:bg-brand/20 text-slate-900 dark:text-brand">
            <Settings size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t("careProgram.editModal.title", "Edit Care Program Template")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t(
                "careProgram.editModal.desc",
                "Update program details, monitoring metrics and operational status."
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form Body */}
      <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
        {/* Enrolled Patients Snapshot */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-brand" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("careProgram.editModal.enrolledPatients", "Active Enrolled Patients")}
            </span>
          </div>
          <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            {t("careProgram.editModal.enrolledCount", "{{count}} patients", {
              count: program.patients,
            })}
          </span>
        </div>

        {/* Program Name & Version */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("careProgram.editModal.progName", "Program Name")} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                "careProgram.editModal.progNamePlaceholder",
                "Enter program name..."
              )}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("careProgram.editModal.version", "Version")}
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Operational Status (Draft vs Published) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t("careProgram.editModal.status", "Operational Status")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus("published")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                status === "published"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "published" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              />
              {t("careProgram.editModal.published", "Published")}
            </button>
            <button
              type="button"
              onClick={() => setStatus("draft")}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                status === "draft"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "draft" ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              />
              {t("careProgram.editModal.draft", "Draft")}
            </button>
          </div>
        </div>

        {/* Baseline Survey Requirements */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            {t(
              "careProgram.editModal.baselineRequirements",
              "Baseline Survey Requirements"
            )}
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {t(
              "careProgram.editModal.baselineDesc",
              "Select vital metrics required upon patient enrollment:"
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {BASELINE_OPTIONS.map((item) => {
              const isSelected = selectedBaselines.includes(item.key);
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => toggleBaseline(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                    isSelected
                      ? "bg-brand/20 border-brand text-slate-900 dark:text-brand"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {isSelected && <Check size={14} className="text-brand-dark" />}
                  {t(`careProgram.baseline.${item.key}`, item.defaultLabel)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tasks and Completion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t(
                "careProgram.editModal.taskTemplates",
                "Daily Tasks Templates Count"
              )}
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={dailyTaskCount}
              onChange={(e) => setDailyTaskCount(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t(
                "careProgram.editModal.completionCriteria",
                "Completion Criteria"
              )}
            </label>
            <input
              type="text"
              value={completionCriteria}
              onChange={(e) => setCompletionCriteria(e.target.value)}
              placeholder={t(
                "careProgram.editModal.completionCriteriaPlaceholder",
                "80% adherence over 90 days"
              )}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
        >
          {t("careProgram.editModal.cancel", "Cancel")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm"
        >
          {t("careProgram.editModal.save", "Save Changes")}
        </button>
      </div>
    </div>
  );
}

export function EditProgramModal({
  isOpen,
  onClose,
  program,
  onSave,
}: EditProgramModalProps) {
  if (!isOpen || !program) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <EditProgramForm
        key={program.id}
        program={program}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}
