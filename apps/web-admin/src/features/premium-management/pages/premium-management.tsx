import { useState, useEffect } from "react";
import {
  CreditCard,
  Eye,
  TrendingUp,
  Users,
  Search,
  Database,
  Edit,
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

export function PremiumManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"transactions" | "config" | "refunds">("transactions");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // Plan Config State
  const [planConfig, setPlanConfig] = useState<PlanConfig>({
    name: "Premium Care",
    price: "199,000 VND / month",
    billingCycle: "Monthly",
    aiLimit: "50,000 tokens / cycle",
    consultsLimit: "2 / cycle",
    familyLimit: "3 members",
    features: [
      "Unlimited AI health consultations",
      "Priority in doctor waiting queue",
      "Advanced health metrics insights",
      "Family profile sharing",
    ],
    isActive: true,
  });
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);

  // Refund Requests State
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([
    {
      id: "REF-001",
      user: "Vu Quoc Huy",
      amount: "199,000 VND",
      requestedAt: "Oct 16, 2026",
      reason: "Accidentally renewed subscription without needing consultation this month.",
      tokensUsed: 1200,
      tokensLimit: 5000,
      consultsUsed: 0,
      consultsLimit: 0,
      daysActive: 2,
      isEligible: true,
      status: "pending",
    },
    {
      id: "REF-002",
      user: "Nguyen Van A",
      amount: "199,000 VND",
      requestedAt: "Oct 14, 2026",
      reason: "Service did not meet expectations, requesting refund after 2 weeks.",
      tokensUsed: 15400,
      tokensLimit: 5000,
      consultsUsed: 1,
      consultsLimit: 0,
      daysActive: 16,
      isEligible: false,
      status: "pending",
    },
    {
      id: "REF-003",
      user: "Tran Thi B",
      amount: "199,000 VND",
      requestedAt: "Oct 11, 2026",
      reason: "Doctor was not available in my local time zone.",
      tokensUsed: 4200,
      tokensLimit: 5000,
      consultsUsed: 0,
      consultsLimit: 0,
      daysActive: 4,
      isEligible: true,
      status: "approved",
    },
  ]);

  // Refund Modal State
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTransactions([
        {
          id: "VN109283",
          user: "Vu Quoc Huy",
          planType: "monthly",
          amount: 199000,
          paymentGateway: "momo",
          maskedReference: "MOMO****4891",
          date: "Oct 15, 2026",
          status: "Success",
          hasInvoiceRequested: true,
        },
        {
          id: "VN109284",
          user: "Do Dinh Khang",
          planType: "yearly",
          amount: 1990000,
          paymentGateway: "vnpay",
          maskedReference: "VNPAY****8823",
          date: "Oct 15, 2026",
          status: "Success",
          hasInvoiceRequested: false,
        },
        {
          id: "VN109285",
          user: "Nguyen Van A",
          planType: "monthly",
          amount: 199000,
          paymentGateway: "card",
          maskedReference: "VISA****9912",
          date: "Oct 14, 2026",
          status: "Pending",
          hasInvoiceRequested: false,
        },
        {
          id: "VN109286",
          user: "Tran Thi B",
          planType: "monthly",
          amount: 199000,
          paymentGateway: "momo",
          maskedReference: "MOMO****1204",
          date: "Oct 12, 2026",
          status: "Failed",
          hasInvoiceRequested: true,
        },
      ]);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

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

  const handleSavePlanConfig = (updated: PlanConfig) => {
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
              {t("premiumManagement.tabs.config", "Plans Config")}
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

        <div className="p-0 overflow-x-auto max-h-[500px] overflow-y-auto">
          {activeTab === "transactions" ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.transactionId")}</th>
                  <th className="px-6 py-3 font-medium">{t("premiumManagement.table.user")}</th>
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
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-6 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{tx.id}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{tx.user}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        {tx.amount.toLocaleString("vi-VN")} VND
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tx.date}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            tx.status === "Success"
                              ? "default"
                              : tx.status === "Pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className={
                            tx.status === "Success"
                              ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                              : tx.status === "Pending"
                              ? "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                              : ""
                          }
                        >
                          {tx.status === "Success"
                            ? t("premiumManagement.status.success")
                            : tx.status === "Pending"
                            ? t("premiumManagement.status.pending")
                            : t("premiumManagement.status.failed")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedTransaction(tx);
                            setIsTransactionModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-brand transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
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
            <div className="p-6">
              <div className="max-w-2xl border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 dark:text-amber-500 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      {planConfig.name}
                    </h3>
                    <p className="text-amber-700 dark:text-amber-600 mt-1">
                      {t("premiumManagement.config.subtitle")}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditPlanOpen(true)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-brand border border-brand/20 rounded-lg hover:bg-brand/5 dark:hover:bg-brand/10 font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit size={16} />
                    {t("premiumManagement.config.editPlan")}
                  </button>
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
                      {t("premiumManagement.config.limits", "Limits & Quotas")}
                    </div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                      <p>• AI Tokens: {planConfig.aiLimit}</p>
                      <p>• Consultations: {planConfig.consultsLimit}</p>
                      <p>• Family Links: {planConfig.familyLimit}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("premiumManagement.config.features", "Features")}
                    </div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                      {planConfig.features.map((f, i) => (
                        <p key={i}>• {f}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">
                      {t("premiumManagement.config.status")}
                    </div>
                    <div className="col-span-2">
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
                      Tokens: {req.tokensUsed.toLocaleString()} | Consults: {req.consultsUsed} | Days: {req.daysActive}
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
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Rejected
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
      />
    </div>
  );
}
