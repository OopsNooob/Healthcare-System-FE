import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Archive,
  GitBranch,
  Edit,
  X,
} from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "react-toastify";
import { FacilityFormModal } from "../components/facility-form-modal";
import type { MedicalFacilityItem } from "../components/facility-form-modal";
import { FacilityDecisionModal } from "../components/facility-decision-modal";

interface DiseaseSpecialtyMappingItem {
  id: string;
  diseaseCode: string;
  diseaseNameVi: string;
  diseaseNameEn: string;
  specialtyCodes: string[];
  urgencyGuidanceVi: string;
  urgencyGuidanceEn: string;
  isActive: boolean;
  updatedAt: string;
}

export function MedicalFacilities() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith("vi");

  const [activeTab, setActiveTab] = useState<"facilities" | "mappings">("facilities");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [facilities, setFacilities] = useState<MedicalFacilityItem[]>([
    {
      id: 1,
      name: "Central Heart Hospital",
      address: "123 Health Ave, District 1, HCMC",
      specialty: "Cardiology",
      status: "verified",
      submittedBy: "API_Maps",
      submittedDate: "2026-10-12",
      lastCheckedAt: "2026-11-01",
      phone: "028 3822 1234",
      operatingHours: "24/7 Emergency",
    },
    {
      id: 2,
      name: "City Care Clinic",
      address: "45 Wellness Blvd, District 3, HCMC",
      specialty: "General",
      status: "pending",
      submittedBy: "User_Suggest",
      submittedDate: "2026-11-04",
      lastCheckedAt: "2026-11-04",
      phone: "028 3930 5678",
      operatingHours: "07:30 - 19:30",
    },
    {
      id: 3,
      name: "Endocrinology Center",
      address: "78 Sugar Free St, District 5, HCMC",
      specialty: "Endocrinology",
      status: "rejected",
      submittedBy: "User_Suggest",
      submittedDate: "2026-10-20",
      lastCheckedAt: "2026-10-20",
      phone: "028 3855 9012",
      operatingHours: "08:00 - 17:00",
    },
  ]);

  // Disease-Specialty Mappings (FAC-05, FAC-07, FAC-10, FAC-11)
  const [mappings, setMappings] = useState<DiseaseSpecialtyMappingItem[]>([
    {
      id: "MAP-001",
      diseaseCode: "I10_HYPERTENSION",
      diseaseNameVi: "Tăng huyết áp nguyên phát",
      diseaseNameEn: "Essential Hypertension",
      specialtyCodes: ["Cardiology", "General"],
      urgencyGuidanceVi: "Ưu tiên khám Tim mạch định kỳ hoặc Cấp cứu nếu HA >= 180/120 mmHg",
      urgencyGuidanceEn: "Schedule Cardiology visit or Emergency if BP >= 180/120 mmHg",
      isActive: true,
      updatedAt: "2026-11-02",
    },
    {
      id: "MAP-002",
      diseaseCode: "E11_DIABETES_T2",
      diseaseNameVi: "Đái tháo đường tuýp 2",
      diseaseNameEn: "Type 2 Diabetes Mellitus",
      specialtyCodes: ["Endocrinology", "General"],
      urgencyGuidanceVi: "Khám Nội tiết định kỳ mỗi 3 tháng và kiểm tra HbA1c",
      urgencyGuidanceEn: "Visit Endocrinology every 3 months and monitor HbA1c",
      isActive: true,
      updatedAt: "2026-11-01",
    },
    {
      id: "MAP-003",
      diseaseCode: "J45_ASTHMA",
      diseaseNameVi: "Hen phế quản mạn tính",
      diseaseNameEn: "Chronic Bronchial Asthma",
      specialtyCodes: ["General", "Emergency"],
      urgencyGuidanceVi: "Đến cơ sở có Cấp cứu 24/7 nếu khó thở cấp hoặc SpO2 < 92%",
      urgencyGuidanceEn: "Visit 24/7 Emergency facility if acute dyspnea or SpO2 < 92%",
      isActive: true,
      updatedAt: "2026-10-28",
    },
  ]);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<MedicalFacilityItem | null>(null);

  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [decisionFacility, setDecisionFacility] = useState<MedicalFacilityItem | null>(null);
  const [decisionMode, setDecisionMode] = useState<"verify" | "reject">("verify");

  // Mapping Modal State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<DiseaseSpecialtyMappingItem | null>(null);
  const [mapCode, setMapCode] = useState("");
  const [mapNameVi, setMapNameVi] = useState("");
  const [mapNameEn, setMapNameEn] = useState("");
  const [mapSpecialties, setMapSpecialties] = useState("Cardiology, General");
  const [mapGuidanceVi, setMapGuidanceVi] = useState("");
  const [mapGuidanceEn, setMapGuidanceEn] = useState("");

  const filteredFacilities = facilities.filter((fac) => {
    const matchSearch =
      fac.name.toLowerCase().includes(search.toLowerCase()) ||
      fac.address.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || fac.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingFacility(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (fac: MedicalFacilityItem) => {
    setEditingFacility(fac);
    setIsFormOpen(true);
  };

  const handleOpenDecision = (fac: MedicalFacilityItem, mode: "verify" | "reject") => {
    setDecisionFacility(fac);
    setDecisionMode(mode);
    setIsDecisionOpen(true);
  };

  const handleRetireFacility = (fac: MedicalFacilityItem) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === fac.id ? { ...f, status: "retired" } : f))
    );
    toast.info(
      isVi
        ? `Đã ngừng hiển thị cơ sở "${fac.name}"`
        : `Facility "${fac.name}" retired from public directory`
    );
  };

  const handleSaveFacility = (
    data: Omit<MedicalFacilityItem, "id" | "status" | "submittedBy" | "submittedDate">
  ) => {
    const today = new Date().toISOString().split("T")[0] || "2026-11-06";
    if (editingFacility) {
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === editingFacility.id ? { ...f, ...data, lastCheckedAt: today } : f
        )
      );
      toast.success(
        t("medicalFacilities.toasts.updated", "Facility updated successfully")
      );
    } else {
      const newFacility: MedicalFacilityItem = {
        id: facilities.length + 100,
        ...data,
        status: "verified",
        submittedBy: "Admin",
        submittedDate: today,
        lastCheckedAt: today,
      };
      setFacilities((prev) => [newFacility, ...prev]);
      toast.success(
        t("medicalFacilities.toasts.added", "Facility added successfully")
      );
    }
    setIsFormOpen(false);
  };

  const handleConfirmDecision = (
    facilityId: number,
    rejectionReason?: string,
    notes?: string
  ) => {
    const today = new Date().toISOString().split("T")[0] || "2026-11-06";
    setFacilities((prev) =>
      prev.map((f) =>
        f.id === facilityId
          ? {
              ...f,
              status: decisionMode === "verify" ? "verified" : "rejected",
              lastCheckedAt: today,
            }
          : f
      )
    );

    if (decisionMode === "verify") {
      toast.success(
        t(
          "medicalFacilities.toasts.verified",
          "Facility verified and published to map"
        )
      );
    } else {
      toast.info(
        t(
          "medicalFacilities.toasts.rejected",
          "Facility submission rejected"
        ) + (rejectionReason ? `: ${rejectionReason}` : "")
      );
    }
    if (notes) {
      // Internal audit note logged
    }
    setIsDecisionOpen(false);
  };

  const openMappingModal = (item?: DiseaseSpecialtyMappingItem) => {
    if (item) {
      setEditingMapping(item);
      setMapCode(item.diseaseCode);
      setMapNameVi(item.diseaseNameVi);
      setMapNameEn(item.diseaseNameEn);
      setMapSpecialties(item.specialtyCodes.join(", "));
      setMapGuidanceVi(item.urgencyGuidanceVi);
      setMapGuidanceEn(item.urgencyGuidanceEn);
    } else {
      setEditingMapping(null);
      setMapCode("");
      setMapNameVi("");
      setMapNameEn("");
      setMapSpecialties("Cardiology, General");
      setMapGuidanceVi("");
      setMapGuidanceEn("");
    }
    setIsMappingModalOpen(true);
  };

  const handleSaveMapping = () => {
    if (!mapCode.trim() || !mapNameVi.trim()) {
      toast.warning(isVi ? "Vui lòng nhập mã bệnh và tên bệnh" : "Please enter disease code and name");
      return;
    }
    const today = new Date().toISOString().split("T")[0] || "2026-11-06";
    const codes = mapSpecialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingMapping) {
      setMappings((prev) =>
        prev.map((m) =>
          m.id === editingMapping.id
            ? {
                ...m,
                diseaseCode: mapCode.trim().toUpperCase(),
                diseaseNameVi: mapNameVi.trim(),
                diseaseNameEn: mapNameEn.trim() || mapNameVi.trim(),
                specialtyCodes: codes,
                urgencyGuidanceVi: mapGuidanceVi.trim(),
                urgencyGuidanceEn: mapGuidanceEn.trim() || mapGuidanceVi.trim(),
                updatedAt: today,
              }
            : m
        )
      );
      toast.success(isVi ? "Đã cập nhật ánh xạ Bệnh - Chuyên khoa" : "Updated Disease-Specialty Mapping");
    } else {
      const created: DiseaseSpecialtyMappingItem = {
        id: `MAP-00${mappings.length + 1}`,
        diseaseCode: mapCode.trim().toUpperCase(),
        diseaseNameVi: mapNameVi.trim(),
        diseaseNameEn: mapNameEn.trim() || mapNameVi.trim(),
        specialtyCodes: codes,
        urgencyGuidanceVi: mapGuidanceVi.trim(),
        urgencyGuidanceEn: mapGuidanceEn.trim() || mapGuidanceVi.trim(),
        isActive: true,
        updatedAt: today,
      };
      setMappings((prev) => [created, ...prev]);
      toast.success(isVi ? "Đã tạo ánh xạ Bệnh - Chuyên khoa mới" : "Created Disease-Specialty Mapping");
    }
    setIsMappingModalOpen(false);
  };

  const handleToggleMappingActive = (id: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m))
    );
    toast.info(isVi ? "Đã cập nhật trạng thái ánh xạ" : "Updated mapping active status");
  };

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        {/* Top Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {t("sidebar.medicalFacilities", isVi ? "Cơ sở Y tế & Chuyên khoa" : "Medical Facilities & Specialty Mapping")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "medicalFacilities.description",
                isVi
                  ? "Quản lý danh mục cơ sở y tế và cấu hình gợi ý chuyên khoa theo bệnh lý."
                  : "Manage medical facilities and disease-to-specialty recommendation mappings."
              )}
            </p>
          </div>
          {activeTab === "facilities" ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-bold text-slate-900 transition-colors hover:bg-brand/90 shadow-sm"
            >
              <Plus size={18} />
              <span>{t("medicalFacilities.formModal.addTitle", isVi ? "Thêm Cơ sở Y tế" : "Add Medical Facility")}</span>
            </button>
          ) : (
            <button
              onClick={() => openMappingModal()}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-bold text-slate-900 transition-colors hover:bg-brand/90 shadow-sm"
            >
              <Plus size={18} />
              <span>{isVi ? "Thêm Ánh xạ Bệnh - Chuyên khoa" : "Add Disease-Specialty Mapping"}</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs */}
        <div className="mb-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("facilities")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "facilities"
                ? "bg-slate-900 text-white dark:bg-brand dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Building2 size={15} />
            {isVi ? "Danh mục Cơ sở Y tế" : "Facilities Directory"}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mappings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeTab === "mappings"
                ? "bg-slate-900 text-white dark:bg-brand dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <GitBranch size={15} />
            {isVi ? "Ánh xạ Bệnh - Chuyên khoa" : "Disease-Specialty Mappings"}
          </button>
        </div>

        {activeTab === "facilities" ? (
          <>
            {/* Filter bar */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder={t("docVerification.searchPlaceholder", "Search facility name...")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand dark:focus:border-brand"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="all">{t("medicalFacilities.status.all", "All Status")}</option>
                <option value="pending">{t("medicalFacilities.status.pending", "Pending")}</option>
                <option value="verified">{t("medicalFacilities.status.verified", "Verified")}</option>
                <option value="rejected">{t("medicalFacilities.status.rejected", "Rejected")}</option>
                <option value="retired">{isVi ? "Đã ngừng hiển thị" : "Retired"}</option>
              </select>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-4">{t("medicalFacilities.table.facility", "FACILITY")}</th>
                    <th className="px-6 py-4">{t("medicalFacilities.table.location", "LOCATION")}</th>
                    <th className="px-6 py-4">{isVi ? "KIỂM TRA GẦN NHẤT" : "LAST CHECKED"}</th>
                    <th className="px-6 py-4">{t("medicalFacilities.table.status", "STATUS")}</th>
                    <th className="px-6 py-4 text-right">{t("medicalFacilities.table.actions", "ACTIONS")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                  {filteredFacilities.map((fac) => (
                    <tr
                      key={fac.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {fac.name}
                            </div>
                            <div className="text-xs text-slate-500">{fac.specialty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{fac.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs">{fac.lastCheckedAt || fac.submittedDate}</div>
                        <div className="text-xs text-slate-400">
                          {t("medicalFacilities.by", "By")} {fac.submittedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {fac.status === "verified" && (
                          <Badge
                            variant="default"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none hover:bg-emerald-50"
                          >
                            <CheckCircle2 size={12} className="mr-1" />{" "}
                            {t("medicalFacilities.status.verified", "Verified")}
                          </Badge>
                        )}
                        {fac.status === "pending" && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none hover:bg-amber-50"
                          >
                            <Clock size={12} className="mr-1" />{" "}
                            {t("medicalFacilities.status.pending", "Pending")}
                          </Badge>
                        )}
                        {fac.status === "rejected" && (
                          <Badge
                            variant="destructive"
                            className="bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-none hover:bg-rose-50"
                          >
                            <XCircle size={12} className="mr-1" />{" "}
                            {t("medicalFacilities.status.rejected", "Rejected")}
                          </Badge>
                        )}
                        {fac.status === "retired" && (
                          <Badge
                            variant="secondary"
                            className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none"
                          >
                            <Archive size={12} className="mr-1" />{" "}
                            {isVi ? "Đã ẩn" : "Retired"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {fac.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenDecision(fac, "verify")}
                              className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                            >
                              {t("medicalFacilities.actions.approve", "Approve")}
                            </button>
                            <button
                              onClick={() => handleOpenDecision(fac, "reject")}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
                            >
                              {t("medicalFacilities.actions.reject", "Reject")}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(fac)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              {t("medicalFacilities.actions.edit", "Edit")}
                            </button>
                            {fac.status === "verified" && (
                              <button
                                onClick={() => handleRetireFacility(fac)}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 rounded-lg transition-colors flex items-center gap-1"
                                title={isVi ? "Ngừng hiển thị cơ sở y tế" : "Retire facility"}
                              >
                                <Archive size={13} />
                                {isVi ? "Ngừng hiển thị" : "Retire"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Disease-Specialty Mappings Tab (FAC-05, FAC-07, FAC-10, FAC-11) */
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">{isVi ? "MÃ BỆNH / CHƯƠNG TRÌNH" : "DISEASE CODE"}</th>
                  <th className="px-6 py-4">{isVi ? "CHUYÊN KHOA GỢI Ý" : "RECOMMENDED SPECIALTIES"}</th>
                  <th className="px-6 py-4">{isVi ? "HƯỚNG DẪN MỨC ĐỘ KHẨN" : "URGENCY GUIDANCE"}</th>
                  <th className="px-6 py-4">{isVi ? "TRẠNG THÁI" : "STATUS"}</th>
                  <th className="px-6 py-4 text-right">{isVi ? "THAO TÁC" : "ACTIONS"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {m.diseaseCode}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {isVi ? m.diseaseNameVi : m.diseaseNameEn}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {m.specialtyCodes.map((sp) => (
                          <Badge key={sp} variant="outline" className="text-xs font-semibold">
                            {sp}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs text-xs text-slate-600 dark:text-slate-300">
                      {isVi ? m.urgencyGuidanceVi : m.urgencyGuidanceEn}
                    </td>
                    <td className="px-6 py-4">
                      {m.isActive ? (
                        <Badge className="bg-emerald-600 text-white text-xs">
                          {isVi ? "Đang bật" : "Active"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {isVi ? "Đang tắt" : "Inactive"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openMappingModal(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200"
                        >
                          <Edit size={12} />
                          {isVi ? "Sửa" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleToggleMappingActive(m.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          {m.isActive ? (isVi ? "Tắt" : "Disable") : (isVi ? "Bật" : "Enable")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <FacilityFormModal
        key={editingFacility?.id || "add-facility"}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        facility={editingFacility}
        onSave={handleSaveFacility}
      />

      <FacilityDecisionModal
        key={decisionFacility?.id ? `${decisionFacility.id}-${decisionMode}` : "decision"}
        isOpen={isDecisionOpen}
        onClose={() => setIsDecisionOpen(false)}
        facility={decisionFacility}
        mode={decisionMode}
        onConfirm={handleConfirmDecision}
      />

      {/* Disease-Specialty Mapping Modal */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GitBranch className="text-brand" size={20} />
                {editingMapping
                  ? isVi
                    ? "Cập nhật Ánh xạ Bệnh - Chuyên khoa"
                    : "Edit Disease-Specialty Mapping"
                  : isVi
                  ? "Thêm Ánh xạ Bệnh - Chuyên khoa"
                  : "Create Disease-Specialty Mapping"}
              </h3>
              <button
                onClick={() => setIsMappingModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? "Mã bệnh lý / Chương trình *" : "Disease / Program Code *"}
                </label>
                <input
                  type="text"
                  value={mapCode}
                  onChange={(e) => setMapCode(e.target.value)}
                  placeholder="e.g. I10_HYPERTENSION"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? "Tên bệnh (Tiếng Việt) *" : "Disease Name (VI) *"}
                  </label>
                  <input
                    type="text"
                    value={mapNameVi}
                    onChange={(e) => setMapNameVi(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? "Tên bệnh (Tiếng Anh)" : "Disease Name (EN)"}
                  </label>
                  <input
                    type="text"
                    value={mapNameEn}
                    onChange={(e) => setMapNameEn(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? "Danh sách Chuyên khoa (cách nhau bởi dấu phẩy)" : "Specialties (comma-separated)"}
                </label>
                <input
                  type="text"
                  value={mapSpecialties}
                  onChange={(e) => setMapSpecialties(e.target.value)}
                  placeholder="Cardiology, Endocrinology, General"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? "Hướng dẫn mức độ khẩn (VI)" : "Urgency Guidance (VI)"}
                </label>
                <textarea
                  rows={2}
                  value={mapGuidanceVi}
                  onChange={(e) => setMapGuidanceVi(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMappingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isVi ? "Hủy" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                className="px-5 py-2 rounded-xl bg-brand text-slate-900 text-xs font-bold hover:bg-brand/90"
              >
                {isVi ? "Lưu ánh xạ" : "Save Mapping"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
