import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sliders, Activity, ClipboardCheck } from "lucide-react";
import { toast } from "react-toastify";
import type { CareTaskTemplateItem } from "../constants";

export interface CreateRuleData {
  program: string;
  sourceType: "health_metric" | "care_task_check_in";
  templateKey?: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: "Attention" | "Urgent";
  action: string;
}

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: {
    id: number;
    name: string;
    taskTemplates?: CareTaskTemplateItem[];
  }[];
  onAddRule: (rule: CreateRuleData) => Promise<void> | void;
}

export function AddRuleModal({
  isOpen,
  onClose,
  programs,
  onAddRule,
}: AddRuleModalProps) {
  const { t } = useTranslation();

  const [ruleProg, setRuleProg] = useState(
    programs[0]?.name || "Hypertension Management"
  );
  const [sourceType, setSourceType] = useState<
    "health_metric" | "care_task_check_in"
  >("health_metric");
  const [ruleMetric, setRuleMetric] = useState("Systolic");
  const [ruleOperator, setRuleOperator] = useState(">");
  const [ruleThreshold, setRuleThreshold] = useState("140");
  const [ruleSeverity, setRuleSeverity] = useState<"Attention" | "Urgent">(
    "Attention"
  );
  const [ruleAction, setRuleAction] = useState("Send Doctor Alert");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedProgramObj = programs.find((p) => p.name === ruleProg);
  const checkInTemplates = (selectedProgramObj?.taskTemplates || []).filter(
    (tpl) => tpl.type === "check_in"
  );
  const activeTemplateKey =
    checkInTemplates[0]?.key || "daily_symptom_check";

  const handleSourceTypeChange = (
    nextSource: "health_metric" | "care_task_check_in"
  ) => {
    setSourceType(nextSource);
    if (nextSource === "care_task_check_in") {
      setRuleMetric("SymptomSeverityRank");
      setRuleOperator(">=");
      setRuleThreshold("2");
    } else {
      setRuleMetric("Systolic");
      setRuleOperator(">");
      setRuleThreshold("140");
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const val = parseFloat(ruleThreshold);
    if (isNaN(val)) {
      toast.warning(
        t("careProgram.toasts.thresholdRequired", "Please enter a valid threshold")
      );
      return;
    }

    if (
      sourceType === "care_task_check_in" &&
      selectedProgramObj?.taskTemplates &&
      checkInTemplates.length === 0
    ) {
      toast.warning(
        t(
          "careProgram.toasts.checkInTaskRequiredForRule",
          "The selected program must include a daily symptom check-in task to use symptom rules."
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddRule({
        program: ruleProg,
        sourceType,
        templateKey:
          sourceType === "care_task_check_in" ? activeTemplateKey : undefined,
        metric: ruleMetric,
        operator: ruleOperator,
        threshold: val,
        severity: ruleSeverity,
        action: ruleAction,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t("careProgram.modals.ruleTitle", "Add Alert Rule")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "careProgram.modals.ruleDesc",
                "Configure automated clinical alert rules from vital signs or symptom check-ins."
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

        <div className="space-y-4 py-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("careProgram.modals.targetProgram", "Apply to Program")}
            </label>
            <select
              value={ruleProg}
              onChange={(e) => setRuleProg(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Data Source Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("careProgram.modals.dataSourceLabel", "Evaluation Data Source")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSourceTypeChange("health_metric")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  sourceType === "health_metric"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Activity size={15} />
                {t("careProgram.modals.sourceHealthMetric", "Vital Measurements")}
              </button>
              <button
                type="button"
                onClick={() => handleSourceTypeChange("care_task_check_in")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  sourceType === "care_task_check_in"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <ClipboardCheck size={15} />
                {t("careProgram.modals.sourceSymptomCheckIn", "Symptom Check-in")}
              </button>
            </div>
          </div>

          {/* Condition Section */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/50">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              {t("careProgram.modals.declarativeCondition", "Alert Condition")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("careProgram.modals.metric", "Target Field")}
                </label>
                {sourceType === "health_metric" ? (
                  <select
                    value={ruleMetric}
                    onChange={(e) => setRuleMetric(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Systolic">
                      {t("careProgram.metrics.systolic", "Systolic BP")}
                    </option>
                    <option value="Diastolic">
                      {t("careProgram.metrics.diastolic", "Diastolic BP")}
                    </option>
                    <option value="Glucose">
                      {t("careProgram.metrics.glucose", "Blood Glucose")}
                    </option>
                    <option value="HeartRate">
                      {t("careProgram.metrics.heartRate", "Heart Rate")}
                    </option>
                  </select>
                ) : (
                  <select
                    value={ruleMetric}
                    onChange={(e) => setRuleMetric(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="SymptomSeverityRank">
                      {t(
                        "careProgram.metrics.symptomSeverityRank",
                        "Symptom Severity Level"
                      )}
                    </option>
                    <option value="ChestPainReported">
                      {t("careProgram.metrics.chestPainReported", "Chest Pain")}
                    </option>
                    <option value="ShortnessOfBreathReported">
                      {t(
                        "careProgram.metrics.shortnessOfBreathReported",
                        "Shortness of Breath"
                      )}
                    </option>
                    <option value="DizzinessReported">
                      {t("careProgram.metrics.dizzinessReported", "Dizziness")}
                    </option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("careProgram.modals.operator", "Operator")}
                </label>
                <select
                  value={ruleOperator}
                  onChange={(e) => setRuleOperator(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value=">">
                    &gt; {t("careProgram.operators.greaterThan", "Greater than")}
                  </option>
                  <option value=">=">
                    &gt;= {t("careProgram.operators.greaterOrEqual", "Greater or equal")}
                  </option>
                  <option value="<">
                    &lt; {t("careProgram.operators.lessThan", "Less than")}
                  </option>
                  <option value="<=">
                    &lt;= {t("careProgram.operators.lessOrEqual", "Less or equal")}
                  </option>
                  <option value="==">
                    == {t("careProgram.operators.equals", "Equals")}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("careProgram.modals.threshold", "Threshold")}
                </label>
                <input
                  type="number"
                  value={ruleThreshold}
                  onChange={(e) => setRuleThreshold(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-3 p-2 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg text-xs font-mono text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
              <span>
                {t("careProgram.modals.conditionPreview", "Condition Preview")}:{" "}
                {ruleMetric} {ruleOperator} {ruleThreshold}
              </span>
              <Sliders size={14} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("careProgram.modals.severity", "Severity Level")}
              </label>
              <select
                value={ruleSeverity}
                onChange={(e) =>
                  setRuleSeverity(e.target.value as "Attention" | "Urgent")
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              >
                <option value="Attention">
                  {t("careProgram.modals.severityAttention", "Attention")}
                </option>
                <option value="Urgent">
                  {t("careProgram.modals.severityUrgent", "Urgent")}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("careProgram.modals.action", "Action")}
              </label>
              <select
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              >
                <option value="Send Doctor Alert">
                  {t("careProgram.modals.actionDoctorAlert", "Send Doctor Alert")}
                </option>
                <option value="Emergency Protocol">
                  {t(
                    "careProgram.modals.actionEmergency",
                    "Trigger Emergency Protocol"
                  )}
                </option>
                <option value="Task: Retest in 2 hours">
                  {t("careProgram.modals.actionPatientTask", "Assign Patient Task")}
                </option>
              </select>
            </div>
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
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {t("careProgram.modals.createRule", "Create Rule")}
          </button>
        </div>
      </div>
    </div>
  );
}
