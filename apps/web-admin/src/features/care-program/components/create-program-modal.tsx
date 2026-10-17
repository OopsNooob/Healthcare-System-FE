import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check } from "lucide-react";
import { toast } from "react-toastify";

export interface CreateProgramData {
  name: string;
  version: string;
  description: string;
  baseline: string[];
  tasks: number;
  completion: string;
}

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (status: "draft" | "published", data: CreateProgramData) => void;
}

import { BASELINE_OPTIONS } from "../constants";

export function CreateProgramModal({
  isOpen,
  onClose,
  onCreate,
}: CreateProgramModalProps) {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [version, setVersion] = useState("v1.0");
  const [description, setDescription] = useState("");
  const [selectedBaselines, setSelectedBaselines] = useState<string[]>([
    "bloodPressure",
    "fastingGlucose",
    "medications",
    "quietHours",
  ]);
  const [dailyTaskCount, setDailyTaskCount] = useState(3);
  const [completionCriteria, setCompletionCriteria] = useState("");

  if (!isOpen) return null;

  const toggleBaseline = (itemKey: string) => {
    setSelectedBaselines((prev) =>
      prev.includes(itemKey) ? prev.filter((b) => b !== itemKey) : [...prev, itemKey]
    );
  };

  const handleSubmit = (status: "draft" | "published") => {
    if (!name.trim()) {
      toast.warning(t("careProgram.toasts.nameRequired", "Please enter a program name"));
      return;
    }
    onCreate(status, {
      name: name.trim(),
      version: version.trim() || "v1.0",
      description: description.trim(),
      baseline: selectedBaselines.map(
        (key) => t(`careProgram.baseline.${key}`, key)
      ),
      tasks: dailyTaskCount,
      completion:
        completionCriteria.trim() ||
        t("careProgram.modals.completionCriteriaPlaceholder", "80% adherence over 90 days"),
    });
    setName("");
    setDescription("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t("careProgram.modals.createTitle", "Create Care Program Template")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "careProgram.modals.createDesc",
                "Configure baseline survey metrics and daily tasks for chronic monitoring."
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

        <div className="space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("careProgram.modals.progName", "Program Name")} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  "careProgram.modals.progNamePlaceholder",
                  "e.g. Hypertension Management..."
                )}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("careProgram.modals.version", "Version")}
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("careProgram.modals.description", "Description")}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                "careProgram.modals.descriptionPlaceholder",
                "Monitoring goals and target patient cohort..."
              )}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 outline-none focus:border-brand resize-none"
            />
          </div>

          {/* Baseline Survey Requirements */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t(
                "careProgram.modals.baselineQuestions",
                "Baseline Survey Requirements"
              )}
            </label>
            <p className="text-xs text-slate-500 mb-3">
              {t(
                "careProgram.modals.baselineDesc",
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
                  "careProgram.modals.taskTemplates",
                  "Daily Task Templates Count"
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
                  "careProgram.modals.completionCriteria",
                  "Completion Criteria"
                )}
              </label>
              <input
                type="text"
                value={completionCriteria}
                onChange={(e) => setCompletionCriteria(e.target.value)}
                placeholder={t(
                  "careProgram.modals.completionCriteriaPlaceholder",
                  "80% adherence over 90 days"
                )}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            {t("careProgram.modals.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors"
          >
            {t("careProgram.modals.saveDraft", "Save Draft")}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("published")}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm"
          >
            {t("careProgram.modals.publish", "Publish Program")}
          </button>
        </div>
      </div>
    </div>
  );
}
