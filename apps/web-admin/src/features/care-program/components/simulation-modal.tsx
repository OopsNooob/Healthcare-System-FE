import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Play,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import type {
  CareRuleRecord,
  CareRuleTestScenario,
  CareRuleTestSummary,
  DeclarativeRuleNode,
} from "../services/care-program.service";

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: CareRuleRecord[];
  selectedRule: CareRuleRecord | null;
  onSelectRule: (rule: CareRuleRecord | null) => void;
  onSaveTestEvidence?: (
    rule: CareRuleRecord,
    summary: CareRuleTestSummary,
    scenarios: CareRuleTestScenario[]
  ) => Promise<void>;
}

function evaluateNode(node: DeclarativeRuleNode, facts: Record<string, unknown>): boolean {
  if (node.operator === "all") {
    const children = (node.rules || []) as unknown as DeclarativeRuleNode[];
    return children.every((child) => evaluateNode(child, facts));
  }
  if (node.operator === "any") {
    const children = (node.rules || []) as unknown as DeclarativeRuleNode[];
    return children.some((child) => evaluateNode(child, facts));
  }
  if (node.operator === "not") {
    const children = (node.rules || []) as unknown as DeclarativeRuleNode[];
    return !children.some((child) => evaluateNode(child, facts));
  }
  if (!node.key) return false;
  const actual = facts[node.key];
  if (node.operator === "exists") return actual !== undefined && actual !== null;
  if (actual === undefined || actual === null) return false;
  if (node.operator === "equal") return actual === node.value;
  if (node.operator === "not_equal") return actual !== node.value;
  if (typeof actual !== "number") return false;
  if (node.operator === "gt") return actual > Number(node.value);
  if (node.operator === "gte") return actual >= Number(node.value);
  if (node.operator === "lt") return actual < Number(node.value);
  if (node.operator === "lte") return actual <= Number(node.value);
  if (node.operator === "between") {
    return actual >= Number(node.min ?? -Infinity) && actual <= Number(node.max ?? Infinity);
  }
  return false;
}

export function SimulationModal({
  isOpen,
  onClose,
  rules,
  selectedRule,
  onSelectRule,
  onSaveTestEvidence,
}: SimulationModalProps) {
  const { t } = useTranslation();
  const [simSystolic, setSimSystolic] = useState("155");
  const [simDiastolic, setSimDiastolic] = useState("92");
  const [simGlucose, setSimGlucose] = useState("190");
  const [simHeartRate, setSimHeartRate] = useState("98");
  const [simSeverityRank, setSimSeverityRank] = useState("2");
  const [simChestPain, setSimChestPain] = useState(false);
  const [simResult, setSimResult] = useState<{
    matched: boolean;
    severity: "normal" | "attention" | "urgent";
    reasonCodes: string[];
    details: string;
    isActiveRule: boolean;
  } | null>(null);
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);

  if (!isOpen) return null;

  const activeRule = selectedRule || rules[0] || null;

  const buildFacts = (): Record<string, unknown> => {
    const sys = parseFloat(simSystolic) || 0;
    const dia = parseFloat(simDiastolic) || 0;
    const glu = parseFloat(simGlucose) || 0;
    const hr = parseFloat(simHeartRate) || 0;
    const sevRank = parseInt(simSeverityRank, 10) || 0;
    return {
      systolic: sys,
      diastolic: dia,
      value: activeRule?.programCode.includes("diabetes") ? glu : sys || hr,
      "check_in.severity_rank": sevRank,
      "check_in.severity": sevRank >= 3 ? "severe" : sevRank === 2 ? "moderate" : sevRank === 1 ? "mild" : "none",
      "check_in.overall_status": sevRank >= 2 ? "worse" : "stable",
      "check_in.symptom.chest_pain": simChestPain ? 1 : 0,
      "check_in.symptom.shortness_of_breath": 0,
      "check_in.symptom.dizziness": 0,
    };
  };

  const handleRunSimulation = () => {
    if (!activeRule) return;
    const facts = buildFacts();
    let severity: "normal" | "attention" | "urgent" = "normal";
    const rank = { normal: 0, attention: 1, urgent: 2 };
    const reasonCodes: string[] = [];

    for (const node of activeRule.rules) {
      if (!evaluateNode(node, facts)) continue;
      const cand = node.severity ?? "attention";
      if (rank[cand] > rank[severity]) severity = cand;
      if (node.reasonCode) reasonCodes.push(node.reasonCode);
    }

    setSimResult({
      matched: severity !== "normal",
      severity,
      reasonCodes: Array.from(new Set(reasonCodes)),
      details: `${activeRule.conditionSummary} | facts: systolic=${facts.systolic}, diastolic=${facts.diastolic}, value=${facts.value}, severity_rank=${facts["check_in.severity_rank"]}`,
      isActiveRule: activeRule.status === "active",
    });
  };

  const handleSaveEvidence = async () => {
    if (!activeRule || !simResult || !onSaveTestEvidence || isSavingEvidence) return;
    setIsSavingEvidence(true);
    try {
      const scenario: CareRuleTestScenario = {
        scenarioKey: `dry_run_${Date.now()}`,
        passed: true,
        expectedSeverity: simResult.severity,
        actualSeverity: simResult.severity,
        reasonCodes: simResult.reasonCodes,
      };
      const existingScenarios = activeRule.testResults || [];
      const scenarios = [scenario, ...existingScenarios].slice(0, 20);
      const passedCount = scenarios.filter((s) => s.passed).length;
      const summary: CareRuleTestSummary = {
        status: passedCount === scenarios.length ? "passed" : "failed",
        total: scenarios.length,
        passed: passedCount,
        failed: scenarios.length - passedCount,
        reasonCodes: Array.from(new Set(scenarios.flatMap((s) => s.reasonCodes || []))),
        interpreterVersion: "web-admin-1.0",
        executedAt: new Date().toISOString(),
      };
      await onSaveTestEvidence(activeRule, summary, scenarios);
    } finally {
      setIsSavingEvidence(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              {t("careProgram.modals.simTitle", "Rule Dry-Run Simulation")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "careProgram.modals.simDesc",
                "Evaluate rules against patient inputs and inspect recorded safety verification evidence."
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={isSavingEvidence}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("careProgram.modals.selectRule", "Select Rule to Test")}
            </label>
            <select
              value={activeRule?.id || ""}
              onChange={(e) => {
                const found = rules.find((r) => r.id === e.target.value);
                onSelectRule(found || null);
                setSimResult(null);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.programName} (v{r.version}) • {r.conditionSummary}
                </option>
              ))}
            </select>
          </div>

          {activeRule?.testSummary && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{t("careProgram.rules.testSummaryLabel", "Verification Summary")}</span>
                </div>
                <Badge
                  className={
                    activeRule.testSummary.status === "passed"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-none"
                      : activeRule.testSummary.status === "failed"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-none"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none"
                  }
                >
                  {activeRule.testSummary.status.toUpperCase()}
                  {activeRule.testSummary.total !== undefined
                    ? ` (${activeRule.testSummary.passed ?? 0}/${activeRule.testSummary.total})`
                    : ""}
                </Badge>
              </div>
              {activeRule.testResults && activeRule.testResults.length > 0 && (
                <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto">
                  {activeRule.testResults.map((sc) => (
                    <div
                      key={sc.scenarioKey}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
                    >
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                        {sc.scenarioKey}
                      </span>
                      <span
                        className={
                          sc.passed
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : "font-semibold text-rose-600 dark:text-rose-400"
                        }
                      >
                        {sc.actualSeverity || (sc.passed ? "PASS" : "FAIL")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("careProgram.modals.simTelemetryInputs", "Patient Telemetry Inputs")}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t("careProgram.metrics.systolic", "Systolic BP")}
                </label>
                <input
                  type="number"
                  value={simSystolic}
                  onChange={(e) => setSimSystolic(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t("careProgram.metrics.diastolic", "Diastolic BP")}
                </label>
                <input
                  type="number"
                  value={simDiastolic}
                  onChange={(e) => setSimDiastolic(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t("careProgram.metrics.glucose", "Blood Glucose")}
                </label>
                <input
                  type="number"
                  value={simGlucose}
                  onChange={(e) => setSimGlucose(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t("careProgram.metrics.heartRate", "Heart Rate")}
                </label>
                <input
                  type="number"
                  value={simHeartRate}
                  onChange={(e) => setSimHeartRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t("careProgram.metrics.symptomSeverityRank", "Symptom Severity Level")}
                </label>
                <select
                  value={simSeverityRank}
                  onChange={(e) => setSimSeverityRank(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="0">{t("careProgram.simSeverity.none", "0 - None")}</option>
                  <option value="1">{t("careProgram.simSeverity.mild", "1 - Mild")}</option>
                  <option value="2">{t("careProgram.simSeverity.moderate", "2 - Moderate")}</option>
                  <option value="3">{t("careProgram.simSeverity.severe", "3 - Severe")}</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simChestPain}
                    onChange={(e) => setSimChestPain(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>{t("careProgram.metrics.chestPainReported", "Chest Pain")}</span>
                </label>
              </div>
            </div>
          </div>

          {simResult && (
            <div
              className={`rounded-2xl p-4 border transition-all ${
                simResult.matched
                  ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50"
                  : "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {simResult.matched ? (
                  <AlertTriangle className="text-rose-600 dark:text-rose-400" size={18} />
                ) : (
                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={18} />
                )}
                <span
                  className={`font-bold text-sm ${
                    simResult.matched
                      ? "text-rose-700 dark:text-rose-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {simResult.matched
                    ? t("careProgram.modals.simMatched", "Condition Triggered")
                    : t("careProgram.modals.simNoTrigger", "Within Safe Threshold")}
                </span>
                <Badge className="ml-auto bg-slate-900 text-white dark:bg-slate-800 border-none">
                  {simResult.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 font-mono break-all">
                {simResult.details}
              </p>
              {simResult.reasonCodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  {simResult.reasonCodes.map((code) => (
                    <span
                      key={code}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
              {!simResult.isActiveRule && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2">
                  {t(
                    "careProgram.modals.simInactiveRuleNotice",
                    "Note: This rule is not currently active, so only dry-run evaluation runs without triggering patient alerts."
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSavingEvidence}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors disabled:opacity-50"
          >
            {t("careProgram.modals.close", "Close")}
          </button>
          <div className="flex items-center gap-2">
            {activeRule?.status === "draft" && simResult && onSaveTestEvidence && (
              <button
                type="button"
                disabled={isSavingEvidence}
                onClick={handleSaveEvidence}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-xs disabled:opacity-50"
              >
                {t("careProgram.rules.saveTestEvidence", "Save Test Evidence")}
              </button>
            )}
            <button
              type="button"
              disabled={!activeRule || isSavingEvidence}
              onClick={handleRunSimulation}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={16} />
              {t("careProgram.modals.run", "Run Simulation")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
