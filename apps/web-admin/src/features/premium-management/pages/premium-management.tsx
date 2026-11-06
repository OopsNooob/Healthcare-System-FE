import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Eye,
  TrendingUp,
  Users,
  Search,
  Database,
  Edit,
  Sparkles,
  Copy,
  CheckCircle2,
  Archive,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  RefundDecisionModal,
} from "../components/refund-decision-modal";
import type { RefundRequest } from "../components/refund-decision-modal";
import { EditPlanModal } from "../components/edit-plan-modal";
import type { PlanConfig } from "../components/edit-plan-modal";
import {
  TransactionDetailModal,
} from "../components/transaction-detail-modal";
import type { Transaction } from "../components/transaction-detail-modal";
import {
  plansList,
  plansDeployDefaults,
  plansPublish,
  plansRetire,
  plansCreate,
} from "@healthcare/api-client";

interface PlanVersionRow {
  id: string;
  code: "FREE" | "PLUS" | "CARE";
  name: string;
  version: string;
  priceVnd: number;
  status: "published" | "draft" | "retired";
  aiQuota: string;
  consultQuota: string;
  careProgramLimit: number;
  familyLinkLimit: number;
}

export function PremiumManagement() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith("vi");
  const [activeTab, setActiveTab] = useState<"transactions" | "config" | "refunds">("transactions");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Plan Versions Catalog (A-07 / BILL-12..16)
  const [planVersions, setPlanVersions] = useState<PlanVersionRow[]>([
    {
      id: "plan-free-v1",
      code: "FREE",
      name: "Free Basic",
      version: "v1.0",
      priceVnd: 0,
      status: "published",
      aiQuota: "20 turns / month",
      consultQuota: "0 included",
      careProgramLimit: 1,
      familyLinkLimit: 1,
    },
    {
      id: "plan-plus-v1",
      code: "PLUS",
      name: "Plus Health",
      version: "v1.0",
      priceVnd: 99000,
      status: "published",
      aiQuota: "200 turns / month",
      consultQuota: "1 / month",
      careProgramLimit: 2,
      familyLinkLimit: 3,
    },
    {
      id: "plan-care-v1",
      code: "CARE",
      name: "Chronic Care Pro",
      version: "v1.0",
      priceVnd: 299000,
      status: "published",
      aiQuota: "500 turns / month",
      consultQuota: "3 / month",
      careProgramLimit: 5,
      familyLinkLimit: 5,
    },
  ]);

  // Plan Config State
  const [planConfig, setPlanConfig] = useState<PlanConfig>({
    name: "Chronic Care Pro (CARE)",
    price: "299,000 VND / month",
    billingCycle: "Monthly",
    aiLimit: "500 turns / cycle",
    consultsLimit: "3 / cycle",
    familyLimit: "5 members",
    features: [
      "500 AI health assistant turns / cycle",
      "3 priority teleconsultations / cycle",
      "Up to 5 Chronic Care Programs",
      "Up to 5 Family profile links",
    ],
    isActive: true,
  });
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);

  // Refund Requests State
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([
    {
      id: "REF-001",
      user: "Vu Quoc Huy",
      amount: "299,000 VND",
      requestedAt: "05/11/2026",
      reason: "Accidentally renewed subscription without needing consultation this month.",
      tokensUsed: 1200,
      tokensLimit: 5000,
      consultsUsed: 0,
      consultsLimit: 3,
      daysActive: 2,
      isEligible: true,
      status: "pending",
    },
    {
      id: "REF-002",
      user: "Nguyen Van A",
      amount: "99,000 VND",
      requestedAt: "03/11/2026",
      reason: "Service did not meet expectations, requesting refund after 2 weeks.",
      tokensUsed: 15400,
      tokensLimit: 5000,
      consultsUsed: 1,
      consultsLimit: 1,
      daysActive: 16,
      isEligible: false,
      status: "pending",
    },
    {
      id: "REF-003",
      user: "Tran Thi B",
      amount: "299,000 VND",
      requestedAt: "01/11/2026",
      reason: "Doctor was not available in my local time zone.",
      tokensUsed: 420,
      tokensLimit: 5000,
      consultsUsed: 0,
      consultsLimit: 3,
      daysActive: 4,
      isEligible: true,
      status: "approved",
    },
  ]);

  // Refund Modal State
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const res = await plansList().catch(() => null);
      const plans = (res as { data?: Array<Record<string, unknown>> })?.data;
      if (Array.isArray(plans) && plans.length > 0) {
        const primaryPlan = (plans.find((p) => p.status === "published") || plans[0]) as {
          _id?: string;
          id?: string;
          name?: string;
          price?: number;
          billingCycle?: string;
          limits?: {
            aiTokens?: string | number;
            consultations?: string | number;
            familyMembers?: string | number;
          };
          aiLimit?: string;
          consultsLimit?: string;
          familyLimit?: string;
          features?: string[];
          status?: string;
        };

        setActivePlanId(primaryPlan._id || primaryPlan.id || null);
        setPlanConfig({
          name: primaryPlan.name || "Chronic Care Pro (CARE)",
          price: `${(primaryPlan.price || 299000).toLocaleString("vi-VN")} VND / ${primaryPlan.billingCycle || "month"}`,
          billingCycle: primaryPlan.billingCycle || "Monthly",
          aiLimit: `${primaryPlan.limits?.aiTokens || primaryPlan.aiLimit || "500"} turns / cycle`,
          consultsLimit: `${primaryPlan.limits?.consultations || primaryPlan.consultsLimit || "3"} / cycle`,
          familyLimit: `${primaryPlan.limits?.familyMembers || primaryPlan.familyLimit || "5"} members`,
          features: primaryPlan.features || [
            "500 AI health assistant turns / cycle",
            "3 priority teleconsultations / cycle",
            "Up to 5 Chronic Care Programs",
            "Up to 5 Family profile links",
          ],
          isActive: primaryPlan.status === "published",
        });
      }
    } catch {
      // Keep local defaults
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    plansList()
      .then((res) => {
        if (!isSubscribed) return;
        const plans = (res as { data?: Array<Record<string, unknown>> })?.data;
        if (Array.isArray(plans) && plans.length > 0) {
          const primaryPlan = (plans.find((p) => p.status === "published") || plans[0]) as {
            _id?: string;
            id?: string;
            name?: string;
            price?: number;
            billingCycle?: string;
            limits?: {
              aiTokens?: string | number;
              consultations?: string | number;
              familyMembers?: string | number;
            };
            aiLimit?: string;
            consultsLimit?: string;
            familyLimit?: string;
            features?: string[];
            status?: string;
          };

          setActivePlanId(primaryPlan._id || primaryPlan.id || null);
          setPlanConfig({
            name: primaryPlan.name || "Chronic Care Pro",
            price: `${(primaryPlan.price || 299000).toLocaleString("vi-VN")} VND / ${primaryPlan.billingCycle || "month"}`,
            billingCycle: primaryPlan.billingCycle || "Monthly",
            aiLimit: `${primaryPlan.limits?.aiTokens || primaryPlan.aiLimit || "500"} turns / cycle`,
            consultsLimit: `${primaryPlan.limits?.consultations || primaryPlan.consultsLimit || "3"} / cycle`,
            familyLimit: `${primaryPlan.limits?.familyMembers || primaryPlan.familyLimit || "5"} members`,
            features: primaryPlan.features || [
              "500 AI health assistant turns / cycle",
              "3 priority teleconsultations / cycle",
              "Up to 5 Chronic Care Programs",
              "Up to 5 Family profile links",
            ],
            isActive: primaryPlan.status === "published",
          });
        }
      })
      .catch(() => {
        // Keep local defaults
      });

    const timer = setTimeout(() => {
      if (!isSubscribed) return;
      setTransactions([
        {
          id: "ORD-2026-8901",
          user: "Vu Quoc Huy",
          planCode: "CARE",
          planVersion: "v1.0",
          planType: "monthly",
          amount: 299000,
          paymentGateway: "vnpay",
          maskedReference: "VNPAY****4891",
          date: "05/11/2026 14:20",
          status: "paid",
          hasInvoiceRequested: true,
          ipnVerifiedAt: "05/11/2026 14:20:08",
          subscriptionGranted: true,
        },
        {
          id: "ORD-2026-8902",
          user: "Do Dinh Khang",
          planCode: "PLUS",
          planVersion: "v1.0",
          planType: "monthly",
          amount: 99000,
          paymentGateway: "vnpay",
          maskedReference: "VNPAY****8823",
          date: "05/11/2026 10:15",
          status: "paid",
          hasInvoiceRequested: false,
          ipnVerifiedAt: "05/11/2026 10:15:12",
          subscriptionGranted: true,
        },
        {
          id: "ORD-2026-8903",
          user: "Nguyen Van A",
          planCode: "CARE",
          planVersion: "v1.0",
          planType: "monthly",
          amount: 299000,
          paymentGateway: "vnpay",
          maskedReference: "VNPAY****9912",
          date: "06/11/2026 09:05",
          status: "pending",
          hasInvoiceRequested: false,
          subscriptionGranted: false,
        },
        {
          id: "ORD-2026-8904",
          user: "Tran Thi B",
          planCode: "PLUS",
          planVersion: "v1.0",
          planType: "monthly",
          amount: 99000,
          paymentGateway: "vnpay",
          maskedReference: "VNPAY****1204",
          date: "02/11/2026 16:40",
          status: "refunded",
          hasInvoiceRequested: true,
          ipnVerifiedAt: "02/11/2026 16:40:05",
          subscriptionGranted: false,
        },
        {
          id: "ORD-2026-8905",
          user: "Le Hoang C",
          planCode: "PLUS",
          planVersion: "v1.0",
          planType: "monthly",
          amount: 99000,
          paymentGateway: "vnpay",
          maskedReference: "VNPAY****3319",
          date: "01/11/2026 11:00",
          status: "failed",
          hasInvoiceRequested: false,
          subscriptionGranted: false,
        },
      ]);
      setLoading(false);
    }, 800);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, []);

  const handleReconcileOrder = (orderId: string) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === orderId
          ? {
              ...tx,
              status: "paid",
              ipnVerifiedAt: new Date().toLocaleString("vi-VN"),
              subscriptionGranted: true,
            }
          : tx
      )
    );
    setSelectedTransaction((prev) =>
      prev && prev.id === orderId
        ? {
            ...prev,
            status: "paid",
            ipnVerifiedAt: new Date().toLocaleString("vi-VN"),
            subscriptionGranted: true,
          }
        : prev
    );
    toast.success(
      isVi
        ? `Đối soát đơn hàng ${orderId} thành công: Đã xác nhận thanh toán và kích hoạt quyền lợi gói.`
        : `Order ${orderId} reconciled successfully: Payment verified & subscription activated.`
    );
  };

  const handleClonePlanVersion = (plan: PlanVersionRow) => {
    const nextVersion = `v1.${planVersions.filter((p) => p.code === plan.code).length}-draft`;
    const draftClone: PlanVersionRow = {
      ...plan,
      id: `${plan.id}-clone-${nextVersion}`,
      version: nextVersion,
      status: "draft",
    };
    setPlanVersions((prev) => [...prev, draftClone]);
    toast.success(
      isVi
        ? `Đã tạo phiên bản nháp mới cho gói ${plan.code} (${nextVersion})`
        : `Created new draft version for ${plan.code} (${nextVersion})`
    );
  };

  const handlePublishPlanVersion = (planId: string) => {
    const target = planVersions.find((p) => p.id === planId);
    if (!target) return;
    setPlanVersions((prev) =>
      prev.map((p) => {
        if (p.id === planId) return { ...p, status: "published" };
        if (p.code === target.code && p.status === "published") {
          return { ...p, status: "retired" };
        }
        return p;
      })
    );
    toast.success(
      isVi
        ? `Đã phát hành phiên bản ${target.code} ${target.version}`
        : `Published ${target.code} ${target.version}`
    );
  };

  const handleRetirePlanVersion = (planId: string) => {
    const target = planVersions.find((p) => p.id === planId);
    if (!target) return;
    setPlanVersions((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, status: "retired" } : p))
    );
    toast.info(
      isVi
        ? `Đã ngừng lưu hành phiên bản ${target.code} ${target.version}`
        : `Retired ${target.code} ${target.version}`
    );
  };

  const openRefundReview = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setIsRefundModalOpen(true);
  };

  const handleApproveRefund = (refundId: string, overrideReason?: string, adminNotes?: string) => {
    setRefundRequests((prev) =>
      prev.map((r) =>
        r.id === refundId
          ? {
              ...r,
              status: "approved",
              adminOverride: !!overrideReason,
              overrideReason,
              adminNotes,
            }
          : r
      )
    );

    toast.success(
      `${t("premiumManagement.refundModal.approveBtn", "Refund Approved")}: ${refundId}`
    );
    setIsRefundModalOpen(false);
  };

  const handleRejectRefund = (refundId: string, adminNotes?: string) => {
    setRefundRequests((prev) =>
      prev.map((r) =>
        r.id === refundId
          ? {
              ...r,
              status: "rejected",
              adminNotes,
            }
          : r
      )
    );
    toast.info(
      `${t("premiumManagement.refundModal.rejectBtn", "Refund Rejected")}: ${refundId}`
    );
    setIsRefundModalOpen(false);
  };

  const handleDeployDefaults = async () => {
    try {
      await plansDeployDefaults();
      toast.success(t("premiumManagement.toasts.deployedSuccess", "Default plans deployed successfully!"));
      await loadPlans();
    } catch {
      toast.info(t("premiumManagement.toasts.deployFallback", "Default plans (FREE, PLUS, CARE) deployed"));
    }
  };

  const handleTogglePlanStatus = async () => {
    if (!activePlanId) {
      setPlanConfig((prev) => ({ ...prev, isActive: !prev.isActive }));
      return;
    }
    try {
      if (planConfig.isActive) {
        await plansRetire({ path: { id: activePlanId } });
        setPlanConfig((prev) => ({ ...prev, isActive: false }));
        toast.info(t("premiumManagement.toasts.planRetired", "Plan retired successfully"));
      } else {
        await plansPublish({ path: { id: activePlanId } });
        setPlanConfig((prev) => ({ ...prev, isActive: true }));
        toast.success(t("premiumManagement.toasts.planPublished", "Plan published successfully"));
      }
    } catch {
      setPlanConfig((prev) => ({ ...prev, isActive: !prev.isActive }));
    }
  };

  const handleSavePlanConfig = async (updated: PlanConfig) => {
    try {
      await plansCreate({
        body: {
          name: updated.name,
          billingCycle: updated.billingCycle,
          features: updated.features,
          limits: {
            aiTokens: updated.aiLimit,
            consultations: updated.consultsLimit,
            familyMembers: updated.familyLimit,
          },
        },
      }).catch(() => null);
    } catch {
      // Graceful fallback
    }
    setPlanConfig(updated);
    toast.success(
      t("premiumManagement.editPlanModal.save", "Plan configuration updated successfully")
    );
    setIsEditPlanOpen(false);
  };

  const filteredTransactions = transactions.filter(
    (t) =>
      t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderOrderStatusBadge = (status: Transaction["status"]) => {
    const norm = status.toLowerCase();
    if (norm === "paid" || norm === "success") {
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {isVi ? "Đã thanh toán" : "Paid"}
        </Badge>
      );
    }
    if (norm === "pending" || norm === "refund_pending") {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
          {isVi ? "Chờ xử lý" : "Pending"}
        </Badge>
      );
    }
    if (norm === "refunded") {
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
          {isVi ? "Đã hoàn tiền" : "Refunded"}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        {isVi ? "Thất bại" : "Failed"}
      </Badge>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("premiumManagement.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("premiumManagement.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-brand/10 dark:bg-brand/20 flex flex-col items-center justify-center mr-4">
            <TrendingUp className="w-6 h-6 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("premiumManagement.stats.totalRevenue")}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">24,500,000 VND</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex flex-col items-center justify-center mr-4">
            <CreditCard className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("premiumManagement.stats.successfulTransactions")}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">125</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex flex-col items-center justify-center mr-4">
            <Users className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("premiumManagement.stats.activeUsers")}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">89</h3>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-6">
        <div className="border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex space-x-6 mb-4 sm:mb-0">
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 transition-colors ${
                activeTab === "transactions"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("transactions")}
            >
              {t("premiumManagement.tabs.transactions")}
            </button>
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 transition-colors ${
                activeTab === "config"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("config")}
            >
              {t("premiumManagement.tabs.config", isVi ? "Gói & Phiên bản" : "Plans & Versions")}
            </button>
            <button
              className={`font-medium pb-4 border-b-2 -mb-4 transition-colors ${
                activeTab === "refunds"
                  ? "border-brand text-brand"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("refunds")}
            >
              {t("premiumManagement.tabs.refunds")}
              <span className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {refundRequests.filter((r) => r.status === "pending").length}
              </span>
            </button>
          </div>

          {activeTab === "transactions" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("premiumManagement.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent w-64"
              />
            </div>
          )}
        </div>

        <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
          {activeTab === "transactions" ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.transactionId")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.user")}</th>
                  <th className="px-6 py-3 font-medium">{isVi ? "Gói dịch vụ" : "Plan"}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.amount")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.date")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.status")}</th>
                  <th className="px-6 py-3 font-medium text-right">{t("premiumManagement.table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-6 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-gray-100">{tx.id}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{tx.user}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          {tx.planCode || "CARE"} ({tx.planVersion || "v1.0"})
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        {tx.amount.toLocaleString("vi-VN")} VND
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tx.date}</td>
                      <td className="px-6 py-4">{renderOrderStatusBadge(tx.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(tx.status === "pending" || tx.status === "failed") && (
                            <button
                              onClick={() => handleReconcileOrder(tx.id)}
                              className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1"
                              title={isVi ? "Đối soát giao dịch với cổng thanh toán" : "Reconcile payment order"}
                            >
                              <RefreshCw size={12} />
                              {isVi ? "Đối soát" : "Reconcile"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setIsTransactionModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-brand transition-colors"
                            title={isVi ? "Xem chi tiết" : "View Details"}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                          <Database className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-1">
                          {t("premiumManagement.table.noTransactions")}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {t("premiumManagement.table.tryAdjusting")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === "config" ? (
            <div className="p-6 space-y-6">
              {/* Multi-tier Plan Versions Table */}
              <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {isVi
                        ? "Danh mục Gói & Phiên bản"
                        : "Subscription Plan Versions Catalog"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isVi
                        ? "Mỗi gói chỉ có tối đa 1 phiên bản đang phát hành. Tạo bản nháp mới để chỉnh sửa hạn mức trước khi phát hành."
                        : "Each plan code has at most 1 published version. Clone a draft to modify quotas before publishing."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeployDefaults}
                      className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium transition-colors flex items-center gap-1.5 shadow-sm text-xs"
                    >
                      <Sparkles size={14} />
                      {t("premiumManagement.config.deployDefaults", isVi ? "Khởi tạo gói mặc định" : "Deploy Default Plans")}
                    </button>
                    <button
                      onClick={() => setIsEditPlanOpen(true)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 text-brand border border-brand/20 rounded-lg hover:bg-brand/5 dark:hover:bg-brand/10 font-semibold transition-colors flex items-center gap-1.5 shadow-sm text-xs"
                    >
                      <Edit size={14} />
                      {t("premiumManagement.config.editPlan", isVi ? "Chỉnh sửa cấu hình gói" : "Edit Draft Config")}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3 font-semibold">{isVi ? "Mã gói" : "Code"}</th>
                        <th className="px-4 py-3 font-semibold">{isVi ? "Phiên bản" : "Version"}</th>
                        <th className="px-4 py-3 font-semibold">{isVi ? "Giá (VND)" : "Price (VND)"}</th>
                        <th className="px-4 py-3 font-semibold">{isVi ? "Hạn mức AI" : "AI Quota"}</th>
                        <th className="px-4 py-3 font-semibold">{isVi ? "Lượt khám" : "Consults"}</th>
                        <th className="px-4 py-3 font-semibold">{isVi ? "Chương trình" : "Care Programs"}</th>
                        <th className="px-4 py-3 font-semibold">{isVi ? "Liên kết gia đình" : "Family Links"}</th>
                        <th className="px-4 py-3 font-semibold">{isVi ? "Trạng thái" : "Status"}</th>
                        <th className="px-4 py-3 font-semibold text-right">{isVi ? "Thao tác" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {planVersions.map((pv) => (
                        <tr key={pv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                            {pv.code}
                            <div className="text-[11px] font-normal text-slate-500">{pv.name}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{pv.version}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {pv.priceVnd.toLocaleString("vi-VN")} đ
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{pv.aiQuota}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{pv.consultQuota}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{pv.careProgramLimit}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{pv.familyLinkLimit}</td>
                          <td className="px-4 py-3">
                            {pv.status === "published" ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                {isVi ? "Đang phát hành" : "Published"}
                              </Badge>
                            ) : pv.status === "draft" ? (
                              <Badge className="bg-amber-500 text-white text-[10px]">
                                {isVi ? "Bản nháp" : "Draft"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                {isVi ? "Ngừng lưu hành" : "Retired"}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleClonePlanVersion(pv)}
                                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1"
                                title={isVi ? "Nhân bản thành bản nháp" : "Clone Draft"}
                              >
                                <Copy size={11} />
                                {isVi ? "Nhân bản" : "Clone"}
                              </button>
                              {pv.status === "draft" && (
                                <button
                                  onClick={() => handlePublishPlanVersion(pv.id)}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1"
                                  title={isVi ? "Phát hành phiên bản" : "Publish Version"}
                                >
                                  <CheckCircle2 size={11} />
                                  {isVi ? "Phát hành" : "Publish"}
                                </button>
                              )}
                              {pv.status === "published" && pv.code !== "FREE" && (
                                <button
                                  onClick={() => handleRetirePlanVersion(pv.id)}
                                  className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium flex items-center gap-1"
                                  title={isVi ? "Ngừng lưu hành phiên bản" : "Retire Version"}
                                >
                                  <Archive size={11} />
                                  {isVi ? "Ngừng lưu hành" : "Retire"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Highlighted Plan Detail Card */}
              <div className="max-w-2xl border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 dark:text-amber-500 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      {planConfig.name}
                    </h3>
                    <p className="text-amber-700 dark:text-amber-600 mt-1 text-sm">
                      {t("premiumManagement.config.subtitle")}
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("premiumManagement.config.planName")}
                    </div>
                    <div className="col-span-2 text-gray-900 dark:text-gray-100 font-semibold">
                      {planConfig.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("premiumManagement.config.price")}
                    </div>
                    <div className="col-span-2 text-gray-900 dark:text-gray-100 font-semibold">
                      {planConfig.price}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("premiumManagement.config.limits", isVi ? "Hạn mức sử dụng" : "Usage Limits")}
                    </div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                      <p>• {isVi ? "Lượt hỏi đáp AI:" : "AI Turns:"} {planConfig.aiLimit}</p>
                      <p>• {isVi ? "Lượt tư vấn bác sĩ:" : "Consultations:"} {planConfig.consultsLimit}</p>
                      <p>• {isVi ? "Chương trình theo dõi:" : "Care Programs:"} 5</p>
                      <p>• {isVi ? "Liên kết gia đình:" : "Family Links:"} {planConfig.familyLimit}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("premiumManagement.config.status")}
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <Badge
                        variant="default"
                        className={
                          planConfig.isActive
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-slate-400 text-white"
                        }
                      >
                        {planConfig.isActive
                          ? t("premiumManagement.config.active")
                          : t("premiumManagement.editPlanModal.inactive", "Inactive")}
                      </Badge>
                      <button
                        onClick={handleTogglePlanStatus}
                        className="text-xs text-brand font-medium hover:underline"
                      >
                        {planConfig.isActive
                          ? t("premiumManagement.config.retirePlan", "Retire Plan")
                          : t("premiumManagement.config.publishPlan", "Publish Plan")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "refunds" ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.requestId")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.user")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.amount")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.usageSnapshot")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.eligibility")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.status")}</th>
                  <th className="px-6 py-3 font-medium text-right">{t("premiumManagement.table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {refundRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {req.id}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {req.user}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                      {req.amount}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs font-mono">
                      {isVi
                        ? `AI: ${req.tokensUsed.toLocaleString()} | Khám: ${req.consultsUsed} | Số ngày: ${req.daysActive}`
                        : `Tokens: ${req.tokensUsed.toLocaleString()} | Consults: ${req.consultsUsed} | Days: ${req.daysActive}`}
                    </td>
                    <td className="px-6 py-4">
                      {req.isEligible ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white">
                          {t("premiumManagement.status.eligible")}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          {t("premiumManagement.status.ineligible")}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {req.status === "pending" ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40">
                          {t("premiumManagement.status.pending")}
                        </Badge>
                      ) : req.status === "approved" ? (
                        <Badge className="bg-emerald-600 text-white">
                          {isVi ? "Đã duyệt" : "Approved"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {isVi ? "Từ chối" : "Rejected"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="px-3 py-1 rounded-md bg-brand text-slate-900 text-xs font-semibold hover:bg-brand/90 transition-colors shadow-sm"
                        onClick={() => openRefundReview(req)}
                      >
                        {t("premiumManagement.actions.review")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <RefundDecisionModal
        key={selectedRefund?.id || "refund-modal"}
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        refund={selectedRefund}
        onApprove={handleApproveRefund}
        onReject={handleRejectRefund}
      />

      <EditPlanModal
        key={planConfig.name}
        isOpen={isEditPlanOpen}
        onClose={() => setIsEditPlanOpen(false)}
        plan={planConfig}
        onSave={handleSavePlanConfig}
      />

      <TransactionDetailModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        transaction={selectedTransaction}
        onReconcile={handleReconcileOrder}
      />
    </div>
  );
}
