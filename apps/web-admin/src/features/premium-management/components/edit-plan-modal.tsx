import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles } from "lucide-react";
import { toast } from "react-toastify";

export interface PlanConfig {
  name: string;
  price: string;
  billingCycle: string;
  aiLimit: string;
  consultsLimit: string;
  familyLimit: string;
  features: string[];
  isActive: boolean;
}

interface EditPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanConfig;
  onSave: (updatedPlan: PlanConfig) => void;
}

export function EditPlanModal({
  isOpen,
  onClose,
  plan,
  onSave,
}: EditPlanModalProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState<PlanConfig>(plan);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.warning(
        t(
          "premiumManagement.toasts.planNameRequired",
          "Please enter a valid plan name."
        )
      );
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="text-brand" size={20} />
              {t("premiumManagement.editPlanModal.title", "Edit Premium Plan Configuration")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("premiumManagement.editPlanModal.desc", "Update pricing, billing, and resource quotas.")}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("premiumManagement.editPlanModal.planName", "Plan Name")} *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("premiumManagement.editPlanModal.price", "Price")} *
              </label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("premiumManagement.editPlanModal.aiTokenLimit", "AI Token Quota")}
              </label>
              <input
                type="text"
                value={form.aiLimit}
                onChange={(e) => setForm({ ...form, aiLimit: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("premiumManagement.editPlanModal.consultsLimit", "Consults Quota")}
              </label>
              <input
                type="text"
                value={form.consultsLimit}
                onChange={(e) => setForm({ ...form, consultsLimit: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("premiumManagement.editPlanModal.familyLimit", "Family Quota")}
              </label>
              <input
                type="text"
                value={form.familyLimit}
                onChange={(e) => setForm({ ...form, familyLimit: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("premiumManagement.editPlanModal.features", "Features (one per line)")}
            </label>
            <textarea
              rows={4}
              value={form.features.join("\n")}
              onChange={(e) =>
                setForm({
                  ...form,
                  features: e.target.value.split("\n").filter((f) => f.trim() !== ""),
                })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("premiumManagement.editPlanModal.status", "Plan Status")}
            </span>
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                form.isActive
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {form.isActive
                ? t("premiumManagement.editPlanModal.active", "Active")
                : t("premiumManagement.editPlanModal.inactive", "Inactive")}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            {t("premiumManagement.editPlanModal.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm"
          >
            {t("premiumManagement.editPlanModal.save", "Save Changes")}
          </button>
        </div>
      </div>
    </div>
  );
}
