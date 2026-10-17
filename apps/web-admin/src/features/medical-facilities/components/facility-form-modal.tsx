import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Building2 } from "lucide-react";
import { toast } from "react-toastify";

export interface MedicalFacilityItem {
  id: number;
  name: string;
  address: string;
  specialty: string;
  status: "verified" | "pending" | "rejected";
  submittedBy: string;
  submittedDate: string;
  phone?: string;
  operatingHours?: string;
}

interface FacilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: MedicalFacilityItem | null;
  onSave: (data: Omit<MedicalFacilityItem, "id" | "status" | "submittedBy" | "submittedDate">) => void;
}

export function FacilityFormModal({
  isOpen,
  onClose,
  facility,
  onSave,
}: FacilityFormModalProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(facility?.name || "");
  const [address, setAddress] = useState(facility?.address || "");
  const [specialty, setSpecialty] = useState(facility?.specialty || "General");
  const [phone, setPhone] = useState(facility?.phone || "");
  const [operatingHours, setOperatingHours] = useState(
    facility?.operatingHours || "07:00 - 20:00 (Mon - Sun)"
  );

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.warning(
        t("medicalFacilities.toasts.nameRequired", "Please enter facility name")
      );
      return;
    }
    if (!address.trim()) {
      toast.warning(
        t("medicalFacilities.toasts.addressRequired", "Please enter facility address")
      );
      return;
    }

    onSave({
      name: name.trim(),
      address: address.trim(),
      specialty,
      phone: phone.trim() || undefined,
      operatingHours: operatingHours.trim() || undefined,
    });
  };

  const isEdit = !!facility;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="text-brand" size={22} />
              {isEdit
                ? t("medicalFacilities.formModal.editTitle", "Edit Medical Facility")
                : t("medicalFacilities.formModal.createTitle", "Add New Medical Facility")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "medicalFacilities.formModal.desc",
                "Configure facility name, address, specialty and contact details."
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

        {/* Body */}
        <div className="space-y-4 py-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.formModal.name", "Facility Name")} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("medicalFacilities.formModal.namePlaceholder", "e.g. Cho Ray Hospital")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.formModal.address", "Address")} *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t(
                "medicalFacilities.formModal.addressPlaceholder",
                "Street, ward, district, city..."
              )}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.specialty", "Specialty")}
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              >
                <option value="General">{t("medicalFacilities.specialties.general", "General")}</option>
                <option value="Cardiology">{t("medicalFacilities.specialties.cardiology", "Cardiology")}</option>
                <option value="Endocrinology">{t("medicalFacilities.specialties.endocrinology", "Endocrinology")}</option>
                <option value="Pediatrics">{t("medicalFacilities.specialties.pediatrics", "Pediatrics")}</option>
                <option value="Dermatology">{t("medicalFacilities.specialties.dermatology", "Dermatology")}</option>
                <option value="Emergency">{t("medicalFacilities.specialties.emergency", "Emergency 24/7")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("medicalFacilities.formModal.contactPhone", "Contact Hotline")}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("medicalFacilities.formModal.phonePlaceholder", "028 3822 xxxx")}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("medicalFacilities.formModal.operatingHours", "Operating Hours")}
            </label>
            <input
              type="text"
              value={operatingHours}
              onChange={(e) => setOperatingHours(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            {t("medicalFacilities.formModal.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-brand text-slate-900 font-bold hover:bg-brand/90 transition-colors shadow-sm"
          >
            {t("medicalFacilities.formModal.save", "Save Facility")}
          </button>
        </div>
      </div>
    </div>
  );
}
