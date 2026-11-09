import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  FileText,
  Settings,
  PlayCircle,
  Clock,
  Activity,
  CheckCircle2,
  Play,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "react-toastify";
import { CreateProgramModal } from "../components/create-program-modal";
import type { CreateProgramData } from "../components/create-program-modal";
import { EditProgramModal, type ProgramItem } from "../components/edit-program-modal";
import { AddRuleModal } from "../components/add-rule-modal";
import type { CreateRuleData } from "../components/add-rule-modal";
import { SimulationModal } from "../components/simulation-modal";
import type { RuleItem as SimRuleItem } from "../components/simulation-modal";
import {
  DEFAULT_PROGRAM_TASK_TEMPLATES,
  INITIAL_EDUCATION_CATALOG,
  mockDelay,
  type CareContentCatalogItem,
} from "../constants";

export type RuleItem = SimRuleItem;

export function CareProgram() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"templates" | "rules" | "education">(
    "templates"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [educationCatalog, setEducationCatalog] = useState<
    CareContentCatalogItem[]
  >(INITIAL_EDUCATION_CATALOG);

  const [programsList, setProgramsList] = useState<ProgramItem[]>([
    {
      id: 1,
      name: "Hypertension Management",
      version: "v1.2",
      status: "published",
      patients: 1245,
      lastUpdated: "2026-11-05",
      baseline: ["Blood Pressure", "Heart Rate"],
      tasks: 5,
      taskTemplates: DEFAULT_PROGRAM_TASK_TEMPLATES,
      completion: "90 days without critical alert",
    },
    {
      id: 2,
      name: "Diabetes Care",
      version: "v2.0",
      status: "draft",
      patients: 0,
      lastUpdated: "2026-11-08",
      baseline: ["HbA1c", "Fasting Glucose"],
      tasks: 3,
      taskTemplates: DEFAULT_PROGRAM_TASK_TEMPLATES.slice(0, 3),
      completion: "Maintain Glucose < 130 mg/dL",
    },
  ]);

  const [rulesList, setRulesList] = useState<RuleItem[]>([
    {
      id: 1,
      program: "Hypertension Management",
      sourceType: "health_metric",
      metric: "Systolic",
      operator: ">",
      threshold: 140,
      condition: "Systolic > 140 OR Diastolic > 90",
      severity: "Attention",
      status: "active",
      action: "Send Doctor Alert",
    },
    {
      id: 2,
      program: "Hypertension Management",
      sourceType: "health_metric",
      metric: "Systolic",
      operator: ">",
      threshold: 180,
      condition: "Systolic > 180 OR Diastolic > 120",
      severity: "Urgent",
      status: "retired",
      action: "Emergency Protocol",
    },
    {
      id: 3,
      program: "Diabetes Care",
      sourceType: "health_metric",
      metric: "Glucose",
      operator: ">",
      threshold: 200,
      condition: "Glucose > 200 mg/dL",
      severity: "Attention",
      status: "draft",
      action: "Task: Retest in 2 hours",
    },
    {
      id: 4,
      program: "Hypertension Management",
      sourceType: "care_task_check_in",
      templateKey: "daily_symptom_check",
      metric: "SymptomSeverityRank",
      operator: ">=",
      threshold: 2,
      condition: "SymptomSeverityRank >= 2",
      severity: "Urgent",
      status: "active",
      action: "Send Doctor Alert",
    },
  ]);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramItem | null>(null);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [selectedRuleForSim, setSelectedRuleForSim] = useState<RuleItem | null>(
    null
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 320);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdateProgram = async (updated: ProgramItem) => {
    await mockDelay(280);
    setProgramsList((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    toast.success(
      t("careProgram.toasts.updateSuccess", "Care program updated successfully")
    );
    setEditingProgram(null);
  };

  const handleCreateProgram = async (
    status: "draft" | "published",
    data: CreateProgramData
  ) => {
    await mockDelay(320);
    const newProg: ProgramItem = {
      id: programsList.length + 10,
      name: data.name.trim(),
      version: data.version.trim() || "v1.0",
      status,
      patients: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
      baseline: data.baseline,
      tasks: data.tasks,
      taskTemplates: data.taskTemplates,
      completion: data.completion,
    };
    setProgramsList((prev) => [newProg, ...prev]);
    toast.success(
      status === "published"
        ? t("careProgram.toasts.publishSuccess", "Program published successfully")
        : t("careProgram.toasts.draftSuccess", "Draft saved successfully")
    );
    setIsCreateOpen(false);
  };

  const handleAddRule = async (data: CreateRuleData) => {
    await mockDelay(280);
    const conditionStr = `${data.metric} ${data.operator} ${data.threshold}`;
    const newRule: RuleItem = {
      id: rulesList.length + 10,
      program: data.program,
      sourceType: data.sourceType,
      templateKey: data.templateKey,
      metric: data.metric,
      operator: data.operator,
      threshold: data.threshold,
      condition: conditionStr,
      severity: data.severity,
      status: "active",
      action: data.action,
    };
    setRulesList((prev) => [newRule, ...prev]);
    toast.success(
      t("careProgram.toasts.ruleCreated", "Alert rule created successfully")
    );
    setIsAddRuleOpen(false);
  };

  const handleActivateRule = async (ruleId: number) => {
    const key = `rule-${ruleId}`;
    if (busyId === key) return;
    setBusyId(key);
    try {
      await mockDelay(240);
      setRulesList((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, status: "active" } : r))
      );
      toast.success(t("careProgram.toasts.ruleActivated", "Rule activated"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRetireRule = async (ruleId: number) => {
    const key = `rule-${ruleId}`;
    if (busyId === key) return;
    setBusyId(key);
    try {
      await mockDelay(240);
      setRulesList((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, status: "retired" } : r))
      );
      toast.info(t("careProgram.toasts.ruleRetired", "Rule retired"));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleEducationStatus = async (itemId: string) => {
    const key = `edu-${itemId}`;
    if (busyId === key) return;
    setBusyId(key);
    try {
      await mockDelay(240);
      setEducationCatalog((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const nextStatus =
            item.status === "published" ? "retired" : "published";
          return {
            ...item,
            status: nextStatus,
            updatedAt: new Date().toISOString().split("T")[0],
          };
        })
      );
      toast.success(
        t(
          "careProgram.toasts.educationStatusUpdated",
          "Educational material status updated"
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  const openSimulation = (rule?: RuleItem) => {
    const target = rule || rulesList[0];
    setSelectedRuleForSim(target);
    setIsSimulationOpen(true);
  };

  const filteredPrograms = programsList.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm min-h-[80vh]">
        {/* Top Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {t("careProgram.title", "Care Program & Rules")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "careProgram.subtitle",
                "Manage chronic care program templates, alert triggering rules, and simulation."
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "rules" && (
              <button
                type="button"
                onClick={() => openSimulation()}
                className="flex items-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-400 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
              >
                <Play size={18} />
                {t("careProgram.actions.runSimulation", "Run Simulation")}
              </button>
            )}
            {activeTab !== "education" && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === "templates") setIsCreateOpen(true);
                  else setIsAddRuleOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-brand/90 transition-colors whitespace-nowrap"
              >
                <Plus size={18} />
                {activeTab === "templates"
                  ? t("careProgram.actions.createProgram", "Create Program")
                  : t("careProgram.actions.addRule", "Add Rule")}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "templates"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {t("careProgram.tabs.templates", "Program Templates")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "rules"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {t("careProgram.tabs.rules", "Alert Rules")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("education")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "education"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {t("careProgram.tabs.education", "Educational Materials")}
          </button>
        </div>

        {/* Skeleton Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 animate-pulse space-y-4"
              >
                <div className="flex justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="w-20 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="w-3/4 h-5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-1/2 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2 pt-2">
                  <div className="w-full h-4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-2/3 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Templates Tab Content */}
            {activeTab === "templates" && (
              <div>
                <div className="mb-4 relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t(
                      "careProgram.actions.searchPlaceholder",
                      "Search programs..."
                    )}
                    className="w-full md:w-1/3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand dark:focus:border-brand"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPrograms.map((prog) => (
                    <div
                      key={prog.id}
                      onClick={() => setEditingProgram(prog)}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-brand dark:hover:border-brand transition-colors cursor-pointer group bg-white dark:bg-slate-900 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                          <FileText
                            className="text-indigo-600 dark:text-indigo-400"
                            size={24}
                          />
                        </div>
                        {prog.status === "published" ? (
                          <Badge
                            variant="default"
                            className="bg-emerald-50 text-emerald-700 border-none dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-50 whitespace-nowrap"
                          >
                            <PlayCircle size={12} className="mr-1" />
                            {t("careProgram.cards.published", "Published")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-600 border-none dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 whitespace-nowrap"
                          >
                            <Clock size={12} className="mr-1" />
                            {t("careProgram.cards.draft", "Draft")}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                        {prog.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <span>{prog.version}</span>
                        <span>•</span>
                        <span>
                          {t("careProgram.cards.enrolled", "{{count}} enrolled", {
                            count: prog.patients,
                          })}
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-start gap-2">
                          <Activity size={16} className="text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {t(
                                "careProgram.cards.baselineMetrics",
                                "Baseline Metrics"
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {prog.baseline.join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <FileText size={16} className="text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {t("careProgram.cards.taskTemplates", "Task Templates")}
                            </p>
                            <p className="text-xs text-slate-500">
                              {t(
                                "careProgram.cards.tasksConfigured",
                                "{{count}} daily tasks configured",
                                { count: prog.tasks }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            size={16}
                            className="text-slate-400 mt-0.5"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {t(
                                "careProgram.cards.completionCriteria",
                                "Completion Criteria"
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{prog.completion}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                        <span className="text-xs text-slate-400">
                          {t("careProgram.cards.updated", "Updated")}{" "}
                          {prog.lastUpdated}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProgram(prog);
                          }}
                          className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={t("careProgram.cards.editProgram", "Edit Program")}
                          aria-label={t(
                            "careProgram.cards.editProgram",
                            "Edit Program"
                          )}
                        >
                          <Settings size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredPrograms.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                      {t(
                        "careProgram.cards.noPrograms",
                        "No matching care programs found"
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rules Tab Content */}
            {activeTab === "rules" && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.program", "PROGRAM")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.source", "DATA SOURCE")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.condition", "CONDITION")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.severity", "SEVERITY")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.status", "STATUS")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.action", "ACTION")}
                        </th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">
                          {t("careProgram.rules.edit", "ACTIONS")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {rulesList.map((rule) => (
                        <tr
                          key={rule.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {rule.program}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {rule.sourceType === "care_task_check_in" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full whitespace-nowrap">
                                <ClipboardCheck size={13} />
                                {t(
                                  "careProgram.modals.sourceSymptomCheckIn",
                                  "Symptom Check-in"
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full whitespace-nowrap">
                                <Activity size={13} />
                                {t(
                                  "careProgram.modals.sourceHealthMetric",
                                  "Vital Measurements"
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 whitespace-nowrap inline-block">
                              {rule.condition}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {rule.severity === "Urgent" ? (
                              <span className="text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full text-xs dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 whitespace-nowrap inline-flex items-center">
                                {t("careProgram.modals.severityUrgent", "Urgent")}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-full text-xs dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 whitespace-nowrap inline-flex items-center">
                                {t(
                                  "careProgram.modals.severityAttention",
                                  "Attention"
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {rule.status === "active" ? (
                              <Badge
                                variant="default"
                                className="bg-emerald-50 text-emerald-700 border-none dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-50 whitespace-nowrap inline-flex items-center"
                              >
                                {t("careProgram.rules.active", "Active")}
                              </Badge>
                            ) : rule.status === "retired" ? (
                              <Badge
                                variant="outline"
                                className="bg-slate-100 text-slate-600 border-none dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 whitespace-nowrap inline-flex items-center"
                              >
                                {t("careProgram.rules.retired", "Retired")}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-600 border-none dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-50 whitespace-nowrap inline-flex items-center"
                              >
                                {t("careProgram.rules.draft", "Draft")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 min-w-[200px]">
                            {rule.action}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              {rule.status !== "active" ? (
                                <button
                                  type="button"
                                  disabled={busyId === `rule-${rule.id}`}
                                  onClick={() => handleActivateRule(rule.id)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-brand text-slate-900 hover:bg-brand/90 transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center disabled:opacity-50"
                                >
                                  {t("careProgram.rules.activate", "Activate")}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busyId === `rule-${rule.id}`}
                                  onClick={() => handleRetireRule(rule.id)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center disabled:opacity-50"
                                >
                                  {t("careProgram.rules.retire", "Retire")}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openSimulation(rule)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center"
                                title={t(
                                  "careProgram.modals.simTitle",
                                  "Simulate Dry-Run"
                                )}
                              >
                                <Play size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Educational Materials Catalog Tab Content */}
            {activeTab === "education" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex items-start gap-3">
                  <BookOpen
                    size={18}
                    className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                  />
                  <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    {t(
                      "careProgram.educationCatalog.notice",
                      "Only published educational materials can be viewed and acknowledged by patients in their daily tasks. Draft or retired materials are automatically locked from patient acknowledgement."
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm text-slate-600 dark:text-slate-400">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-6 py-4 whitespace-nowrap">
                            {t("careProgram.educationCatalog.colTitle", "MATERIAL")}
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            {t("careProgram.educationCatalog.colFormat", "FORMAT")}
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            {t("careProgram.educationCatalog.colVersion", "VERSION")}
                          </th>
                          <th className="px-6 py-4 whitespace-nowrap">
                            {t("careProgram.educationCatalog.colStatus", "STATUS")}
                          </th>
                          <th className="px-6 py-4 text-right whitespace-nowrap">
                            {t("careProgram.rules.edit", "ACTIONS")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {educationCatalog.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {t(
                                  `careProgram.educationCatalogItems.${item.contentId}.title`,
                                  item.titleEn
                                )}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {t(
                                  `careProgram.educationCatalogItems.${item.contentId}.summary`,
                                  item.summaryEn
                                )}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {t(
                                  `careProgram.educationCatalog.format.${item.displayType}`,
                                  item.displayType
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                              {item.version}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.status === "published" ? (
                                <Badge
                                  variant="default"
                                  className="bg-emerald-50 text-emerald-700 border-none dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-50 whitespace-nowrap"
                                >
                                  {t("careProgram.cards.published", "Published")}
                                </Badge>
                              ) : item.status === "draft" ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-600 border-none dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-50 whitespace-nowrap"
                                >
                                  {t("careProgram.cards.draft", "Draft")}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-100 text-slate-600 border-none dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 whitespace-nowrap"
                                >
                                  {t("careProgram.rules.retired", "Retired")}
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                disabled={busyId === `edu-${item.id}`}
                                onClick={() => handleToggleEducationStatus(item.id)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap disabled:opacity-50 ${
                                  item.status === "published"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200"
                                    : "bg-brand text-slate-900 hover:bg-brand/90"
                                }`}
                              >
                                {item.status === "published"
                                  ? t("careProgram.rules.retire", "Retire")
                                  : t(
                                      "careProgram.educationCatalog.publishBtn",
                                      "Publish"
                                    )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateProgramModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        educationCatalog={educationCatalog}
        onCreate={handleCreateProgram}
      />

      <EditProgramModal
        isOpen={!!editingProgram}
        onClose={() => setEditingProgram(null)}
        program={editingProgram}
        educationCatalog={educationCatalog}
        onSave={handleUpdateProgram}
      />

      <AddRuleModal
        isOpen={isAddRuleOpen}
        onClose={() => setIsAddRuleOpen(false)}
        programs={programsList}
        onAddRule={handleAddRule}
      />

      <SimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        rules={rulesList}
        selectedRule={selectedRuleForSim}
        onSelectRule={setSelectedRuleForSim}
      />
    </div>
  );
}
