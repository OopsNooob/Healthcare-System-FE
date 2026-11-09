import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Play, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { mockDelay } from "../constants";

export interface RuleItem {
  id: number;
  program: string;
  sourceType?: "health_metric" | "care_task_check_in";
  templateKey?: string;
  metric: string;
  operator: string;
  threshold: number;
  condition: string;
  severity: "Attention" | "Urgent";
  status: "active" | "retired" | "draft";
  action: string;
}

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RuleItem[];
  selectedRule: RuleItem | null;
  onSelectRule: (rule: RuleItem | null) => void;
}

export function SimulationModal({
  isOpen,
  onClose,
  rules,
  selectedRule,
  onSelectRule,
}: SimulationModalProps) {
  const { t } = useTranslation();

  const [simSystolic, setSimSystolic] = useState("145");
  const [simDiastolic, setSimDiastolic] = useState("95");
  const [simGlucose, setSimGlucose] = useState("110");
  const [simHeartRate, setSimHeartRate] = useState("78");
  const [simSeverityRank, setSimSeverityRank] = useState("2");
  const [simChestPain, setSimChestPain] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  const [simResult, setSimResult] = useState<{
    tested: boolean;
    matched: boolean;
    alertGenerated: boolean;
    details: string;
    action: string;
    severity: string;
  } | null>(null);

  if (!isOpen) return null;

  const activeRule = selectedRule || rules[0];

  const handleRunSimulation = async () => {
    if (!activeRule || isSimulating) return;
    setIsSimulating(true);
    try {
      await mockDelay(250);

      let testVal = 0;
      if (activeRule.metric === "Systolic") testVal = parseFloat(simSystolic);
      else if (activeRule.metric === "Diastolic") testVal = parseFloat(simDiastolic);
      else if (activeRule.metric === "Glucose") testVal = parseFloat(simGlucose);
      else if (activeRule.metric === "HeartRate") testVal = parseFloat(simHeartRate);
      else if (activeRule.metric === "SymptomSeverityRank")
        testVal = parseFloat(simSeverityRank);
      else if (
        activeRule.metric === "ChestPainReported" ||
        activeRule.metric === "ShortnessOfBreathReported" ||
        activeRule.metric === "DizzinessReported"
      )
        testVal = simChestPain ? 1 : 0;

      let matched = false;
      if (activeRule.operator === ">") matched = testVal > activeRule.threshold;
      else if (activeRule.operator === ">=") matched = testVal >= activeRule.threshold;
      else if (activeRule.operator === "<") matched = testVal < activeRule.threshold;
      else if (activeRule.operator === "<=") matched = testVal <= activeRule.threshold;
      else if (activeRule.operator === "==") matched = testVal === activeRule.threshold;

      const alertGenerated = matched && activeRule.status === "active";

      setSimResult({
        tested: true,
        matched,
        alertGenerated,
        details: `${activeRule.metric} = ${testVal} | ${activeRule.condition} => ${
          matched
            ? t("careProgram.modals.simViolated", "TRIGGERED")
            : t("careProgram.modals.simSafe", "SAFE")
        }`,
        action: activeRule.action,
        severity: activeRule.severity,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              {t("careProgram.modals.simTitle", "Rule Dry-Run Simulation")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "careProgram.modals.simDesc",
                "Test rules against synthetic patient telemetry before enabling in production."
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={isSimulating}
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
                const found = rules.find((r) => r.id === parseInt(e.target.value));
                onSelectRule(found || null);
                setSimResult(null);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.program} • {r.condition}
                </option>
              ))}
            </select>
          </div>

          {/* Synthetic telemetry & check-in inputs */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("careProgram.modals.simTelemetryInputs", "Synthetic Patient Inputs")}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
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
                <label className="block text-[11px] text-slate-500 mb-1">
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
                <label className="block text-[11px] text-slate-500 mb-1">
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
                <label className="block text-[11px] text-slate-500 mb-1">
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
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t(
                    "careProgram.metrics.symptomSeverityRank",
                    "Symptom Severity Level"
                  )}
                </label>
                <select
                  value={simSeverityRank}
                  onChange={(e) => setSimSeverityRank(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="0">{t("careProgram.simSeverity.none", "0 - None")}</option>
                  <option value="1">{t("careProgram.simSeverity.mild", "1 - Mild")}</option>
                  <option value="2">
                    {t("careProgram.simSeverity.moderate", "2 - Moderate")}
                  </option>
                  <option value="3">
                    {t("careProgram.simSeverity.severe", "3 - Severe")}
                  </option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300 py-1.5">
                  <input
                    type="checkbox"
                    checked={simChestPain}
                    onChange={(e) => setSimChestPain(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    {t(
                      "careProgram.modals.simWarningSymptomToggle",
                      "Patient reported warning symptom"
                    )}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Simulation Result */}
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
                  <AlertTriangle
                    className="text-rose-600 dark:text-rose-400"
                    size={18}
                  />
                ) : (
                  <CheckCircle2
                    className="text-emerald-600 dark:text-emerald-400"
                    size={18}
                  />
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
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 font-mono">
                {simResult.details}
              </p>
              {simResult.matched && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-rose-200/50 dark:border-rose-900/40">
                  <span className="font-semibold text-rose-800 dark:text-rose-300">
                    {t("careProgram.modals.actionFired", "Action Fired")}:
                  </span>
                  <span className="bg-white/80 dark:bg-slate-900 px-2 py-0.5 rounded font-medium text-slate-800 dark:text-slate-200">
                    {simResult.action}
                  </span>
                  <Badge className="bg-rose-500 text-white ml-auto">
                    {simResult.severity === "Urgent"
                      ? t("careProgram.modals.severityUrgent", "Urgent")
                      : t("careProgram.modals.severityAttention", "Attention")}
                  </Badge>
                  {!simResult.alertGenerated && (
                    <p className="w-full text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                      {t(
                        "careProgram.modals.simInactiveRuleNotice",
                        "Note: This rule is not currently active, so only an evaluation log is recorded without sending a live doctor alert."
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSimulating}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors disabled:opacity-50"
          >
            {t("careProgram.modals.close", "Close")}
          </button>
          <button
            type="button"
            disabled={isSimulating}
            onClick={handleRunSimulation}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={16} />
            {t("careProgram.modals.run", "Run Simulation")}
          </button>
        </div>
      </div>
    </div>
  );
}
