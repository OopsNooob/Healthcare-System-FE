import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Plus,
  Play,
  Settings,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  ListChecks,
  BookOpen,
  CalendarClock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "react-toastify";
import { CreateProgramModal, type CreateProgramData } from "../components/create-program-modal";
import { EditProgramModal, type EditProgramSavePayload } from "../components/edit-program-modal";
import { AddRuleModal } from "../components/add-rule-modal";
import { SimulationModal } from "../components/simulation-modal";
import {
  STANDARD_CONTENT_REF_SUGGESTIONS,
  type EducationCatalogItem,
} from "../constants";
import {
  careProgramService,
  type CareProgramRecord,
  type CareRuleRecord,
  type CareRuleTestScenario,
  type CareRuleTestSummary,
  type CreateOrUpdateRuleInput,
  type RuleView,
} from "../services/care-program.service";

export function CareProgram() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"templates" | "rules" | "education">("templates");
  const [ruleView, setRuleView] = useState<RuleView>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [programsList, setProgramsList] = useState<CareProgramRecord[]>([]);
  const [rulesList, setRulesList] = useState<CareRuleRecord[]>([]);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<CareProgramRecord | null>(null);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [selectedRuleForSim, setSelectedRuleForSim] = useState<CareRuleRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(
    async (view: RuleView) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [programsRes, alertSummary] = await Promise.all([
          careProgramService.listPrograms({ page: 1, limit: 50 }),
          careProgramService.getInboxAlertSummary().catch(() => ({ items: [], total: 0 })),
        ]);

        const detailedPrograms = await Promise.all(
          programsRes.items.map((p) =>
            careProgramService.getProgramDetail(p.id, p).catch(() => p)
          )
        );
        setProgramsList(detailedPrograms);
        setActiveAlertCount(alertSummary.total ?? alertSummary.items.length);

        const projections = await Promise.all(
          detailedPrograms.map((prog) => careProgramService.getRuleProjection(prog, view))
        );
        setRulesList(projections.filter((r): r is CareRuleRecord => r !== null));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("careProgram.errors.loadFailed", "Unable to load care programs from server.");
        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(ruleView);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData, ruleView]);

  const educationCatalog = useMemo<EducationCatalogItem[]>(() => {
    const fromPrograms = programsList.flatMap((p) => p.contentJourney);
    if (fromPrograms.length > 0) return fromPrograms;
    return STANDARD_CONTENT_REF_SUGGESTIONS;
  }, [programsList]);

  const handleOpenEditProgram = async (prog: CareProgramRecord) => {
    if (busyId) return;
    setBusyId(`open-${prog.id}`);
    try {
      const detailed = prog.hasDetailLoaded
        ? prog
        : await careProgramService.getProgramDetail(prog.id, prog);
      setEditingProgram(detailed);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.loadDetailFailed", "Failed to load program details")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateProgram = async (
    status: "draft" | "published",
    data: CreateProgramData
  ) => {
    try {
      await careProgramService.createProgram(
        {
          programCode: data.programCode,
          name: data.name,
          diseaseKey: data.diseaseKey,
          description: data.description,
          baselineKeys: data.baselineKeys,
          taskTemplates: data.taskTemplates,
          completionSummary: data.completion,
          publishImmediately: status === "published",
        },
        educationCatalog
      );
      setIsCreateOpen(false);
      toast.success(
        status === "published"
          ? t("careProgram.toasts.createdPublished", "Created & published care program!")
          : t("careProgram.toasts.savedDraft", "Saved program template as Draft.")
      );
      await loadData(ruleView);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.createFailed", "Failed to create care program")
      );
    }
  };

  const handleUpdateProgram = async (
    updated: EditProgramSavePayload,
    options: { publishNow: boolean; asNewVersion: boolean }
  ) => {
    const existing = programsList.find((p) => p.id === updated.id);
    if (!existing) return;

    try {
      if (options.asNewVersion || existing.status !== "draft") {
        await careProgramService.createProgram(
          {
            programCode: updated.programCode,
            name: updated.name,
            diseaseKey: updated.diseaseKey,
            description: updated.description,
            baselineKeys: updated.baselineKeys,
            taskTemplates: updated.taskTemplates,
            completionSummary: updated.completionSummary,
            publishImmediately: options.publishNow,
          },
          educationCatalog
        );
        toast.success(
          t("careProgram.toasts.newVersionCreated", "Created new draft version for {{name}}", {
            name: updated.name,
          })
        );
      } else {
        const saved = await careProgramService.updateProgram(existing, updated, educationCatalog);
        if (options.publishNow) {
          await careProgramService.publishProgram(saved, "Published via web admin");
          toast.success(
            t("careProgram.toasts.publishedProgram", "Published program {{name}}", {
              name: updated.name,
            })
          );
        } else {
          toast.success(
            t("careProgram.toasts.updatedProgram", "Updated template {{name}}", {
              name: updated.name,
            })
          );
        }
      }
      setEditingProgram(null);
      await loadData(ruleView);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.updateFailed", "Failed to save program changes")
      );
    }
  };

  const handlePublishProgram = async (prog: CareProgramRecord) => {
    if (busyId) return;
    setBusyId(`pub-${prog.id}`);
    try {
      const detailed = prog.hasDetailLoaded
        ? prog
        : await careProgramService.getProgramDetail(prog.id, prog);
      await careProgramService.publishProgram(detailed, "Published from care program dashboard");
      toast.success(
        t("careProgram.toasts.publishedProgram", "Published program {{name}}", {
          name: prog.name,
        })
      );
      await loadData(ruleView);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.publishFailed", "Failed to publish care program")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRetireProgram = async (prog: CareProgramRecord) => {
    if (busyId) return;
    setBusyId(`retire-${prog.id}`);
    try {
      const detailed = prog.hasDetailLoaded
        ? prog
        : await careProgramService.getProgramDetail(prog.id, prog);
      await careProgramService.retireProgram(detailed, "Retired from care program dashboard");
      toast.info(
        t("careProgram.toasts.retiredProgram", "Retired program {{name}}", {
          name: prog.name,
        })
      );
      await loadData(ruleView);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.retireFailed", "Failed to retire care program")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleAddRule = async (data: CreateOrUpdateRuleInput) => {
    try {
      await careProgramService.createRuleDraft(data);
      setIsAddRuleOpen(false);
      setRuleView("draft");
      toast.success(
        t("careProgram.toasts.addedRule", "Added new rule draft for {{metric}}", {
          metric: data.metric,
        })
      );
      await loadData("draft");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.createRuleFailed", "Failed to create rule draft")
      );
    }
  };

  const handleActivateRule = async (rule: CareRuleRecord) => {
    if (busyId || rule.revision === undefined) return;
    setBusyId(`rule-${rule.id}`);
    try {
      await careProgramService.activateRule(
        rule.careProgramId,
        rule.id,
        rule.revision,
        "Activated via clinical rule console"
      );
      toast.success(
        t("careProgram.toasts.activatedRule", "Activated alert rule for {{program}}", {
          program: rule.programName,
        })
      );
      await loadData(ruleView);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.activateRuleFailed", "Failed to activate rule")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRetireRule = async (rule: CareRuleRecord) => {
    if (busyId || rule.revision === undefined) return;
    setBusyId(`rule-${rule.id}`);
    try {
      await careProgramService.retireRule(
        rule.careProgramId,
        rule.id,
        rule.revision,
        "Retired via clinical rule console"
      );
      toast.info(
        t("careProgram.toasts.retiredRule", "Retired alert rule for {{program}}", {
          program: rule.programName,
        })
      );
      await loadData(ruleView);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.retireRuleFailed", "Failed to retire rule")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveRuleTestEvidence = async (
    rule: CareRuleRecord,
    summary: CareRuleTestSummary,
    scenarios: CareRuleTestScenario[]
  ) => {
    if (rule.revision === undefined) return;
    try {
      await careProgramService.updateRuleDraft(rule.careProgramId, rule.id, rule.revision, {
        testResults: { summary, scenarios },
      });
      toast.success(
        t("careProgram.toasts.savedTestEvidence", "Saved dry-run verification evidence to draft rule")
      );
      await loadData(ruleView);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.saveTestEvidenceFailed", "Failed to save verification evidence")
      );
    }
  };

  const handleTriggerScheduler = async () => {
    if (busyId) return;
    setBusyId("schedule-tasks");
    try {
      const result = await careProgramService.scheduleTasks();
      toast.success(
        t("careProgram.toasts.tasksScheduled", "Scheduled daily tasks ({{count}} created)", {
          count: result.created ?? 0,
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("careProgram.errors.scheduleFailed", "Failed to run daily task scheduler")
      );
    } finally {
      setBusyId(null);
    }
  };

  const openSimulation = (rule: CareRuleRecord | null = null) => {
    setSelectedRuleForSim(rule || rulesList[0] || null);
    setIsSimulationOpen(true);
  };

  const publishedCount = programsList.filter((p) => p.status === "published").length;
  const draftCount = programsList.filter((p) => p.status === "draft").length;
  const educationFromPrograms = programsList.flatMap((p) => p.contentJourney);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("careProgram.title", "Care Programs")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "careProgram.desc",
              "Manage chronic care protocol templates, declarative alert rules, and dry-run simulations."
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busyId === "schedule-tasks"}
            onClick={handleTriggerScheduler}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <CalendarClock size={15} className="text-brand" />
            <span>{t("careProgram.actions.scheduleTasks", "Run Task Scheduler")}</span>
          </button>
          <button
            type="button"
            disabled={isLoading || Boolean(busyId)}
            onClick={() => loadData(ruleView)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>{t("common.refresh", "Refresh")}</span>
          </button>
          {activeTab === "templates" ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-brand/90 transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span>{t("careProgram.actions.createProgram", "Create Care Program")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddRuleOpen(true)}
              disabled={programsList.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-brand/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus size={18} />
              <span>{t("careProgram.actions.addRule", "Add Alert Rule")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("careProgram.stats.publishedPrograms", "Published Programs")}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {publishedCount}
            </p>
          </div>
          <CheckCircle2 size={20} className="text-emerald-500" />
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("careProgram.stats.draftPrograms", "Draft Programs")}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {draftCount}
            </p>
          </div>
          <FileEdit size={20} className="text-amber-500" />
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("careProgram.stats.activeRules", "Loaded Rules")}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {rulesList.length}
            </p>
          </div>
          <ShieldCheck size={20} className="text-indigo-500" />
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("careProgram.stats.careAlerts", "Care Inbox Alerts")}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {activeAlertCount}
            </p>
          </div>
          <AlertTriangle size={20} className="text-rose-500" />
        </div>
      </div>

      {/* Tabs + Rule View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "templates"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t("careProgram.tabs.templates", "Care Program Templates")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "rules"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t("careProgram.tabs.rules", "Alert Rule Engine")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("education")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "education"
                ? "border-brand text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t("careProgram.tabs.education", "Educational Content")}
          </button>
        </div>

        {activeTab === "rules" && (
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-1">
            {(["active", "draft"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setRuleView(view)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  ruleView === view
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {view === "active"
                  ? t("careProgram.rules.viewActive", "Active Projection")
                  : t("careProgram.rules.viewDraft", "Draft Projection")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
                <div className="space-y-2 py-4 border-y border-slate-100 dark:border-slate-800">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                </div>
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-8 text-center space-y-3">
            <AlertTriangle size={28} className="mx-auto text-rose-500" />
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{loadError}</p>
            <button
              type="button"
              onClick={() => loadData(ruleView)}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
            >
              {t("common.retry", "Retry")}
            </button>
          </div>
        ) : (
          <>
            {activeTab === "templates" &&
              (programsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
                  <ListChecks size={32} className="mx-auto text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t("careProgram.empty.programsTitle", "No care programs created yet")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-slate-900 hover:bg-brand/90"
                  >
                    <Plus size={14} />
                    <span>{t("careProgram.actions.createProgram", "Create Care Program")}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {programsList.map((prog) => (
                    <div
                      key={prog.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-brand/10 dark:bg-brand/20 text-slate-900 dark:text-brand">
                              <Activity size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {prog.name}
                              </h3>
                              <span className="text-xs font-mono text-slate-400">
                                {prog.programCode} • v{prog.version}
                              </span>
                            </div>
                          </div>
                          {prog.status === "published" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none gap-1 whitespace-nowrap">
                              <CheckCircle2 size={12} />{" "}
                              {t("careProgram.cards.published", "Published")}
                            </Badge>
                          ) : prog.status === "retired" ? (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none whitespace-nowrap"
                            >
                              {t("careProgram.rules.retired", "Retired")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-none gap-1 whitespace-nowrap"
                            >
                              <FileEdit size={12} /> {t("careProgram.cards.draft", "Draft")}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-5 space-y-2.5 text-sm text-slate-600 dark:text-slate-400 border-t border-b border-slate-100 dark:border-slate-800 py-4">
                          <div className="flex items-center justify-between gap-2">
                            <span>{t("careProgram.modals.diseaseKey", "Condition Group")}:</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-200">
                              {t(`careProgram.diseases.${prog.diseaseKey}`, prog.diseaseKey)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>{t("careProgram.cards.baseline", "Baseline Survey")}:</span>
                            <span className="font-medium text-slate-900 dark:text-slate-200 text-right max-w-[160px] truncate">
                              {prog.baselineKeys.length > 0
                                ? prog.baselineKeys
                                    .map((k) => t(`careProgram.baseline.${k}`, k))
                                    .join(", ")
                                : "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>{t("careProgram.cards.dailyTasks", "Daily Tasks")}:</span>
                            <span className="font-medium text-slate-900 dark:text-slate-200 flex items-center gap-1">
                              <ListChecks size={14} className="text-brand" />{" "}
                              {prog.taskTemplates.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>{t("careProgram.cards.completion", "Completion")}:</span>
                            <span className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[170px]">
                              {prog.completionSummary}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                          {new Date(prog.lastUpdated).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-2">
                          {prog.status === "draft" && (
                            <button
                              type="button"
                              disabled={busyId === `pub-${prog.id}`}
                              onClick={() => handlePublishProgram(prog)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              {t("careProgram.modals.publish", "Publish Program")}
                            </button>
                          )}
                          {prog.status === "published" && (
                            <button
                              type="button"
                              disabled={busyId === `retire-${prog.id}`}
                              onClick={() => handleRetireProgram(prog)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-semibold hover:bg-rose-200 transition-colors disabled:opacity-50"
                            >
                              {t("careProgram.rules.retire", "Retire")}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === `open-${prog.id}`}
                            onClick={() => handleOpenEditProgram(prog)}
                            className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand/80 transition-colors disabled:opacity-50"
                          >
                            <Settings size={14} /> {t("careProgram.cards.edit", "Edit")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {activeTab === "rules" && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.program", "CARE PROGRAM")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.condition", "ALERT CONDITION")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.severity", "SEVERITY")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.testSummaryLabel", "VERIFICATION")}
                        </th>
                        <th className="px-6 py-4 whitespace-nowrap">
                          {t("careProgram.rules.status", "STATUS")}
                        </th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">
                          {t("careProgram.rules.edit", "ACTIONS")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {rulesList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                            {ruleView === "draft"
                              ? t("careProgram.empty.draftRules", "No draft rules found across programs.")
                              : t("careProgram.empty.activeRules", "No active rules found across programs.")}
                          </td>
                        </tr>
                      ) : (
                        rulesList.map((rule) => (
                          <tr
                            key={rule.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              <div>{rule.programName}</div>
                              <div className="text-[11px] font-mono text-slate-400">
                                v{rule.version}
                                {rule.revision !== undefined ? ` • r${rule.revision}` : ""}
                              </div>
                            </td>
                            <td className="px-6 py-4 min-w-[240px]">
                              <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-slate-800 dark:text-slate-200 font-semibold inline-block">
                                {rule.conditionSummary}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {rule.primarySeverity === "Urgent" ? (
                                <Badge
                                  variant="destructive"
                                  className="gap-1 whitespace-nowrap inline-flex items-center"
                                >
                                  <AlertTriangle size={12} />{" "}
                                  {t("careProgram.modals.severityUrgent", "Urgent")}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/50 text-amber-600 dark:text-amber-400 whitespace-nowrap inline-flex items-center"
                                >
                                  {t("careProgram.modals.severityAttention", "Attention")}
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {rule.testSummary ? (
                                <Badge
                                  className={
                                    rule.testSummary.status === "passed"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none"
                                      : rule.testSummary.status === "failed"
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-none"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none"
                                  }
                                >
                                  {rule.testSummary.status}
                                  {rule.testSummary.total !== undefined
                                    ? ` ${rule.testSummary.passed ?? 0}/${rule.testSummary.total}`
                                    : ""}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  {t("careProgram.rules.noTestSummary", "Not tested")}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {rule.status === "active" ? (
                                <Badge
                                  variant="default"
                                  className="bg-emerald-50 text-emerald-700 border-none dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap inline-flex items-center"
                                >
                                  {t("careProgram.rules.active", "Active")}
                                </Badge>
                              ) : rule.status === "retired" ? (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-100 text-slate-600 border-none dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap inline-flex items-center"
                                >
                                  {t("careProgram.rules.retired", "Retired")}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-600 border-none dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap inline-flex items-center"
                                >
                                  {t("careProgram.rules.draft", "Draft")}
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                {rule.status === "draft" && rule.programStatus === "published" && (
                                  <button
                                    type="button"
                                    disabled={busyId === `rule-${rule.id}` || rule.revision === undefined}
                                    onClick={() => handleActivateRule(rule)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-brand text-slate-900 hover:bg-brand/90 transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center disabled:opacity-50"
                                  >
                                    {t("careProgram.rules.activate", "Activate")}
                                  </button>
                                )}
                                {rule.status === "active" && (
                                  <button
                                    type="button"
                                    disabled={busyId === `rule-${rule.id}` || rule.revision === undefined}
                                    onClick={() => handleRetireRule(rule)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center disabled:opacity-50"
                                  >
                                    {t("careProgram.rules.retire", "Retire")}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openSimulation(rule)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center"
                                  title={t("careProgram.modals.simTitle", "Simulate Dry-Run")}
                                >
                                  <Play size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                      "Educational materials linked in program content journeys are delivered to enrolled patients according to their daily task schedule."
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
                            {t("careProgram.rules.program", "CARE PROGRAM")}
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {educationFromPrograms.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                              {t(
                                "careProgram.empty.education",
                                "No educational materials have been attached to care programs yet. Add an education task template in a draft care program to configure materials."
                              )}
                            </td>
                          </tr>
                        ) : (
                          educationFromPrograms.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {t(
                                    `careProgram.educationCatalogItems.${item.contentId}.title`,
                                    item.title
                                  )}
                                </p>
                                {item.summary && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {t(
                                      `careProgram.educationCatalogItems.${item.contentId}.summary`,
                                      item.summary
                                    )}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">
                                {item.programName || "—"}
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
                                <Badge
                                  variant={item.status === "published" ? "default" : "outline"}
                                  className={
                                    item.status === "published"
                                      ? "bg-emerald-50 text-emerald-700 border-none dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap"
                                      : "bg-slate-100 text-slate-600 border-none dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap"
                                  }
                                >
                                  {item.status === "published"
                                    ? t("careProgram.cards.published", "Published")
                                    : t("careProgram.cards.draft", "Draft")}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
        onSaveTestEvidence={handleSaveRuleTestEvidence}
      />
    </div>
  );
}
