import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-toastify";

export interface RefundRequest {
  id: string;
  user: string;
  amount: string;
  requestedAt: string;
  reason: string;
  tokensUsed: number;
  tokensLimit: number;
  consultsUsed: number;
  consultsLimit: number;
  daysActive: number;
  isEligible: boolean;
  status: "pending" | "approved" | "rejected";
  adminOverride?: boolean;
  overrideReason?: string;
  adminNotes?: string;
}

interface RefundDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  refund: RefundRequest | null;
  onApprove: (refundId: string, overrideReason?: string, adminNotes?: string) => void;
  onReject: (refundId: string, adminNotes?: string) => void;
}

export function RefundDecisionModal({
  isOpen,
  onClose,
  refund,
  onApprove,
  onReject,
}: RefundDecisionModalProps) {
  const { t } = useTranslation();

  const [adminOverrideChecked, setAdminOverrideChecked] = useState(false);
  const [overrideReasonInput, setOverrideReasonInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState(refund?.adminNotes || "");

  if (!isOpen || !refund) return null;

  const handleApprove = () => {
    if (!refund.isEligible) {
      if (!adminOverrideChecked) {
        toast.error(
          t(
            "premiumManagement.toasts.overrideRequired",
            "Ineligible requests require checking Admin Override."
          )
        );
        return;
      }
      if (!overrideReasonInput.trim()) {
        toast.warning(
          t(
            "premiumManagement.toasts.reasonRequired",
            "Please provide an override reason for audit logging."
          )
        );
        return;
      }
    }

    onApprove(
      refund.id,
      adminOverrideChecked ? overrideReasonInput.trim() : undefined,
      adminNotesInput.trim() || undefined
    );
  };

  const handleReject = () => {
    onReject(refund.id, adminNotesInput.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="text-brand" size={20} />
              {t("premiumManagement.refundModal.title", "Review Refund Request")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {refund.id} • {refund.user} • {refund.amount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          {/* User stated reason */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-3.5 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              {t("premiumManagement.refundModal.reason", "User Reason")}
            </p>
            <p className="text-slate-800 dark:text-slate-200 text-xs italic">
              &quot;{refund.reason}&quot;
            </p>
          </div>

          {/* Usage Snapshot breakdown */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950/40">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
              <span>{t("premiumManagement.refundModal.usageSnapshot", "Final Usage Snapshot")}</span>
              {refund.isEligible ? (
                <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={14} />
                  {t("premiumManagement.refundModal.eligible", "Eligible")}
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1 font-semibold">
                  <AlertCircle size={14} />
                  {t("premiumManagement.refundModal.ineligible", "Ineligible")}
                </span>
              )}
            </p>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">
                  {t("premiumManagement.refundModal.aiTokensUsed", "AI Tokens")}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {refund.tokensUsed.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500">
                  {t("premiumManagement.refundModal.maxTokens", "Max: 5,000")}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">
                  {t("premiumManagement.refundModal.consultationsUsed", "Consults")}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {refund.consultsUsed}
                </p>
                <p className="text-[10px] text-slate-500">
                  {t("premiumManagement.refundModal.maxConsults", "Max: 0")}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">
                  {t("premiumManagement.refundModal.daysActive", "Days Enrolled")}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {t("premiumManagement.refundModal.daysCount", "{{days}} days", {
                    days: refund.daysActive,
                  })}
                </p>
                <p className="text-[10px] text-slate-500">
                  {t("premiumManagement.refundModal.maxDays", "Max: 7 days")}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Override Section if Ineligible */}
          {!refund.isEligible && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="text-amber-600 dark:text-amber-400" size={18} />
                <label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminOverrideChecked}
                    onChange={(e) => setAdminOverrideChecked(e.target.checked)}
                    className="rounded border-amber-300 text-brand focus:ring-brand h-4 w-4"
                  />
                  {t("premiumManagement.refundModal.adminOverride", "Admin Override Approval")}
                </label>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400/90 mb-3">
                {t(
                  "premiumManagement.refundModal.overrideNotice",
                  "Policy limits were exceeded. To approve this refund, an administrator override justification is mandatory for auditing purposes."
                )}
              </p>

              {adminOverrideChecked && (
                <div>
                  <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                    {t("premiumManagement.refundModal.overrideReason", "Override Justification")} *
                  </label>
                  <input
                    type="text"
                    value={overrideReasonInput}
                    onChange={(e) => setOverrideReasonInput(e.target.value)}
                    placeholder={t(
                      "premiumManagement.refundModal.overrideReasonPlaceholder",
                      "Approved exception by Clinical Supervisor..."
                    )}
                    className="w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              )}
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("premiumManagement.refundModal.adminNotes", "Admin Notes / Resolution Response")}
            </label>
            <textarea
              rows={2}
              value={adminNotesInput}
              onChange={(e) => setAdminNotesInput(e.target.value)}
              placeholder={t(
                "premiumManagement.refundModal.adminNotesPlaceholder",
                "Add notes for customer support or auditing..."
              )}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            {t("premiumManagement.refundModal.close", "Close")}
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold transition-colors"
          >
            {t("premiumManagement.refundModal.rejectBtn", "Reject Request")}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm"
          >
            {t("premiumManagement.refundModal.approveBtn", "Approve & Refund")}
          </button>
        </div>
      </div>
    </div>
  );
}
