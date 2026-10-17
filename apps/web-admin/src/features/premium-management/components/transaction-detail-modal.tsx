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
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "react-toastify";

export interface Transaction {
  id: string;
  user: string;
  planType: "monthly" | "yearly";
  amount: number; // Integer MoneyVnd (e.g. 199000)
  paymentGateway: "momo" | "vnpay" | "card";
  maskedReference: string;
  date: string;
  status: "Success" | "Pending" | "Failed" | "Refunded";
  hasInvoiceRequested: boolean;
}

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
}: TransactionDetailModalProps) {
  const { t } = useTranslation();

  if (!isOpen || !transaction) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("premiumManagement.toasts.copied", "Copied to clipboard!"));
  };

  const formattedAmount = `${transaction.amount.toLocaleString("vi-VN")} VND`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="text-brand" size={22} />
              {t("premiumManagement.transactionModal.title", "Transaction Details")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "premiumManagement.transactionModal.desc",
                "Safe billing audit summary and payment gateway confirmation"
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
                {t("premiumManagement.transactionModal.amount", "Amount")}
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                {formattedAmount}
              </h2>
            </div>
            <div>
              {transaction.status === "Success" ? (
                <Badge className="bg-emerald-600 text-white flex items-center gap-1.5 py-1 px-3 text-xs">
                  <CheckCircle2 size={14} />
                  {t("premiumManagement.status.success", "Success")}
                </Badge>
              ) : transaction.status === "Pending" ? (
                <Badge className="bg-amber-500 text-white flex items-center gap-1.5 py-1 px-3 text-xs">
                  <Clock size={14} />
                  {t("premiumManagement.status.pending", "Pending")}
                </Badge>
              ) : transaction.status === "Refunded" ? (
                <Badge className="bg-purple-600 text-white flex items-center gap-1.5 py-1 px-3 text-xs">
                  <AlertTriangle size={14} />
                  {t("premiumManagement.status.refunded", "Refunded")}
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1.5 py-1 px-3 text-xs">
                  <AlertTriangle size={14} />
                  {t("premiumManagement.status.failed", "Failed")}
                </Badge>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 bg-white dark:bg-slate-950/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {t("premiumManagement.transactionModal.transactionId", "Transaction ID")}
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
                {t("premiumManagement.transactionModal.plan", "Plan Type")}
              </span>
              <span className="font-semibold capitalize text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                {transaction.planType === "monthly"
                  ? t("premiumManagement.planTypes.monthly", "Monthly Plan")
                  : t("premiumManagement.planTypes.yearly", "Yearly Plan")}
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
                {t("premiumManagement.transactionModal.createdAt", "Transaction Time")}
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

          {/* Privacy Note */}
          <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/30 p-3 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
            <ShieldCheck size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <p>
              {t(
                "premiumManagement.transactionModal.securityAuditNote",
                "In accordance with security standards, customer bank credentials and private tokens are masked. All transactions are logged with idempotent payment webhooks."
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            {t("premiumManagement.transactionModal.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
