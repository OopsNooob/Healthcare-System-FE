import { useTranslation } from "react-i18next";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  X,
  CreditCard,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  Clock,
  Copy,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { PlanVersionRecord } from "../services/premium-management.service";

interface PlanDetailModalProps {
  plan: PlanVersionRecord | null;
  onClose: () => void;
  onClone?: (plan: PlanVersionRecord) => void;
}

export function PlanDetailModal({ plan, onClose, onClone }: PlanDetailModalProps) {
  const { t } = useTranslation();
  const locale = t("common.dateLocale", "vi-VN");

  if (!plan) return null;

  const benefits = plan.benefits ?? {};
  const refundPolicy = plan.refundPolicy ?? {};

  const weeklyAiSummary = Boolean(benefits.weeklyAiSummary);
  const doctorReview = Boolean(benefits.doctorReview);
  const summaryTokenBudget =
    typeof benefits.summaryTokenBudget === "number"
      ? benefits.summaryTokenBudget
      : null;
  const highlights = Array.isArray(benefits.highlights)
    ? benefits.highlights.map((item) => String(item)).filter(Boolean)
    : [];

  const refundTypeRaw =
    typeof refundPolicy.refundType === "string" ? refundPolicy.refundType : "";
  const refundTypeLabel =
    refundTypeRaw === "full_only"
      ? t("premiumManagement.detailModal.refundFullOnly", "Full Refund Only")
      : refundTypeRaw === "none"
        ? t("premiumManagement.detailModal.refundNone", "No Refund")
        : refundTypeRaw || "—";

  const refundDays =
    typeof refundPolicy.eligibleWithinDays === "number"
      ? refundPolicy.eligibleWithinDays
      : null;
  const policyVersion =
    typeof refundPolicy.version === "string" ? refundPolicy.version : null;

  const formatDateTime = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(locale);
  };

  const publishedAtText = formatDateTime(plan.publishedAt);
  const retiredAtText = formatDateTime(plan.retiredAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <CreditCard size={18} />
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {plan.name}
              </h3>
              <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                {plan.code} • v{plan.version}
              </span>
              {plan.status === "published" ? (
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  {t("premiumManagement.catalog.published", "Published")}
                </Badge>
              ) : plan.status === "draft" ? (
                <Badge className="bg-amber-500 text-white text-[10px]">
                  {t("premiumManagement.catalog.draft", "Draft")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  {t("premiumManagement.catalog.retired", "Retired")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                "premiumManagement.detailModal.subtitle",
                "Configuration, resource quotas, and refund policy for this plan version"
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 py-5 text-sm">
          {/* Description */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              {t("premiumManagement.detailModal.description", "Description")}
            </p>
            <p className="text-slate-700 dark:text-slate-200">
              {plan.description ||
                t("premiumManagement.detailModal.noDescription", "No description provided for this plan.")}
            </p>
          </div>

          {/* Pricing & Clinical Quotas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <CreditCard size={14} className="text-brand" />
                {t("premiumManagement.detailModal.pricingSection", "Pricing & Billing Cycle")}
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.price", "Price")}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {plan.price.toLocaleString(locale)} {plan.currency}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.durationDays", "Cycle Duration")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {t("premiumManagement.detailModal.daysValue", "{{count}} days", {
                    count: plan.durationDays,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.quotaPeriod", "AI Quota Period")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan.aiQuotaPeriod === "day"
                    ? t("premiumManagement.editPlanModal.periodDay", "Per Day")
                    : t("premiumManagement.editPlanModal.periodCycle", "Per Subscription Cycle")}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <Stethoscope size={14} className="text-emerald-500" />
                {t("premiumManagement.detailModal.quotasSection", "AI & Clinical Quotas")}
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.aiRequests", "AI Requests")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan.aiRequestLimit.toLocaleString(locale)}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.aiTokens", "AI Token Quota")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan.aiTokenLimit.toLocaleString(locale)}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.consultations", "Doctor Consultations / Cycle")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan.consultationLimitPerCycle}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.carePrograms", "Active Care Programs")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan.activeCareProgramLimit}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.familyLinks", "Family Companion Links")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan.familyLinkLimit}
                </span>
              </div>
            </div>
          </div>

          {/* Benefits & Refund Policy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <Sparkles size={14} className="text-amber-500" />
                {t("premiumManagement.detailModal.benefitsSection", "Included Benefits")}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.weeklyAiSummary", "Weekly AI Health Summary")}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                  {weeklyAiSummary ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {t("premiumManagement.detailModal.enabled", "Included")}
                    </>
                  ) : (
                    <>
                      <XCircle size={13} className="text-slate-400" />
                      {t("premiumManagement.detailModal.disabled", "Not included")}
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.doctorReview", "Doctor Review")}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                  {doctorReview ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {t("premiumManagement.detailModal.enabled", "Included")}
                    </>
                  ) : (
                    <>
                      <XCircle size={13} className="text-slate-400" />
                      {t("premiumManagement.detailModal.disabled", "Not included")}
                    </>
                  )}
                </span>
              </div>
              {summaryTokenBudget !== null && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("premiumManagement.detailModal.summaryTokenBudget", "Summary Token Budget")}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {summaryTokenBudget.toLocaleString(locale)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  {t("premiumManagement.detailModal.highlights", "Feature Highlights")}
                </p>
                {highlights.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                    {highlights.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">
                    {t("premiumManagement.detailModal.noHighlights", "No additional highlight items.")}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                <ShieldCheck size={14} className="text-indigo-500" />
                {t("premiumManagement.detailModal.refundSection", "Refund Policy")}
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("premiumManagement.detailModal.refundType", "Refund Type")}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {refundTypeLabel}
                </span>
              </div>
              {refundDays !== null && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("premiumManagement.detailModal.refundWindow", "Refund Window")}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {t("premiumManagement.detailModal.daysValue", "{{count}} days", {
                      count: refundDays,
                    })}
                  </span>
                </div>
              )}
              {policyVersion && (
                <div className="flex justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("premiumManagement.detailModal.policyVersion", "Policy Version")}
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {policyVersion}
                  </span>
                </div>
              )}

              {(publishedAtText || retiredAtText) && (
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    <Clock size={13} />
                    {t("premiumManagement.detailModal.lifecycleSection", "Version Lifecycle")}
                  </div>
                  {publishedAtText && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("premiumManagement.detailModal.publishedAt", "Published At")}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{publishedAtText}</span>
                    </div>
                  )}
                  {retiredAtText && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("premiumManagement.detailModal.retiredAt", "Retired At")}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{retiredAtText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          {onClone && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onClone(plan);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5"
            >
              <Copy size={13} />
              {t("premiumManagement.detailModal.cloneNewDraft", "Clone as New Draft")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-semibold text-xs hover:bg-brand/90"
          >
            {t("premiumManagement.detailModal.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

