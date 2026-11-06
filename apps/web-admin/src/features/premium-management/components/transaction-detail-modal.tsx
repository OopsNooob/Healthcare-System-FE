import { useTranslation } from "react-i18next";
import {
  X,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  FileCheck,
  Copy,
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "react-toastify";

export type PaymentOrderStatus =
  | "paid"
  | "pending"
  | "expired"
  | "cancelled"
  | "failed"
  | "refund_pending"
  | "refunded"
  | "Success"
  | "Pending"
  | "Failed"
  | "Refunded";

export interface Transaction {
  id: string;
  user: string;
  planCode?: "FREE" | "PLUS" | "CARE";
  planVersion?: string;
  planType: "monthly" | "yearly";
  amount: number; // Integer MoneyVnd (e.g. 99000, 299000)
  paymentGateway: "vnpay" | "momo" | "card";
  maskedReference: string;
  date: string;
  status: PaymentOrderStatus;
  hasInvoiceRequested: boolean;
  ipnVerifiedAt?: string;
  subscriptionGranted?: boolean;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onReconcile?: (orderId: string) => void;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  onReconcile,
}: TransactionDetailModalProps) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith("vi");

  if (!isOpen || !transaction) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("premiumManagement.toasts.copied", "Copied to clipboard!"));
  };

  const formattedAmount = `${transaction.amount.toLocaleString("vi-VN")} VND`;
  const normalizedStatus = transaction.status.toLowerCase();
  const isPaid = normalizedStatus === "paid" || normalizedStatus === "success";
  const isPending = normalizedStatus === "pending" || normalizedStatus === "refund_pending";
  const isRefunded = normalizedStatus === "refunded";
  const canReconcile =
    normalizedStatus === "pending" ||
    normalizedStatus === "failed" ||
    normalizedStatus === "expired";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="text-brand" size={22} />
              {t("premiumManagement.transactionModal.title", isVi ? "Chi tiết đơn hàng" : "Order Details")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "premiumManagement.transactionModal.desc",
                isVi
                  ? "Thông tin giao dịch, tiến trình xác thực thanh toán và kích hoạt quyền lợi gói"
                  : "Transaction details, payment verification timeline & subscription activation"
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-4 text-sm">
          {/* Amount Hero Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("premiumManagement.transactionModal.amount", isVi ? "Số tiền thanh toán" : "Amount")}
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                {formattedAmount}
              </h2>
              {transaction.planCode && (
                <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                  {transaction.planCode} • {transaction.planVersion || "v1.0"}
                </span>
              )}
            </div>
            <div>
              {isPaid ? (
                <Badge className="bg-emerald-600 text-white flex items-center gap-1.5 py-1 px-3 text-xs">
                  <CheckCircle2 size={14} />
                  {isVi ? "Đã thanh toán" : "Paid"}
                </Badge>
              ) : isPending ? (
                <Badge className="bg-amber-500 text-white flex items-center gap-1.5 py-1 px-3 text-xs">
                  <Clock size={14} />
                  {normalizedStatus === "refund_pending"
                    ? isVi
                      ? "Chờ hoàn tiền"
                      : "Refund Pending"
                    : isVi
                    ? "Đang chờ xác nhận"
                    : "Pending Verification"}
                </Badge>
              ) : isRefunded ? (
                <Badge className="bg-purple-600 text-white flex items-center gap-1.5 py-1 px-3 text-xs">
                  <AlertTriangle size={14} />
                  {isVi ? "Đã hoàn tiền" : "Refunded"}
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1.5 py-1 px-3 text-xs">
                  <XCircle size={14} />
                  {isVi ? "Thất bại" : "Failed"}
                </Badge>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 bg-white dark:bg-slate-950/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("premiumManagement.transactionModal.transactionId", "Order ID")}
              </span>
              <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                <span>{transaction.id}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(transaction.id)}
                  className="p-1 hover:text-brand transition-colors text-slate-400"
                  title={t("premiumManagement.transactionModal.copyId", "Copy ID")}
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("premiumManagement.transactionModal.customer", "Customer / User")}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {transaction.user}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("premiumManagement.transactionModal.plan", "Billing Cycle")}
              </span>
              <span className="font-semibold capitalize text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                {transaction.planType === "monthly"
                  ? t("premiumManagement.planTypes.monthly", "Monthly (30 days)")
                  : t("premiumManagement.planTypes.yearly", "Yearly (365 days)")}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("premiumManagement.transactionModal.paymentMethod", "Payment Gateway")}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="uppercase font-bold tracking-wide">
                  <CreditCard size={12} className="mr-1 text-brand" />
                  {transaction.paymentGateway}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("premiumManagement.transactionModal.referenceCode", "Gateway Reference")}
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                {transaction.maskedReference}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("premiumManagement.transactionModal.createdAt", "Created Time")}
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                {transaction.date}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileCheck size={14} className="text-brand" />
                {t("premiumManagement.transactionModal.invoiceStatus", "Electronic Invoice")}
              </span>
              {transaction.hasInvoiceRequested ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  {t("premiumManagement.transactionModal.invoiceRequested", "Requested")}
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  {t("premiumManagement.transactionModal.invoiceNotRequested", "Not requested")}
                </span>
              )}
            </div>
          </div>

          {/* IPN Timeline & Subscription Grant Panel */}
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                {isVi ? "Tiến trình xác thực thanh toán & Cấp gói" : "Payment Verification Timeline & Subscription"}
              </p>
              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                {isVi ? "Tự động đồng bộ" : "Auto-synced"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-500" />
                  {isVi ? "1. Khởi tạo đơn hàng" : "1. Checkout Created"}
                </span>
                <span className="font-mono text-slate-500">{transaction.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-blue-500" />
                  {isVi ? "2. Chuyển hướng từ cổng thanh toán" : "2. Gateway Return Redirect"}
                </span>
                <span className="text-slate-500">
                  {isVi ? "Chờ xác thực máy chủ" : "Awaiting server confirmation"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  {isPaid || isRefunded ? (
                    <CheckCircle size={13} className="text-emerald-500" />
                  ) : (
                    <Clock size={13} className="text-amber-500" />
                  )}
                  {isVi ? "3. Xác nhận thanh toán từ cổng VNPAY" : "3. VNPAY Payment Confirmed"}
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
                  {transaction.ipnVerifiedAt || (isPaid ? transaction.date : isVi ? "Đang chờ xác nhận" : "Awaiting confirmation")}
                </span>
              </div>
            </div>

            {/* SubscriptionGrantPanel */}
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isVi ? "Trạng thái quyền lợi gói:" : "Subscription Entitlement:"}
              </span>
              {isPaid ? (
                <Badge className="bg-emerald-600 text-white text-[11px]">
                  {isVi ? "Đã kích hoạt quyền lợi" : "Entitlement Granted"}
                </Badge>
              ) : isRefunded ? (
                <Badge className="bg-purple-600 text-white text-[11px]">
                  {isVi ? "Đã thu hồi do hoàn tiền" : "Revoked (Refunded)"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                  {isVi ? "Chờ xác nhận thanh toán" : "Pending Payment Verification"}
                </Badge>
              )}
            </div>
          </div>

          {/* Privacy & Contract Note */}
          <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/30 p-3 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
            <ShieldCheck size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <p>
              {isVi
                ? "Hệ thống tự động kích hoạt gói khi nhận phản hồi xác thực từ cổng thanh toán. Nếu phản hồi bị trễ, quản trị viên có thể nhấn Đối soát đơn hàng để đồng bộ trạng thái."
                : "Subscriptions are automatically activated upon gateway verification. If delayed, use Reconcile Order to synchronize payment status."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
          <div>
            {canReconcile && onReconcile && (
              <button
                type="button"
                onClick={() => onReconcile(transaction.id)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw size={14} />
                {isVi ? "Đối soát đơn hàng" : "Reconcile Order"}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            {t("premiumManagement.transactionModal.close", isVi ? "Đóng" : "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
