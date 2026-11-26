import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles } from "lucide-react";
import { showToast } from "@repo/ui/components/ui/toasts";
import type {
  CreatePlanDraftInput,
  PlanVersionRecord,
} from "../services/premium-management.service";

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan: PlanVersionRecord | null;
  onSave: (draftInput: CreatePlanDraftInput) => Promise<void>;
}

export function EditPlanModal({
  isOpen,
  onClose,
  initialPlan,
  onSave,
}: EditPlanModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(initialPlan?.code || "CARE");
  const [name, setName] = useState(initialPlan?.name || "");
  const [description, setDescription] = useState(initialPlan?.description || "");
  const [price, setPrice] = useState(String(initialPlan?.price ?? 299000));
  const [durationDays, setDurationDays] = useState(String(initialPlan?.durationDays ?? 30));
  const [aiRequestLimit, setAiRequestLimit] = useState(
    String(initialPlan?.aiRequestLimit ?? 500)
  );
  const [aiTokenLimit, setAiTokenLimit] = useState(
    String(initialPlan?.aiTokenLimit ?? 150000)
  );
  const [aiQuotaPeriod, setAiQuotaPeriod] = useState<"day" | "subscription_cycle">(
    initialPlan?.aiQuotaPeriod || "subscription_cycle"
  );
  const [consultationLimit, setConsultationLimit] = useState(
    String(initialPlan?.consultationLimitPerCycle ?? 3)
  );
  const [careProgramLimit, setCareProgramLimit] = useState(
    String(initialPlan?.activeCareProgramLimit ?? 5)
  );
  const [familyLinkLimit, setFamilyLinkLimit] = useState(
    String(initialPlan?.familyLinkLimit ?? 1)
  );
  const initialFeatures = Array.isArray(initialPlan?.benefits?.highlights)
    ? (initialPlan?.benefits?.highlights as unknown[]).map((f) => String(f))
    : [];
  const [featuresText, setFeaturesText] = useState(initialFeatures.join("\n"));
  const [refundWindowDays, setRefundWindowDays] = useState(
    String((initialPlan?.refundPolicy?.eligibleWithinDays as number) ?? 7)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(normalizedCode)) {
      showToast.warning(
        t(
          "premiumManagement.toasts.invalidCode",
          "Plan code must start with an uppercase letter (2-32 chars, A-Z, 0-9, _)."
        )
      );
      return;
    }
    if (!name.trim()) {
      showToast.warning(
        t("premiumManagement.toasts.planNameRequired", "Please enter a valid plan name.")
      );
      return;
    }

    const parsedPrice = Number(price);
    const parsedDays = Number(durationDays);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || !Number.isFinite(parsedDays) || parsedDays < 1) {
      showToast.warning(
        t("premiumManagement.toasts.invalidNumbers", "Please enter valid numeric price and duration.")
      );
      return;
    }

    const parsedFamilyLimit = Number(familyLinkLimit);
    if (
      familyLinkLimit.trim() === "" ||
      !Number.isInteger(parsedFamilyLimit) ||
      parsedFamilyLimit < 0 ||
      parsedFamilyLimit > 10
    ) {
      showToast.warning(
        t(
          "premiumManagement.toasts.invalidFamilyLimit",
          "Linked family members limit must be an integer between 0 and 10."
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const highlights = featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedRefundDays = parseInt(refundWindowDays, 10);
      const eligibleWithinDays = Number.isFinite(parsedRefundDays)
        ? Math.max(0, parsedRefundDays)
        : 7;

      await onSave({
        code: normalizedCode,
        name: name.trim(),
        description: description.trim() || undefined,
        price: Math.round(parsedPrice),
        currency: "VND",
        durationDays: Math.max(1, Math.min(366, Math.round(parsedDays))),
        aiRequestLimit: Math.max(0, parseInt(aiRequestLimit, 10) || 0),
        aiTokenLimit: Math.max(0, parseInt(aiTokenLimit, 10) || 0),
        aiQuotaPeriod,
        consultationLimitPerCycle: Math.max(0, parseInt(consultationLimit, 10) || 0),
        activeCareProgramLimit: Math.max(0, Math.min(100, parseInt(careProgramLimit, 10) || 0)),
        familyLinkLimit: parsedFamilyLimit,
        benefits: { ...(initialPlan?.benefits ?? {}), highlights },
        refundPolicy: {
          ...(initialPlan?.refundPolicy ?? {}),
          eligibleWithinDays,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="text-brand" size={20} />
              {initialPlan
                ? t("premiumManagement.editPlanModal.cloneTitle", "Create Next Draft Plan Version")
                : t("premiumManagement.editPlanModal.title", "Create Draft Plan Configuration")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "premiumManagement.editPlanModal.desc",
                "Configure pricing, cycle duration, and resource quotas for a new plan draft."
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.catalog.code", "Code")} *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CARE"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono uppercase outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.planName", "Plan Name")} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.price", "Price (VND)")} *
              </label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.durationDays", "Duration (days)")} *
              </label>
              <input
                type="number"
                min={1}
                max={366}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.quotaPeriod", "AI Quota Period")}
              </label>
              <select
                value={aiQuotaPeriod}
                onChange={(e) =>
                  setAiQuotaPeriod(e.target.value as "day" | "subscription_cycle")
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              >
                <option value="subscription_cycle">
                  {t("premiumManagement.editPlanModal.periodCycle", "Per Subscription Cycle")}
                </option>
                <option value="day">
                  {t("premiumManagement.editPlanModal.periodDay", "Per Day")}
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.aiRequests", "AI Requests")}
              </label>
              <input
                type="number"
                min={0}
                value={aiRequestLimit}
                onChange={(e) => setAiRequestLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.aiTokenLimit", "AI Token Quota")}
              </label>
              <input
                type="number"
                min={0}
                value={aiTokenLimit}
                onChange={(e) => setAiTokenLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.consultsLimit", "Consults Quota")}
              </label>
              <input
                type="number"
                min={0}
                value={consultationLimit}
                onChange={(e) => setConsultationLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5">
              <div className="flex items-start justify-between gap-2 text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                  {t("premiumManagement.catalog.carePrograms", "Care Programs")}
                </label>
                <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-400 dark:text-slate-500">
                  0–100
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={careProgramLimit}
                onChange={(e) => setCareProgramLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5">
              <div className="flex items-start justify-between gap-2 text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                  {t("premiumManagement.editPlanModal.familyLimit", "Linked Family Members")}
                </label>
                <span className="shrink-0 whitespace-nowrap tabular-nums text-slate-400 dark:text-slate-500">
                  0–10
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={10}
                value={familyLinkLimit}
                onChange={(e) => setFamilyLinkLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div className="flex h-full flex-col justify-between gap-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                {t("premiumManagement.editPlanModal.refundDays", "Refund Window (days)")}
              </label>
              <input
                type="number"
                min={0}
                value={refundWindowDays}
                onChange={(e) => setRefundWindowDays(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
              {t("premiumManagement.editPlanModal.description", "Description")}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("premiumManagement.editPlanModal.features", "Features (one per line)")}
            </label>
            <textarea
              rows={3}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand resize-none font-mono"
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
            {t("premiumManagement.editPlanModal.cancel", "Cancel")}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {t("premiumManagement.editPlanModal.createDraftBtn", "Create Draft Version")}
          </button>
        </div>
      </div>
    </div>
  );
}
