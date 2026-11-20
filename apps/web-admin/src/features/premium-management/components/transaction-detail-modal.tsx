import { useState } from "react";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { showToast } from "@repo/ui/components/ui/toasts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Info,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentsGetEvidenceResponse } from "@/lib/api";
import {
  getCashFlowDirection,
  premiumManagementService,
  type PaymentOrderStatus,
  type PaymentTransactionRecord,
} from "../services/premium-management.service";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransactionRecord | null;
  busyActionId?: string | null;
  onReconcile: (orderId: string) => Promise<void>;
  onMarkRefundPending: (orderId: string, note: string) => Promise<void>;
  onConfirmManualRefund: (orderId: string, note: string) => Promise<void>;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction,
  busyActionId,
  onReconcile,
  onMarkRefundPending,
  onConfirmManualRefund,
}: TransactionDetailModalProps) {
  const { t } = useTranslation();
  const locale = t("common.dateLocale", "vi-VN");

  const [refundReason, setRefundReason] = useState(
    transaction?.refundNote ??
      (transaction?.refundNoteKey ? t(transaction.refundNoteKey) : "")
  );
  const [evidenceOrderId, setEvidenceOrderId] = useState(
    transaction?.mongoOrderId ?? ""
  );
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [liveEvidence, setLiveEvidence] =
    useState<PaymentsGetEvidenceResponse | null>(null);

  if (!isOpen || !transaction) return null;

  const flow = getCashFlowDirection(transaction.status);
  const isPaid = transaction.status === "paid";
  const isRefundPending = transaction.status === "refund_pending";
  const isRefunded = transaction.status === "refunded";
  const isPending =
    transaction.status === "pending" || transaction.status === "processing";
  const canReconcile =
    isPending ||
    transaction.status === "failed" ||
    transaction.status === "expired";

  const isRowBusy = Boolean(busyActionId && busyActionId === transaction.id);

  const formatDateTime = (iso?: string) => {
    if (!iso) return "—";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleString(locale);
  };

  const formattedAmount = `${flow === "outflow" ? "-" : flow === "inflow" ? "+" : ""}${transaction.amount.toLocaleString(locale)} ${transaction.currency}`;

  const handleCopyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast.success(t("premiumManagement.payments.toasts.copied"));
    } catch {
      showToast.info(value);
    }
  };

  const handleFetchLiveEvidence = async () => {
    const trimmed = evidenceOrderId.trim();
    if (!trimmed || isLoadingEvidence) return;
    setIsLoadingEvidence(true);
    setEvidenceError(null);
    try {
      const res = await premiumManagementService.getPaymentEvidence(trimmed);
      setLiveEvidence(res);
      showToast.success(
        t("premiumManagement.payments.toasts.evidenceLoaded", {
          orderId: trimmed,
        })
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("premiumManagement.errors.evidenceNotFound");
      setEvidenceError(message);
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  const resolvedNote =
    refundReason.trim() || t("premiumManagement.payments.toasts.refundReasonDefault");

  const renderStatusBadge = (status: PaymentOrderStatus) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-600 text-white gap-1">
            <CheckCircle2 size={12} />
            {t("premiumManagement.payments.status.paid")}
          </Badge>
        );
      case "refund_pending":
        return (
          <Badge className="bg-amber-500 text-white gap-1">
            <Clock size={12} />
            {t("premiumManagement.payments.status.refund_pending")}
          </Badge>
        );
      case "refunded":
        return (
          <Badge className="bg-purple-600 text-white gap-1">
            <RotateCcw size={12} />
            {t("premiumManagement.payments.status.refunded")}
          </Badge>
        );
      case "pending":
      case "processing":
        return (
          <Badge className="bg-sky-600 text-white gap-1">
            <Clock size={12} />
            {t(`premiumManagement.payments.status.${status}`)}
          </Badge>
        );
      case "expired":
      case "cancelled":
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle size={12} />
            {t(`premiumManagement.payments.status.${status}`)}
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle size={12} />
            {t("premiumManagement.payments.status.failed")}
          </Badge>
        );
    }
  };

  const renderFlowBadge = () => {
    if (flow === "inflow") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <ArrowDownLeft size={12} />
          {t("premiumManagement.payments.flow.inflow")}
        </span>
      );
    }
    if (flow === "outflow") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
          <ArrowUpRight size={12} />
          {t("premiumManagement.payments.flow.outflow")}
        </span>
      );
    }
    if (flow === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Clock size={12} />
          {t("premiumManagement.payments.flow.pending")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {t("premiumManagement.payments.flow.none")}
      </span>
    );
  };

  const existingSavedNote =
    transaction.refundNote ||
    (transaction.refundNoteKey ? t(transaction.refundNoteKey) : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="text-brand" size={20} />
              <span>{t("premiumManagement.payments.modal.title")}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("premiumManagement.payments.modal.subtitle")}
            </p>
          </div>
          <button
            type="button"
            disabled={isRowBusy}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 py-5 text-sm">
          {/* Amount & Flow Hero */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("premiumManagement.payments.table.amount")}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2
                  className={`text-2xl font-extrabold tracking-tight ${
                    flow === "inflow"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : flow === "outflow"
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {formattedAmount}
                </h2>
                {renderFlowBadge()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {transaction.planCode} • {transaction.planName} ({transaction.planVersion})
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              {renderStatusBadge(transaction.status)}
              <button
                type="button"
                onClick={() => void handleCopyCode(transaction.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-mono font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span>{transaction.id}</span>
                <Copy size={12} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1">
              <p className="text-slate-400 dark:text-slate-500 font-medium">
                {t("premiumManagement.payments.modal.patientInfo")}
              </p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {transaction.user}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {transaction.userEmail}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1">
              <p className="text-slate-400 dark:text-slate-500 font-medium">
                {t("premiumManagement.payments.modal.gatewayBank")}
              </p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CreditCard size={13} className="text-brand" />
                <span>
                  VNPAY • {transaction.bankCode || "—"}
                </span>
              </p>
              <p className="font-mono text-slate-500 dark:text-slate-400">
                {transaction.maskedReference || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1">
              <p className="text-slate-400 dark:text-slate-500 font-medium">
                {t("premiumManagement.payments.modal.createdAt")}
              </p>
              <p className="font-mono text-slate-800 dark:text-slate-200">
                {formatDateTime(transaction.createdAt)}
              </p>
              {transaction.paidAt && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                  {t("premiumManagement.payments.modal.paidAt")}:{" "}
                  {formatDateTime(transaction.paidAt)}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-1">
              <p className="text-slate-400 dark:text-slate-500 font-medium">
                {t("premiumManagement.payments.modal.grantStatus")}
              </p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {transaction.subscriptionGranted
                  ? t("premiumManagement.transactionModal.entitlementGranted")
                  : isRefunded
                    ? t("premiumManagement.transactionModal.entitlementRevoked")
                    : t("premiumManagement.transactionModal.entitlementPending")}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {transaction.grantPeriod || "—"} • Outbox: {transaction.outboxStatus}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-indigo-500" />
                <span>{t("premiumManagement.payments.modal.timelineTitle")}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">
                  {t("premiumManagement.payments.modal.stepCheckout")}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {formatDateTime(transaction.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">
                  {t("premiumManagement.payments.modal.stepReturn")}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  VNPAY ({transaction.bankCode || "—"})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-300">
                  {t("premiumManagement.payments.modal.stepIpn")}
                </span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {transaction.paidAt
                    ? formatDateTime(transaction.paidAt)
                    : t("premiumManagement.payments.modal.awaitingIpn")}
                </span>
              </div>
              {transaction.refundedAt && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-indigo-200/50 dark:border-indigo-900/40">
                  <span className="text-purple-700 dark:text-purple-300 font-medium">
                    {t("premiumManagement.payments.modal.refundedAt")}
                  </span>
                  <span className="font-mono font-semibold text-purple-700 dark:text-purple-300">
                    {formatDateTime(transaction.refundedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Manual Refund Tracking / Reconciliation Section */}
          {(isPaid || isRefundPending || isRefunded || canReconcile) && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 space-y-3 text-xs">
              {(isPaid || isRefundPending || isRefunded) && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <RotateCcw size={14} className="text-purple-500" />
                      <span>
                        {t("premiumManagement.payments.modal.manualRefundSection")}
                      </span>
                    </h4>
                  </div>

                  <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 p-2.5 flex items-start gap-2 text-amber-800 dark:text-amber-200">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <p>{t("premiumManagement.payments.manualRefundNotice")}</p>
                  </div>

                  {existingSavedNote && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {t("premiumManagement.payments.modal.currentRefundNote")}
                      </p>
                      <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                        {existingSavedNote}
                      </p>
                    </div>
                  )}

                  {(isPaid || isRefundPending) && (
                    <div className="space-y-2">
                      <label className="block font-medium text-slate-700 dark:text-slate-300">
                        {t("premiumManagement.payments.modal.refundReasonLabel")}
                      </label>
                      <textarea
                        rows={2}
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder={t(
                          "premiumManagement.payments.modal.refundReasonPlaceholder"
                        )}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {isPaid && (
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() =>
                              void onMarkRefundPending(transaction.id, resolvedNote)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                          >
                            <Clock size={13} />
                            <span>
                              {t("premiumManagement.payments.actions.markRefundPending")}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() =>
                            void onConfirmManualRefund(transaction.id, resolvedNote)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-2 font-semibold text-white transition-colors disabled:opacity-50"
                        >
                          <ArrowUpRight size={13} />
                          <span>
                            {t("premiumManagement.payments.actions.confirmManualRefund")}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {canReconcile && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    {t("premiumManagement.payments.modal.reconcileSection")}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400">
                    {t("premiumManagement.payments.modal.reconcileHint")}
                  </p>
                  <button
                    type="button"
                    disabled={isRowBusy}
                    onClick={() => void onReconcile(transaction.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 font-semibold text-white transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isRowBusy ? "animate-spin" : ""} />
                    <span>{t("premiumManagement.payments.actions.reconcileNow")}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Optional Live Backend Evidence Lookup */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 space-y-3 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Search size={14} className="text-brand" />
                <span>{t("premiumManagement.payments.modal.liveEvidenceSection")}</span>
              </h4>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {t("premiumManagement.payments.modal.liveEvidenceHint")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={evidenceOrderId}
                onChange={(e) => setEvidenceOrderId(e.target.value)}
                placeholder={t(
                  "premiumManagement.payments.modal.orderIdInputPlaceholder"
                )}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                disabled={!evidenceOrderId.trim() || isLoadingEvidence}
                onClick={() => void handleFetchLiveEvidence()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 font-bold text-slate-900 hover:bg-brand/90 transition-colors disabled:opacity-50"
              >
                <Receipt size={14} />
                <span>
                  {isLoadingEvidence
                    ? t("premiumManagement.payments.modal.checkingEvidence")
                    : t("premiumManagement.payments.modal.fetchLiveEvidence")}
                </span>
              </button>
            </div>

            {isLoadingEvidence && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            )}

            {evidenceError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-3 text-rose-700 dark:text-rose-300">
                {evidenceError}
              </div>
            )}

            {liveEvidence && !isLoadingEvidence && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {t("premiumManagement.payments.modal.liveOrderLabel")}
                  </p>
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {liveEvidence.order.status} •{" "}
                    {liveEvidence.order.amount.toLocaleString(locale)}{" "}
                    {liveEvidence.order.currency}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {t("premiumManagement.payments.modal.liveTxLabel")}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {liveEvidence.transaction
                      ? `${liveEvidence.transaction.status} • ${liveEvidence.transaction.bankCode || "—"} • ${liveEvidence.transaction.providerTransactionNo || "—"}`
                      : t("premiumManagement.payments.modal.noLiveTx")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {t("premiumManagement.payments.modal.liveOutboxLabel")}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {liveEvidence.outbox
                      ? `${liveEvidence.outbox.status} (${liveEvidence.outbox.attemptCount}/${liveEvidence.outbox.maxAttempts})`
                      : t("premiumManagement.payments.modal.noLiveOutbox")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {t("premiumManagement.payments.modal.liveGrantLabel")}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {liveEvidence.subscriptionGrant
                      ? `${liveEvidence.subscriptionGrant.status} • ${liveEvidence.subscriptionGrant.grantMode}`
                      : t("premiumManagement.payments.modal.noLiveGrant")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            {t("premiumManagement.payments.modal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

