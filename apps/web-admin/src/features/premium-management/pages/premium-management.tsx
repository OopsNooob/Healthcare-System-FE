import { useCallback, useEffect, useState } from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  CreditCard,
  Search,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Archive,
  Copy,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Receipt,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { showToast } from "@repo/ui/components/ui/toasts";
import type { PaymentsGetEvidenceResponse } from "@/lib/api";
import { EditPlanModal } from "../components/edit-plan-modal";
import { PlanDetailModal } from "../components/plan-detail-modal";
import {
  premiumManagementService,
  type CreatePlanDraftInput,
  type PlanVersionRecord,
} from "../services/premium-management.service";

interface InspectedOrderEntry {
  orderId: string;
  evidence: PaymentsGetEvidenceResponse;
  inspectedAt: string;
}

export function PremiumManagement() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

  const [activeTab, setActiveTab] = useState<"config" | "evidence">("config");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planVersions, setPlanVersions] = useState<PlanVersionRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [cloneSourcePlan, setCloneSourcePlan] = useState<PlanVersionRecord | null>(null);
  const [selectedDetailPlan, setSelectedDetailPlan] = useState<PlanVersionRecord | null>(null);

  const [orderIdInput, setOrderIdInput] = useState("");
  const [isSearchingEvidence, setIsSearchingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<InspectedOrderEntry | null>(null);
  const [evidenceHistory, setEvidenceHistory] = useState<InspectedOrderEntry[]>([]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const plans = await premiumManagementService.listPlans();
      setPlanVersions(plans);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.loadPlansFailed", "Failed to load subscription plans.");
      setLoadError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPlans]);

  const handleDeployDefaults = async () => {
    if (busyId) return;
    setBusyId("deploy-defaults");
    try {
      await premiumManagementService.deployDefaults();
      showToast.success(
        t("premiumManagement.toasts.deployedSuccess", "Default plans deployed successfully!")
      );
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.deployFailed", "Failed to deploy default plans.")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishPlanVersion = async (plan: PlanVersionRecord) => {
    if (busyId) return;
    setBusyId(`pub-${plan.id}`);
    try {
      await premiumManagementService.publishPlan(plan.id);
      showToast.success(
        t("premiumManagement.toasts.versionPublished", "Published {{code}} v{{version}}", {
          code: plan.code,
          version: plan.version,
        })
      );
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.publishFailed", "Failed to publish plan version.")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRetirePlanVersion = async (plan: PlanVersionRecord) => {
    if (busyId) return;
    setBusyId(`retire-${plan.id}`);
    try {
      await premiumManagementService.retirePlan(plan.id);
      showToast.info(
        t("premiumManagement.toasts.versionRetired", "Retired {{code}} v{{version}}", {
          code: plan.code,
          version: plan.version,
        })
      );
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.retireFailed", "Failed to retire plan version.")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateDraft = async (input: CreatePlanDraftInput) => {
    try {
      await premiumManagementService.createDraft(input);
      showToast.success(
        t("premiumManagement.toasts.draftCreated", "Created draft plan {{code}}", {
          code: input.code,
        })
      );
      setIsEditPlanOpen(false);
      setCloneSourcePlan(null);
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.createDraftFailed", "Failed to create plan draft.")
      );
    }
  };

  const handleInspectEvidence = async (targetOrderId?: string) => {
    const queryId = (targetOrderId ?? orderIdInput).trim();
    if (!queryId || isSearchingEvidence) return;
    setIsSearchingEvidence(true);
    setEvidenceError(null);
    try {
      const evidence = await premiumManagementService.getPaymentEvidence(queryId);
      const entry: InspectedOrderEntry = {
        orderId: queryId,
        evidence,
        inspectedAt: new Date().toLocaleTimeString(locale),
      };
      setActiveEvidence(entry);
      setEvidenceHistory((prev) => [
        entry,
        ...prev.filter((item) => item.orderId !== queryId).slice(0, 9),
      ]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.evidenceNotFound", "Payment order evidence not found.");
      setEvidenceError(msg);
      showToast.error(msg);
    } finally {
      setIsSearchingEvidence(false);
    }
  };

  const publishedPlans = planVersions.filter((p) => p.status === "published");
  const draftPlans = planVersions.filter((p) => p.status === "draft");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("premiumManagement.title", "Plans & Billing Operations")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t(
              "premiumManagement.subtitle",
              "Manage subscription tier versions and inspect verified payment evidence."
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={loading || Boolean(busyId)}
          onClick={loadPlans}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>{t("common.refresh", "Refresh")}</span>
        </button>
      </div>

      {/* Real Catalog Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mr-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("premiumManagement.stats.publishedPlans", "Published Plan Tiers")}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {publishedPlans.length}
            </h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center mr-4">
            <CreditCard className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("premiumManagement.stats.draftPlans", "Pending Draft Versions")}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {draftPlans.length}
            </h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center mr-4">
            <ShieldCheck className="w-6 h-6 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("premiumManagement.stats.inspectedOrders", "Inspected Payment Orders")}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {evidenceHistory.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex space-x-6">
            <button
              type="button"
              className={`font-medium pb-4 border-b-2 -mb-4 transition-colors ${
                activeTab === "config"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("config")}
            >
              {t("premiumManagement.tabs.config", "Subscription Plans")}
            </button>
            <button
              type="button"
              className={`font-medium pb-4 border-b-2 -mb-4 transition-colors ${
                activeTab === "evidence"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("evidence")}
            >
              {t("premiumManagement.tabs.evidence", "Payment Order Evidence")}
            </button>
          </div>
        </div>

        {activeTab === "config" ? (
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-8 text-center space-y-3">
                <AlertTriangle size={28} className="mx-auto text-rose-500" />
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                  {loadError}
                </p>
                <button
                  type="button"
                  onClick={loadPlans}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                >
                  {t("common.retry", "Retry")}
                </button>
              </div>
            ) : (
              <>
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {t("premiumManagement.catalog.title", "Versioned Plan Catalog")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t(
                          "premiumManagement.catalog.subtitle",
                          "Create drafts, publish active tiers, or retire superseded versions."
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={handleDeployDefaults}
                        className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors flex items-center gap-1.5 shadow-sm text-xs disabled:opacity-50"
                      >
                        <Sparkles size={14} />
                        {t("premiumManagement.config.deployDefaults", "Deploy Default Plans")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCloneSourcePlan(null);
                          setIsEditPlanOpen(true);
                        }}
                        className="px-3 py-2 bg-brand text-slate-900 rounded-lg hover:bg-brand/90 font-semibold transition-colors flex items-center gap-1.5 shadow-sm text-xs"
                      >
                        <Plus size={14} />
                        {t("premiumManagement.config.newDraft", "New Plan Draft")}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            {t("premiumManagement.catalog.code", "Code")}
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            {t("premiumManagement.catalog.version", "Version")}
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            {t("premiumManagement.catalog.priceVnd", "Price")}
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            {t("premiumManagement.catalog.aiQuota", "AI Quota")}
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            {t("premiumManagement.catalog.consults", "Consults")}
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            {t("premiumManagement.catalog.carePrograms", "Care Programs")}
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            {t("premiumManagement.catalog.status", "Status")}
                          </th>
                          <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                            {t("premiumManagement.catalog.actions", "Actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {planVersions.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                              {t(
                                "premiumManagement.empty.noPlans",
                                "No billing plans found yet. Deploy default plans or create a new draft."
                              )}
                            </td>
                          </tr>
                        ) : (
                          planVersions.map((pv) => (
                            <tr
                              key={pv.id}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                            >
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {pv.code}
                                <div className="text-[11px] font-normal text-slate-500">
                                  {pv.name}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                v{pv.version}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {pv.price.toLocaleString(locale)} {pv.currency}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {pv.aiRequestLimit.toLocaleString(locale)} /{" "}
                                {pv.aiQuotaPeriod === "day"
                                  ? t("premiumManagement.editPlanModal.periodDay", "Day")
                                  : t("premiumManagement.editPlanModal.periodCycle", "Cycle")}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {pv.consultationLimitPerCycle}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {pv.activeCareProgramLimit}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {pv.status === "published" ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px] whitespace-nowrap">
                                    {t("premiumManagement.catalog.published", "Published")}
                                  </Badge>
                                ) : pv.status === "draft" ? (
                                  <Badge className="bg-amber-500 text-white text-[10px] whitespace-nowrap">
                                    {t("premiumManagement.catalog.draft", "Draft")}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                                    {t("premiumManagement.catalog.retired", "Retired")}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDetailPlan(pv)}
                                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1"
                                  >
                                    <Eye size={11} />
                                    {t("premiumManagement.actions.viewDetails", "View Details")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCloneSourcePlan(pv);
                                      setIsEditPlanOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1"
                                  >
                                    <Copy size={11} />
                                    {t("premiumManagement.actions.clone", "Clone")}
                                  </button>
                                  {pv.status === "draft" && (
                                    <button
                                      type="button"
                                      disabled={busyId === `pub-${pv.id}`}
                                      onClick={() => handlePublishPlanVersion(pv)}
                                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium inline-flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <CheckCircle2 size={11} />
                                      {t("premiumManagement.actions.publish", "Publish")}
                                    </button>
                                  )}
                                  {pv.status === "published" && pv.code !== "FREE" && (
                                    <button
                                      type="button"
                                      disabled={busyId === `retire-${pv.id}`}
                                      onClick={() => handleRetirePlanVersion(pv)}
                                      className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium inline-flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <Archive size={11} />
                                      {t("premiumManagement.actions.retire", "Retire")}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleInspectEvidence();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder={t(
                    "premiumManagement.evidence.searchPlaceholder",
                    "Enter Payment Order ID to verify VNPAY IPN & subscription grant..."
                  )}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-sm text-gray-800 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <button
                type="submit"
                disabled={!orderIdInput.trim() || isSearchingEvidence}
                className="px-5 py-2.5 rounded-xl bg-brand text-slate-900 font-bold text-sm hover:bg-brand/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2 justify-center"
              >
                <Receipt size={16} />
                {isSearchingEvidence
                  ? t("common.loading", "Checking...")
                  : t("premiumManagement.evidence.inspectBtn", "Inspect Order Evidence")}
              </button>
            </form>

            {evidenceError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-300">
                {evidenceError}
              </div>
            )}

            {activeEvidence ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                  <h4 className="text-xs font-bold uppercase text-slate-500">
                    {t("premiumManagement.evidence.orderSection", "Payment Order")}
                  </h4>
                  <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {activeEvidence.evidence.order.id}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {activeEvidence.evidence.order.amount.toLocaleString(locale)}{" "}
                    {activeEvidence.evidence.order.currency} • {activeEvidence.evidence.order.status}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                  <h4 className="text-xs font-bold uppercase text-slate-500">
                    {t("premiumManagement.evidence.transactionSection", "Gateway & IPN")}
                  </h4>
                  {activeEvidence.evidence.transaction ? (
                    <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                      <p>
                        {activeEvidence.evidence.transaction.status} •{" "}
                        {activeEvidence.evidence.transaction.bankCode || "—"} •{" "}
                        {activeEvidence.evidence.transaction.responseCode || "—"}
                      </p>
                      <p className="font-mono">
                        {activeEvidence.evidence.transaction.providerTransactionNo || "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {t("premiumManagement.evidence.noTransaction", "No gateway transaction recorded yet.")}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                  <h4 className="text-xs font-bold uppercase text-slate-500">
                    {t("premiumManagement.evidence.outboxSection", "Outbox Dispatch")}
                  </h4>
                  {activeEvidence.evidence.outbox ? (
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {activeEvidence.evidence.outbox.status} ({activeEvidence.evidence.outbox.attemptCount}/
                      {activeEvidence.evidence.outbox.maxAttempts})
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {t("premiumManagement.evidence.noOutbox", "No outbox entry recorded.")}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                  <h4 className="text-xs font-bold uppercase text-slate-500">
                    {t("premiumManagement.evidence.grantSection", "Subscription Grant")}
                  </h4>
                  {activeEvidence.evidence.subscriptionGrant ? (
                    <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                      <p>
                        {activeEvidence.evidence.subscriptionGrant.status} •{" "}
                        {activeEvidence.evidence.subscriptionGrant.grantMode}
                      </p>
                      <p>
                        {new Date(activeEvidence.evidence.subscriptionGrant.startedAt).toLocaleDateString(
                          locale
                        )}{" "}
                        →{" "}
                        {new Date(activeEvidence.evidence.subscriptionGrant.expiresAt).toLocaleDateString(
                          locale
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {t("premiumManagement.evidence.noGrant", "No subscription grant created for this order.")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                {t(
                  "premiumManagement.evidence.emptyPrompt",
                  "Enter a patient payment order ID above to inspect real-time VNPAY IPN verification, outbox delivery, and subscription activation evidence."
                )}
              </div>
            )}

            {evidenceHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-500">
                  {t("premiumManagement.evidence.recentLookups", "Recent Lookups")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {evidenceHistory.map((item) => (
                    <button
                      key={item.orderId}
                      type="button"
                      onClick={() => {
                        setOrderIdInput(item.orderId);
                        setActiveEvidence(item);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {item.orderId} ({item.evidence.order.status})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <EditPlanModal
        key={cloneSourcePlan ? `${cloneSourcePlan.code}-${cloneSourcePlan.version}` : "new-draft"}
        isOpen={isEditPlanOpen}
        onClose={() => {
          setIsEditPlanOpen(false);
          setCloneSourcePlan(null);
        }}
        initialPlan={cloneSourcePlan}
        onSave={handleCreateDraft}
      />

      <PlanDetailModal
        plan={selectedDetailPlan}
        onClose={() => setSelectedDetailPlan(null)}
        onClone={(plan) => {
          setCloneSourcePlan(plan);
          setIsEditPlanOpen(true);
        }}
      />
    </div>
  );
}
