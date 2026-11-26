import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { showToast } from "@repo/ui/components/ui/toasts";
import {
  AlertTriangle,
  Archive,
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Database,
  Eye,
  Info,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentsGetEvidenceResponse } from "@/lib/api";
import { EditPlanModal } from "../components/edit-plan-modal";
import { PlanDetailModal } from "../components/plan-detail-modal";
import { TransactionDetailModal } from "../components/transaction-detail-modal";
import {
  getCashFlowDirection,
  premiumManagementService,
  type CreatePlanDraftInput,
  type PaymentOrderStatus,
  type PaymentTransactionRecord,
  type PlanVersionRecord,
} from "../services/premium-management.service";

type FlowFilter = "all" | "inflow" | "outflow" | "pending" | "failed";
type PlanFilter = "ALL" | "PLUS" | "CARE";

interface InspectedOrderEntry {
  orderId: string;
  evidence: PaymentsGetEvidenceResponse;
}

const PAGE_SIZE = 6;

const INITIAL_PAYMENT_RECORDS: PaymentTransactionRecord[] = [
  {
    id: "PAY1763612400A1B2",
    mongoOrderId: "",
    user: "Nguyễn Minh Anh",
    userEmail: "minhanh.nguyen@gmail.com",
    planCode: "CARE",
    planName: "Chronic Care Pro",
    planVersion: "v1",
    amount: 299000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "NCB",
    maskedReference: "VNP14692018",
    createdAt: "2026-11-20T09:15:00.000Z",
    paidAt: "2026-11-20T09:16:12.000Z",
    status: "paid",
    subscriptionGranted: true,
    grantPeriod: "30d",
    outboxStatus: "delivered",
  },
  {
    id: "PAY1763608800C3D4",
    user: "Trần Quốc Bảo",
    userEmail: "quocbao.tran@gmail.com",
    planCode: "PLUS",
    planName: "Plus Health",
    planVersion: "v1",
    amount: 99000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "VCB",
    maskedReference: "VNP14691744",
    createdAt: "2026-11-20T08:10:00.000Z",
    paidAt: "2026-11-20T08:11:04.000Z",
    status: "paid",
    subscriptionGranted: true,
    grantPeriod: "30d",
    outboxStatus: "delivered",
  },
  {
    id: "PAY1763599200E5F6",
    user: "Lê Thu Hà",
    userEmail: "thuha.le@gmail.com",
    planCode: "CARE",
    planName: "Chronic Care Pro",
    planVersion: "v1",
    amount: 299000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "TECHCOMBANK",
    maskedReference: "VNP14689412",
    createdAt: "2026-11-20T05:30:00.000Z",
    status: "pending",
    subscriptionGranted: false,
    outboxStatus: "pending",
  },
  {
    id: "PAY1763581200G7H8",
    user: "Phạm Hoàng Nam",
    userEmail: "hoangnam.pham@gmail.com",
    planCode: "PLUS",
    planName: "Plus Health",
    planVersion: "v1",
    amount: 99000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "MBBANK",
    maskedReference: "VNP14685009",
    createdAt: "2026-11-19T16:40:00.000Z",
    paidAt: "2026-11-19T16:41:22.000Z",
    status: "refund_pending",
    subscriptionGranted: true,
    grantPeriod: "30d",
    outboxStatus: "delivered",
    refundNoteKey: "premiumManagement.payments.toasts.refundReasonDefault",
  },
  {
    id: "PAY1763512000I9J0",
    user: "Võ Thị Lan Hương",
    userEmail: "lanhuong.vo@gmail.com",
    planCode: "CARE",
    planName: "Chronic Care Pro",
    planVersion: "v1",
    amount: 299000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "ACB",
    maskedReference: "VNP14671130",
    createdAt: "2026-11-19T10:20:00.000Z",
    paidAt: "2026-11-19T10:21:18.000Z",
    refundedAt: "2026-11-19T14:05:00.000Z",
    status: "refunded",
    subscriptionGranted: false,
    outboxStatus: "delivered",
    refundNote: "VCB-REF-20261119-0041",
  },
  {
    id: "PAY1763480000K1L2",
    user: "Đỗ Đình Khang",
    userEmail: "dinhkhang.do@gmail.com",
    planCode: "CARE",
    planName: "Chronic Care Pro",
    planVersion: "v1",
    amount: 299000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "BIDV",
    maskedReference: "VNP14664215",
    createdAt: "2026-11-18T19:05:00.000Z",
    paidAt: "2026-11-18T19:06:10.000Z",
    status: "paid",
    subscriptionGranted: true,
    grantPeriod: "30d",
    outboxStatus: "delivered",
  },
  {
    id: "PAY1763442000M3N4",
    user: "Hoàng Gia Huy",
    userEmail: "giahuy.hoang@gmail.com",
    planCode: "PLUS",
    planName: "Plus Health",
    planVersion: "v1",
    amount: 99000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "NCB",
    maskedReference: "VNP14658821",
    createdAt: "2026-11-18T13:45:00.000Z",
    status: "failed",
    subscriptionGranted: false,
    outboxStatus: "none",
  },
  {
    id: "PAY1763391000O5P6",
    user: "Bùi Thanh Thảo",
    userEmail: "thanhthao.bui@gmail.com",
    planCode: "CARE",
    planName: "Chronic Care Pro",
    planVersion: "v1",
    amount: 299000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "VIETINBANK",
    maskedReference: "VNP14650934",
    createdAt: "2026-11-18T07:50:00.000Z",
    paidAt: "2026-11-18T07:51:40.000Z",
    status: "paid",
    subscriptionGranted: true,
    grantPeriod: "30d",
    outboxStatus: "delivered",
  },
  {
    id: "PAY1763310000Q7R8",
    user: "Đặng Hữu Phước",
    userEmail: "huuphuoc.dang@gmail.com",
    planCode: "PLUS",
    planName: "Plus Health",
    planVersion: "v1",
    amount: 99000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "TPBANK",
    maskedReference: "VNP14641008",
    createdAt: "2026-11-17T15:12:00.000Z",
    status: "cancelled",
    subscriptionGranted: false,
    outboxStatus: "none",
  },
  {
    id: "PAY1763250000S9T0",
    user: "Vũ Ngọc Mai",
    userEmail: "ngocmai.vu@gmail.com",
    planCode: "PLUS",
    planName: "Plus Health",
    planVersion: "v1",
    amount: 99000,
    currency: "VND",
    paymentGateway: "vnpay",
    bankCode: "SACOMBANK",
    maskedReference: "VNP14630775",
    createdAt: "2026-11-17T08:25:00.000Z",
    paidAt: "2026-11-17T08:26:19.000Z",
    refundedAt: "2026-11-17T11:30:00.000Z",
    status: "refunded",
    subscriptionGranted: false,
    outboxStatus: "delivered",
    refundNote: "MB-REF-20261117-0192",
  },
];

export function PremiumManagement() {
  const { t } = useTranslation();
  const locale = t("common.dateLocale", "vi-VN");

  const [activeTab, setActiveTab] = useState<"payments" | "config">("payments");
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planVersions, setPlanVersions] = useState<PlanVersionRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);

  // Pull-to-refresh touch tracking
  const touchStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);

  // Plan Modals
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [cloneSourcePlan, setCloneSourcePlan] = useState<PlanVersionRecord | null>(
    null
  );
  const [selectedDetailPlan, setSelectedDetailPlan] =
    useState<PlanVersionRecord | null>(null);

  // Payment Management State
  const [payments, setPayments] = useState<PaymentTransactionRecord[]>(
    INITIAL_PAYMENT_RECORDS
  );
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentTransactionRecord | null>(null);

  // Quick Live Evidence Lookup Drawer inside Payments tab
  const [showLiveEvidenceBar, setShowLiveEvidenceBar] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [isSearchingEvidence, setIsSearchingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<InspectedOrderEntry | null>(
    null
  );

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
          : t("premiumManagement.errors.loadPlansFailed");
      setLoadError(message);
      showToast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const planTimer = window.setTimeout(() => {
      void loadPlans();
    }, 0);
    const paymentTimer = window.setTimeout(() => {
      setPaymentsLoading(false);
    }, 350);
    return () => {
      window.clearTimeout(planTimer);
      window.clearTimeout(paymentTimer);
    };
  }, [loadPlans]);

  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing || loading || paymentsLoading) return;
    setIsRefreshing(true);
    setPaymentsLoading(true);
    try {
      await loadPlans();
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      showToast.success(t("premiumManagement.payments.toasts.refreshed"));
    } finally {
      setPaymentsLoading(false);
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing, loading, paymentsLoading, loadPlans, t]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY <= 0 && !isRefreshing) {
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    } else {
      touchStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null || isRefreshing) return;
    const currentY = e.touches[0]?.clientY ?? touchStartYRef.current;
    const delta = currentY - touchStartYRef.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(delta, 92));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 60 && !isRefreshing) {
      void handleRefreshAll();
    } else {
      setPullDistance(0);
    }
    touchStartYRef.current = null;
  };

  // Plan Management Actions
  const handleDeployDefaults = async () => {
    if (busyId) return;
    setBusyId("deploy-defaults");
    try {
      await premiumManagementService.deployDefaults();
      showToast.success(t("premiumManagement.toasts.deployedSuccess"));
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("premiumManagement.errors.deployFailed")
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
        t("premiumManagement.toasts.versionPublished", {
          code: plan.code,
          version: plan.version,
        })
      );
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("premiumManagement.errors.publishFailed")
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
        t("premiumManagement.toasts.versionRetired", {
          code: plan.code,
          version: plan.version,
        })
      );
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("premiumManagement.errors.retireFailed")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateDraft = async (input: CreatePlanDraftInput) => {
    try {
      await premiumManagementService.createDraft(input);
      showToast.success(
        t("premiumManagement.toasts.draftCreated", { code: input.code })
      );
      setIsEditPlanOpen(false);
      setCloneSourcePlan(null);
      await loadPlans();
    } catch (err) {
      showToast.error(
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.createDraftFailed")
      );
    }
  };

  // Payment Actions (with single-click guards)
  const updatePaymentRecord = (
    orderId: string,
    updater: (item: PaymentTransactionRecord) => PaymentTransactionRecord
  ) => {
    setPayments((prev) =>
      prev.map((item) => (item.id === orderId ? updater(item) : item))
    );
    setSelectedPayment((prev) =>
      prev && prev.id === orderId ? updater(prev) : prev
    );
  };

  const handleReconcilePayment = async (orderId: string) => {
    if (busyPaymentId) return;
    setBusyPaymentId(orderId);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const nowIso = new Date().toISOString();
      updatePaymentRecord(orderId, (item) => ({
        ...item,
        status: "paid",
        paidAt: nowIso,
        subscriptionGranted: true,
        grantPeriod: item.grantPeriod || "30d",
        outboxStatus: "delivered",
      }));
      showToast.success(
        t("premiumManagement.payments.toasts.reconciled", { orderId })
      );
    } finally {
      setBusyPaymentId(null);
    }
  };

  const handleMarkRefundPending = async (orderId: string, note: string) => {
    if (busyPaymentId) return;
    setBusyPaymentId(orderId);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      updatePaymentRecord(orderId, (item) => ({
        ...item,
        status: "refund_pending",
        refundNote: note,
        refundNoteKey: undefined,
      }));
      showToast.info(
        t("premiumManagement.payments.toasts.markedRefundPending", { orderId })
      );
    } finally {
      setBusyPaymentId(null);
    }
  };

  const handleConfirmManualRefund = async (orderId: string, note: string) => {
    if (busyPaymentId) return;
    setBusyPaymentId(orderId);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const nowIso = new Date().toISOString();
      updatePaymentRecord(orderId, (item) => ({
        ...item,
        status: "refunded",
        refundedAt: nowIso,
        subscriptionGranted: false,
        refundNote: note,
        refundNoteKey: undefined,
      }));
      showToast.success(
        t("premiumManagement.payments.toasts.confirmedManualRefund", { orderId })
      );
    } finally {
      setBusyPaymentId(null);
    }
  };

  const handleInspectEvidence = async () => {
    const queryId = orderIdInput.trim();
    if (!queryId || isSearchingEvidence) return;
    setIsSearchingEvidence(true);
    setEvidenceError(null);
    try {
      const evidence = await premiumManagementService.getPaymentEvidence(queryId);
      setActiveEvidence({ orderId: queryId, evidence });
      showToast.success(
        t("premiumManagement.payments.toasts.evidenceLoaded", { orderId: queryId })
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.evidenceNotFound");
      setEvidenceError(msg);
      showToast.error(msg);
    } finally {
      setIsSearchingEvidence(false);
    }
  };

  // Computed Cash-Flow KPIs & Filter Counts
  const paymentMetrics = useMemo(() => {
    let inflowAmount = 0;
    let inflowCount = 0;
    let refundedAmount = 0;
    let refundedCount = 0;
    let refundPendingCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const item of payments) {
      if (item.status === "paid") {
        inflowAmount += item.amount;
        inflowCount += 1;
      } else if (item.status === "refunded") {
        refundedAmount += item.amount;
        refundedCount += 1;
      } else if (item.status === "refund_pending") {
        refundPendingCount += 1;
      } else if (item.status === "pending" || item.status === "processing") {
        pendingAmount += item.amount;
        pendingCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return {
      totalCount: payments.length,
      inflowAmount,
      inflowCount,
      refundedAmount,
      refundedCount,
      refundPendingCount,
      outflowCount: refundedCount + refundPendingCount,
      netFlowAmount: inflowAmount - refundedAmount,
      pendingAmount,
      pendingCount,
      failedCount,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return payments.filter((item) => {
      const flow = getCashFlowDirection(item.status);
      if (flowFilter === "inflow" && flow !== "inflow") return false;
      if (flowFilter === "outflow" && flow !== "outflow") return false;
      if (flowFilter === "pending" && flow !== "pending") return false;
      if (flowFilter === "failed" && flow !== "none") return false;
      if (planFilter !== "ALL" && item.planCode !== planFilter) return false;

      if (!needle) return true;
      return (
        item.id.toLowerCase().includes(needle) ||
        item.user.toLowerCase().includes(needle) ||
        item.userEmail.toLowerCase().includes(needle) ||
        item.maskedReference.toLowerCase().includes(needle) ||
        item.bankCode.toLowerCase().includes(needle)
      );
    });
  }, [payments, flowFilter, planFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, safePage]);

  const publishedPlans = planVersions.filter((p) => p.status === "published");
  const draftPlans = planVersions.filter((p) => p.status === "draft");

  const formatDateTime = (iso?: string) => {
    if (!iso) return "—";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleString(locale);
  };

  const renderOrderStatusBadge = (status: PaymentOrderStatus) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-600 text-white text-[11px] whitespace-nowrap">
            {t("premiumManagement.payments.status.paid")}
          </Badge>
        );
      case "refund_pending":
        return (
          <Badge className="bg-amber-500 text-white text-[11px] whitespace-nowrap">
            {t("premiumManagement.payments.status.refund_pending")}
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="bg-purple-600 text-white text-[11px] whitespace-nowrap">
            {t("premiumManagement.payments.status.refunded")}
          </Badge>
        );
      case "pending":
      case "processing":
        return (
          <Badge className="bg-sky-600 text-white text-[11px] whitespace-nowrap">
            {t(`premiumManagement.payments.status.${status}`)}
          </Badge>
        );
      case "expired":
      case "cancelled":
        return (
          <Badge variant="secondary" className="text-[11px] whitespace-nowrap">
            {t(`premiumManagement.payments.status.${status}`)}
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="text-[11px] whitespace-nowrap">
            {t("premiumManagement.payments.status.failed")}
          </Badge>
        );
    }
  };

  const renderCashFlowPill = (status: PaymentOrderStatus) => {
    const flow = getCashFlowDirection(status);
    if (flow === "inflow") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
          <ArrowDownLeft size={12} />
          {t("premiumManagement.payments.flow.inflow")}
        </span>
      );
    }
    if (flow === "outflow") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300 whitespace-nowrap">
          <ArrowUpRight size={12} />
          {t("premiumManagement.payments.flow.outflow")}
        </span>
      );
    }
    if (flow === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
          <Clock size={12} />
          {t("premiumManagement.payments.flow.pending")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
        <XCircle size={12} />
        {t("premiumManagement.payments.flow.none")}
      </span>
    );
  };

  return (
    <div
      className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh Indicator */}
      {(pullDistance > 12 || isRefreshing) && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand/10 dark:bg-brand/15 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all">
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>
            {isRefreshing
              ? t("premiumManagement.payments.pullToRefresh.refreshing")
              : pullDistance >= 60
                ? t("premiumManagement.payments.pullToRefresh.release")
                : t("premiumManagement.payments.pullToRefresh.pull")}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("premiumManagement.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("premiumManagement.subtitle")}
          </p>
        </div>
        <button
          type="button"
          disabled={loading || paymentsLoading || isRefreshing || Boolean(busyId)}
          onClick={() => void handleRefreshAll()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={loading || paymentsLoading || isRefreshing ? "animate-spin" : ""}
          />
          <span>{t("common.refresh")}</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      {activeTab === "payments" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {paymentsLoading ? (
            [1, 2, 3, 4].map((idx) => (
              <div
                key={`kpi-skel-${idx}`}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 space-y-3"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-3 w-44" />
              </div>
            ))
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("premiumManagement.payments.kpi.inflowTitle")}
                  </p>
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                    +{paymentMetrics.inflowAmount.toLocaleString(locale)} VND
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {t("premiumManagement.payments.kpi.inflowSub", {
                      count: paymentMetrics.inflowCount,
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("premiumManagement.payments.kpi.outflowTitle")}
                  </p>
                  <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">
                    -{paymentMetrics.refundedAmount.toLocaleString(locale)} VND
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {t("premiumManagement.payments.kpi.outflowSub", {
                      refunded: paymentMetrics.refundedCount,
                      pending: paymentMetrics.refundPendingCount,
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("premiumManagement.payments.kpi.netFlowTitle")}
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">
                    {paymentMetrics.netFlowAmount.toLocaleString(locale)} VND
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {t("premiumManagement.payments.kpi.netFlowSub")}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("premiumManagement.payments.kpi.pendingTitle")}
                  </p>
                  <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 truncate">
                    {paymentMetrics.pendingAmount.toLocaleString(locale)} VND
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {t("premiumManagement.payments.kpi.pendingSub", {
                      pending: paymentMetrics.pendingCount,
                      failed: paymentMetrics.failedCount,
                    })}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mr-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("premiumManagement.stats.publishedPlans")}
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
                {t("premiumManagement.stats.draftPlans")}
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
                {t("premiumManagement.payments.kpi.netFlowTitle")}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {paymentMetrics.netFlowAmount.toLocaleString(locale)} VND
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex space-x-6">
            <button
              type="button"
              className={`font-medium pb-4 border-b-2 -mb-4 transition-colors inline-flex items-center gap-2 ${
                activeTab === "payments"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("payments")}
            >
              <ArrowUpDown size={16} />
              <span>{t("premiumManagement.tabs.payments")}</span>
            </button>
            <button
              type="button"
              className={`font-medium pb-4 border-b-2 -mb-4 transition-colors inline-flex items-center gap-2 ${
                activeTab === "config"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("config")}
            >
              <CreditCard size={16} />
              <span>{t("premiumManagement.tabs.config")}</span>
            </button>
          </div>
        </div>

        {activeTab === "payments" ? (
          <div className="p-6 space-y-5">
            {/* Manual Refund & Evidence Notice Bar */}
            <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Info size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p>{t("premiumManagement.payments.manualRefundNotice")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveEvidenceBar((prev) => !prev)}
                className="shrink-0 self-start lg:self-center inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Receipt size={13} className="text-brand" />
                <span>
                  {showLiveEvidenceBar
                    ? t("premiumManagement.payments.liveEvidenceHide")
                    : t("premiumManagement.payments.liveEvidenceToggle")}
                </span>
              </button>
            </div>

            {/* Optional Quick Live Evidence API Lookup Drawer */}
            {showLiveEvidenceBar && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleInspectEvidence();
                  }}
                  className="flex flex-col sm:flex-row gap-2.5"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={orderIdInput}
                      onChange={(e) => setOrderIdInput(e.target.value)}
                      placeholder={t(
                        "premiumManagement.payments.modal.orderIdInputPlaceholder"
                      )}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs text-gray-800 dark:text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!orderIdInput.trim() || isSearchingEvidence}
                    className="px-4 py-2 rounded-xl bg-brand text-slate-900 font-bold text-xs hover:bg-brand/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 justify-center"
                  >
                    <Receipt size={14} />
                    <span>
                      {isSearchingEvidence
                        ? t("premiumManagement.payments.modal.checkingEvidence")
                        : t("premiumManagement.payments.modal.fetchLiveEvidence")}
                    </span>
                  </button>
                </form>

                {evidenceError && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300">
                    {evidenceError}
                  </div>
                )}

                {activeEvidence && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {t("premiumManagement.payments.modal.liveOrderLabel")}
                      </p>
                      <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1">
                        {activeEvidence.evidence.order.status} •{" "}
                        {activeEvidence.evidence.order.amount.toLocaleString(locale)}{" "}
                        {activeEvidence.evidence.order.currency}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {t("premiumManagement.payments.modal.liveTxLabel")}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">
                        {activeEvidence.evidence.transaction
                          ? `${activeEvidence.evidence.transaction.status} • ${activeEvidence.evidence.transaction.bankCode || "—"}`
                          : t("premiumManagement.payments.modal.noLiveTx")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {t("premiumManagement.payments.modal.liveOutboxLabel")}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">
                        {activeEvidence.evidence.outbox
                          ? `${activeEvidence.evidence.outbox.status} (${activeEvidence.evidence.outbox.attemptCount}/${activeEvidence.evidence.outbox.maxAttempts})`
                          : t("premiumManagement.payments.modal.noLiveOutbox")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {t("premiumManagement.payments.modal.liveGrantLabel")}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">
                        {activeEvidence.evidence.subscriptionGrant
                          ? `${activeEvidence.evidence.subscriptionGrant.status} • ${activeEvidence.evidence.subscriptionGrant.grantMode}`
                          : t("premiumManagement.payments.modal.noLiveGrant")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filter Pills + Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    {
                      key: "all",
                      label: t("premiumManagement.payments.filters.all", {
                        count: paymentMetrics.totalCount,
                      }),
                    },
                    {
                      key: "inflow",
                      label: t("premiumManagement.payments.filters.inflow", {
                        count: paymentMetrics.inflowCount,
                      }),
                    },
                    {
                      key: "outflow",
                      label: t("premiumManagement.payments.filters.outflow", {
                        count: paymentMetrics.outflowCount,
                      }),
                    },
                    {
                      key: "pending",
                      label: t("premiumManagement.payments.filters.pending", {
                        count: paymentMetrics.pendingCount,
                      }),
                    },
                    {
                      key: "failed",
                      label: t("premiumManagement.payments.filters.failed", {
                        count: paymentMetrics.failedCount,
                      }),
                    },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => {
                      setFlowFilter(pill.key);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      flowFilter === pill.key
                        ? "bg-brand text-slate-900 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value as PlanFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="ALL">
                    {t("premiumManagement.payments.filters.allPlans")}
                  </option>
                  <option value="CARE">CARE</option>
                  <option value="PLUS">PLUS</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t("premiumManagement.payments.searchPlaceholder")}
                    className="w-full sm:w-72 pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.orderCode")}
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.patient")}
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.plan")}
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.cashFlow")}
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.amount")}
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.gateway")}
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.time")}
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">
                        {t("premiumManagement.payments.table.status")}
                      </th>
                      <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                        {t("premiumManagement.payments.table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paymentsLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={`pay-skel-${idx}`}>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-36" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-5 w-24 rounded-full" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-28" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-5 w-20 rounded-full" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-6 w-24 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : paginatedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-14 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Database className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                              {t("premiumManagement.payments.table.noResults")}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {t("premiumManagement.payments.table.noResultsHint")}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setFlowFilter("all");
                                setPlanFilter("ALL");
                                setSearchQuery("");
                                setCurrentPage(1);
                              }}
                              className="mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {t("premiumManagement.payments.table.resetFilters")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedPayments.map((tx) => {
                        const flow = getCashFlowDirection(tx.status);
                        const isBusyRow = busyPaymentId === tx.id;
                        const canReconcile =
                          tx.status === "pending" ||
                          tx.status === "processing" ||
                          tx.status === "failed" ||
                          tx.status === "expired";

                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                                <span>{tx.id}</span>
                                <button
                                  type="button"
                                  title={t("premiumManagement.payments.modal.copyOrderCode")}
                                  onClick={() => {
                                    void navigator.clipboard?.writeText(tx.id);
                                    showToast.success(
                                      t("premiumManagement.payments.toasts.copied")
                                    );
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {tx.user}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {tx.userEmail}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                {tx.planCode} ({tx.planVersion})
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {renderCashFlowPill(tx.status)}
                            </td>
                            <td
                              className={`px-4 py-3.5 font-bold whitespace-nowrap ${
                                flow === "inflow"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : flow === "outflow"
                                    ? "text-purple-600 dark:text-purple-400"
                                    : "text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {flow === "inflow" ? "+" : flow === "outflow" ? "-" : ""}
                              {tx.amount.toLocaleString(locale)} {tx.currency}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                              <div>VNPAY • {tx.bankCode}</div>
                              <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                                {tx.maskedReference}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {formatDateTime(tx.refundedAt ?? tx.paidAt ?? tx.createdAt)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {renderOrderStatusBadge(tx.status)}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {canReconcile && (
                                  <button
                                    type="button"
                                    disabled={Boolean(busyPaymentId)}
                                    onClick={() => void handleReconcilePayment(tx.id)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <RefreshCw
                                      size={11}
                                      className={isBusyRow ? "animate-spin" : ""}
                                    />
                                    <span>
                                      {t("premiumManagement.payments.actions.reconcileNow")}
                                    </span>
                                  </button>
                                )}
                                {tx.status === "refund_pending" && (
                                  <button
                                    type="button"
                                    disabled={Boolean(busyPaymentId)}
                                    onClick={() =>
                                      void handleConfirmManualRefund(
                                        tx.id,
                                        tx.refundNote ||
                                          t("premiumManagement.payments.toasts.refundReasonDefault")
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <RotateCcw size={11} />
                                    <span>
                                      {t(
                                        "premiumManagement.payments.actions.confirmManualRefund"
                                      )}
                                    </span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedPayment(tx)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  <span>
                                    {t("premiumManagement.payments.actions.viewDetail")}
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {!paymentsLoading && filteredPayments.length > 0 && (
                <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span>
                    {t("premiumManagement.payments.table.showing", {
                      from: (safePage - 1) * PAGE_SIZE + 1,
                      to: Math.min(safePage * PAGE_SIZE, filteredPayments.length),
                      total: filteredPayments.length,
                    })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronLeft size={13} />
                      <span>{t("premiumManagement.payments.actions.prev")}</span>
                    </button>
                    <span className="px-2 font-mono font-semibold">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      <span>{t("premiumManagement.payments.actions.next")}</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
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
                  onClick={() => void loadPlans()}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                >
                  {t("common.retry")}
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {t("premiumManagement.catalog.title")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t("premiumManagement.catalog.subtitle")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => void handleDeployDefaults()}
                      className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors flex items-center gap-1.5 shadow-sm text-xs disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      <span>{t("premiumManagement.config.deployDefaults")}</span>
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
                      <span>{t("premiumManagement.config.newDraft")}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.code")}
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.version")}
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.priceVnd")}
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.aiQuota")}
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.consults")}
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.carePrograms")}
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.familyLinks")}
                        </th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">
                          {t("premiumManagement.catalog.status")}
                        </th>
                        <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                          {t("premiumManagement.catalog.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {planVersions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                            {t("premiumManagement.empty.noPlans")}
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
                                ? t("premiumManagement.editPlanModal.periodDay")
                                : t("premiumManagement.editPlanModal.periodCycle")}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {pv.consultationLimitPerCycle}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {pv.activeCareProgramLimit}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {pv.familyLinkLimit}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {pv.status === "published" ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] whitespace-nowrap">
                                  {t("premiumManagement.catalog.published")}
                                </Badge>
                              ) : pv.status === "draft" ? (
                                <Badge className="bg-amber-500 text-white text-[10px] whitespace-nowrap">
                                  {t("premiumManagement.catalog.draft")}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                                  {t("premiumManagement.catalog.retired")}
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
                                  <span>{t("premiumManagement.actions.viewDetails")}</span>
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
                                  <span>{t("premiumManagement.actions.clone")}</span>
                                </button>
                                {pv.status === "draft" && (
                                  <button
                                    type="button"
                                    disabled={busyId === `pub-${pv.id}`}
                                    onClick={() => void handlePublishPlanVersion(pv)}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <CheckCircle2 size={11} />
                                    <span>{t("premiumManagement.actions.publish")}</span>
                                  </button>
                                )}
                                {pv.status === "published" && pv.code !== "FREE" && (
                                  <button
                                    type="button"
                                    disabled={busyId === `retire-${pv.id}`}
                                    onClick={() => void handleRetirePlanVersion(pv)}
                                    className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium inline-flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Archive size={11} />
                                    <span>{t("premiumManagement.actions.retire")}</span>
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
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionDetailModal
        key={selectedPayment?.id ?? "closed-payment-modal"}
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        transaction={selectedPayment}
        busyActionId={busyPaymentId}
        onReconcile={handleReconcilePayment}
        onMarkRefundPending={handleMarkRefundPending}
        onConfirmManualRefund={handleConfirmManualRefund}
      />

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
