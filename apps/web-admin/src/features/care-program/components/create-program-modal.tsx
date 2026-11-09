import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check, Plus, Trash2, Clock, BookOpen, ClipboardCheck } from "lucide-react";
import { toast } from "react-toastify";
import {
  BASELINE_OPTIONS,
  DEFAULT_PROGRAM_TASK_TEMPLATES,
  SYMPTOM_OPTIONS,
  TASK_TYPE_OPTIONS,
  type CareContentCatalogItem,
  type CareTaskTemplateItem,
  type CareTaskType,
} from "../constants";

export interface CreateProgramData {
  name: string;
  version: string;
  description: string;
  baseline: string[];
  tasks: number;
  taskTemplates: CareTaskTemplateItem[];
  completion: string;
}

interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  educationCatalog: CareContentCatalogItem[];
  onCreate: (status: "draft" | "published", data: CreateProgramData) => Promise<void> | void;
}

export function CreateProgramModal({
  isOpen,
  onClose,
  educationCatalog,
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
  const [taskTemplates, setTaskTemplates] = useState<CareTaskTemplateItem[]>(
    DEFAULT_PROGRAM_TASK_TEMPLATES.slice(0, 3)
  );
  const [completionCriteria, setCompletionCriteria] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const publishedContents = educationCatalog.filter((c) => c.status === "published");

  const toggleBaseline = (itemKey: string) => {
    setSelectedBaselines((prev) =>
      prev.includes(itemKey) ? prev.filter((b) => b !== itemKey) : [...prev, itemKey]
    );
  };

  const handleAddTaskTemplate = () => {
    const nextIdx = taskTemplates.length + 1;
    setTaskTemplates((prev) => [
      ...prev,
      {
        key: `daily_task_${nextIdx}`,
        type: "metric",
        time: "08:00",
        windowMinutes: 120,
      },
    ]);
  };

  const handleRemoveTaskTemplate = (index: number) => {
    if (taskTemplates.length <= 1) {
      toast.warning(
        t("careProgram.toasts.minOneTask", "At least one monitoring task is required")
      );
      return;
    }
    setTaskTemplates((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleTaskTypeChange = (index: number, newType: CareTaskType) => {
    setTaskTemplates((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (newType === "check_in") {
          return {
            key: `symptom_checkin_${idx + 1}`,
            type: "check_in",
            time: item.time,
            windowMinutes: item.windowMinutes,
            allowedSymptomCodes: ["chest_pain", "dizziness", "headache", "fatigue"],
          };
        }
        if (newType === "education") {
          const firstPub = publishedContents[0];
          return {
            key: `education_reading_${idx + 1}`,
            type: "education",
            time: item.time,
            windowMinutes: item.windowMinutes,
            contentId: firstPub?.contentId || "hypertension_salt_guide",
            contentVersion: firstPub?.version || "v1.0",
            contentLocale: firstPub?.locale || "vi",
            displayType: firstPub?.displayType || "article",
          };
        }
        return {
          key: `${newType}_task_${idx + 1}`,
          type: newType,
          time: item.time,
          windowMinutes: item.windowMinutes,
        };
      })
    );
  };

  const toggleTaskSymptom = (taskIndex: number, code: string) => {
    setTaskTemplates((prev) =>
      prev.map((item, idx) => {
        if (idx !== taskIndex) return item;
        const current = item.allowedSymptomCodes || [];
        const exists = current.includes(code);
        const nextCodes = exists
          ? current.filter((c) => c !== code)
          : [...current, code];
        if (nextCodes.length === 0) return item;
        return { ...item, allowedSymptomCodes: nextCodes };
      })
    );
  };

  const handleSelectEducationContent = (taskIndex: number, contentId: string) => {
    const found = publishedContents.find((c) => c.contentId === contentId);
    if (!found) return;
    setTaskTemplates((prev) =>
      prev.map((item, idx) =>
        idx === taskIndex
          ? {
              ...item,
              contentId: found.contentId,
              contentVersion: found.version,
              contentLocale: found.locale,
              displayType: found.displayType,
            }
          : item
      )
    );
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (isSubmitting) return;
    if (!name.trim()) {
      toast.warning(t("careProgram.toasts.nameRequired", "Please enter a program name"));
      return;
    }

    for (const tpl of taskTemplates) {
      if (
        tpl.type === "check_in" &&
        (!tpl.allowedSymptomCodes || tpl.allowedSymptomCodes.length === 0)
      ) {
        toast.warning(
          t(
            "careProgram.toasts.symptomSelectionRequired",
            "Please select at least one tracked symptom for the check-in task"
          )
        );
        return;
      }
      if (tpl.type === "education" && !tpl.contentId) {
        toast.warning(
          t(
            "careProgram.toasts.educationContentRequired",
            "Please select a published educational material"
          )
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onCreate(status, {
        name: name.trim(),
        version: version.trim() || "v1.0",
        description: description.trim(),
        baseline: selectedBaselines.map((key) =>
          t(`careProgram.baseline.${key}`, key)
        ),
        tasks: taskTemplates.length,
        taskTemplates,
        completion:
          completionCriteria.trim() ||
          t(
            "careProgram.modals.completionCriteriaPlaceholder",
            "80% adherence over 90 days"
          ),
      });
      setName("");
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
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
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
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

          {/* Daily Monitoring Task Templates */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t("careProgram.modals.taskTemplates", "Daily Monitoring Tasks")}
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t(
                    "careProgram.modals.taskTemplatesDesc",
                    "Configure daily patient tasks, symptom check-ins, and educational materials."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTaskTemplate}
                className="flex items-center gap-1 rounded-lg bg-brand/20 border border-brand/40 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-brand hover:bg-brand/30 transition-colors"
              >
                <Plus size={14} />
                {t("careProgram.modals.addTaskBtn", "Add Task")}
              </button>
            </div>

            <div className="space-y-3">
              {taskTemplates.map((tpl, idx) => (
                <div
                  key={`${tpl.key}-${idx}`}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-5">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        {t("careProgram.modals.taskTypeLabel", "Task Category")}
                      </label>
                      <select
                        value={tpl.type}
                        onChange={(e) =>
                          handleTaskTypeChange(idx, e.target.value as CareTaskType)
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                      >
                        {TASK_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.type} value={opt.type}>
                            {t(`careProgram.taskTypes.${opt.type}`, opt.defaultLabel)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        {t("careProgram.modals.scheduledTime", "Scheduled Time")}
                      </label>
                      <div className="relative">
                        <Clock
                          size={13}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="time"
                          value={tpl.time}
                          onChange={(e) =>
                            setTaskTemplates((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, time: e.target.value } : item
                              )
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-7 pr-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                        {t("careProgram.modals.windowMinutes", "Completion Window (min)")}
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={1440}
                        value={tpl.windowMinutes}
                        onChange={(e) =>
                          setTaskTemplates((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    windowMinutes: Math.max(
                                      15,
                                      Math.min(1440, parseInt(e.target.value) || 60)
                                    ),
                                  }
                                : item
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveTaskTemplate(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={t("careProgram.modals.removeTask", "Remove task")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Symptom Check-in Configuration */}
                  {tpl.type === "check_in" && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
                        <ClipboardCheck size={14} />
                        <span>
                          {t(
                            "careProgram.modals.allowedSymptomsLabel",
                            "Tracked Symptoms for Check-in"
                          )}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SYMPTOM_OPTIONS.map((sym) => {
                          const active = tpl.allowedSymptomCodes?.includes(sym.code);
                          return (
                            <button
                              key={sym.code}
                              type="button"
                              onClick={() => toggleTaskSymptom(idx, sym.code)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                                active
                                  ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 text-indigo-700 dark:text-indigo-300"
                                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {t(`careProgram.symptoms.${sym.code}`, sym.defaultLabel)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Education Content Catalog Reference */}
                  {tpl.type === "education" && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">
                        <BookOpen size={14} />
                        <span>
                          {t(
                            "careProgram.modals.educationMaterialLabel",
                            "Published Educational Material"
                          )}
                        </span>
                      </div>
                      <select
                        value={tpl.contentId || ""}
                        onChange={(e) => handleSelectEducationContent(idx, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                      >
                        {publishedContents.map((c) => (
                          <option key={c.id} value={c.contentId}>
                            {t(`careProgram.educationCatalogItems.${c.contentId}.title`, c.titleEn)} • {c.version}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Completion Criteria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("careProgram.modals.completionCriteria", "Completion Criteria")}
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

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors disabled:opacity-50"
          >
            {t("careProgram.modals.cancel", "Cancel")}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit("draft")}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors disabled:opacity-50"
          >
            {t("careProgram.modals.saveDraft", "Save Draft")}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit("published")}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {t("careProgram.modals.publish", "Publish Program")}
          </button>
        </div>
      </div>
    </div>
  );
}
