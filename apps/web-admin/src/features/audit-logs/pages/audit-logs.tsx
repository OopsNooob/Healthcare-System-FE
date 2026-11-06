import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  Users,
  FileCode2,
  ArrowRight,
  Lock,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";

interface AuditLogRecord {
  id: string;
  timestamp: string;
  domain: "auth" | "user" | "consultation" | "care" | "billing" | "ai_kb" | "family" | "moderation";
  action: string;
  actorId: string;
  actorRole: "patient" | "doctor" | "super_admin" | "user_admin" | "ai_admin" | "system";
  resourceType: string;
  resourceId: string;
  beforeStatus: string | null;
  afterStatus: string | null;
  reasonCode?: string;
  safeMetadata: Record<string, string | number | boolean>;
}

interface FamilyLinkAuditRecord {
  id: string;
  patientMasked: string;
  companionMasked: string;
  relationship: "parent" | "child" | "spouse" | "sibling" | "caregiver";
  consentVersion: string;
  status: "active" | "paused" | "pending" | "revoked";
  permissions: {
    receiveReminders: boolean;
    viewCareProgress: boolean;
    viewAlertSummary: boolean;
  };
  updatedAt: string;
}

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: "aud_9001",
    timestamp: "2026-11-06 10:42:15",
    domain: "billing",
    action: "ORDER_IPN_VERIFIED",
    actorId: "vnpay_ipn_gateway",
    actorRole: "system",
    resourceType: "PaymentOrder",
    resourceId: "ORD-20261106-8821",
    beforeStatus: "pending",
    afterStatus: "paid",
    safeMetadata: {
      planCode: "CARE",
      amountVnd: 299000,
      ipnSignatureValid: true,
      entitlementGranted: true,
    },
  },
  {
    id: "aud_9002",
    timestamp: "2026-11-06 10:15:03",
    domain: "care",
    action: "CARE_RULE_ACTIVATED",
    actorId: "usr_doc_sarah_01",
    actorRole: "doctor",
    resourceType: "CareRule",
    resourceId: "rule-htn-bp-v2.2",
    beforeStatus: "validated_candidate",
    afterStatus: "active",
    safeMetadata: {
      programCode: "HYPERTENSION_V1",
      boundaryTestsPassed: "12/12",
      previousRuleArchived: "rule-htn-bp-v2.1",
    },
  },
  {
    id: "aud_9003",
    timestamp: "2026-11-06 09:50:40",
    domain: "ai_kb",
    action: "KB_DOCUMENT_APPROVED",
    actorId: "usr_ai_admin_02",
    actorRole: "ai_admin",
    resourceType: "KnowledgeDocument",
    resourceId: "doc_moh_htn_2026",
    beforeStatus: "pending_review",
    afterStatus: "approved",
    safeMetadata: {
      processingStatus: "indexed",
      activeChunkCount: 42,
      excludedChunkCount: 2,
    },
  },
  {
    id: "aud_9004",
    timestamp: "2026-11-05 18:22:10",
    domain: "consultation",
    action: "CONSULTATION_NO_SHOW_MARKED",
    actorId: "usr_doc_sarah_01",
    actorRole: "doctor",
    resourceType: "Consultation",
    resourceId: "con_7741",
    beforeStatus: "waiting",
    afterStatus: "no_show",
    reasonCode: "patient_absent",
    safeMetadata: {
      mode: "scheduled",
      queuePositionAtCall: 1,
      clinicalPayloadRedacted: true,
    },
  },
  {
    id: "aud_9005",
    timestamp: "2026-11-05 15:10:00",
    domain: "user",
    action: "USER_ACCOUNT_LOCKED",
    actorId: "usr_admin_01",
    actorRole: "user_admin",
    resourceType: "User",
    resourceId: "usr_pat_8812",
    beforeStatus: "active",
    afterStatus: "locked",
    reasonCode: "repeated_abuse_violation",
    safeMetadata: {
      revokedActiveSessions: 3,
      violationReportId: "rep_402",
    },
  },
];

const INITIAL_FAMILY_LINKS: FamilyLinkAuditRecord[] = [
  {
    id: "fam_301",
    patientMasked: "Alex J. (usr_pat_101)",
    companionMasked: "Emily W. (usr_pat_204)",
    relationship: "child",
    consentVersion: "family-consent.v1",
    status: "active",
    permissions: {
      receiveReminders: true,
      viewCareProgress: true,
      viewAlertSummary: true,
    },
    updatedAt: "2026-11-05 14:30",
  },
  {
    id: "fam_302",
    patientMasked: "Maria G. (usr_pat_108)",
    companionMasked: "Carlos G. (usr_pat_309)",
    relationship: "spouse",
    consentVersion: "family-consent.v1",
    status: "paused",
    permissions: {
      receiveReminders: true,
      viewCareProgress: false,
      viewAlertSummary: true,
    },
    updatedAt: "2026-11-04 09:12",
  },
  {
    id: "fam_303",
    patientMasked: "Robert J. (usr_pat_115)",
    companionMasked: "Alex J. (usr_pat_101)",
    relationship: "parent",
    consentVersion: "family-consent.v1",
    status: "pending",
    permissions: {
      receiveReminders: true,
      viewCareProgress: true,
      viewAlertSummary: true,
    },
    updatedAt: "2026-11-06 08:00",
  },
];

export function AuditLogs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"audit_logs" | "family_audit">("audit_logs");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [logs, setLogs] = useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);
  const [familyLinks, setFamilyLinks] = useState<FamilyLinkAuditRecord[]>(INITIAL_FAMILY_LINKS);

  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [revokeTargetLink, setRevokeTargetLink] = useState<FamilyLinkAuditRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.info(t("auditLogs.toasts.refreshed", "Đã làm mới dữ liệu nhật ký kiểm toán"));
    }, 500);
  };

  const handleAdminRevokeFamilyLink = () => {
    if (!revokeTargetLink) return;
    if (!revokeReason.trim()) {
      toast.error(t("auditLogs.toasts.reasonRequired", "Vui lòng nhập lý do thu hồi liên kết"));
      return;
    }

    setFamilyLinks((prev) =>
      prev.map((item) =>
        item.id === revokeTargetLink.id ? { ...item, status: "revoked" } : item
      )
    );

    const newLog: AuditLogRecord = {
      id: `aud_${9001 + logs.length}`,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      domain: "family",
      action: "ADMIN_FAMILY_LINK_REVOKED",
      actorId: "usr_super_admin",
      actorRole: "super_admin",
      resourceType: "FamilyLink",
      resourceId: revokeTargetLink.id,
      beforeStatus: revokeTargetLink.status,
      afterStatus: "revoked",
      reasonCode: "safety_abuse_intervention",
      safeMetadata: {
        consentVersion: revokeTargetLink.consentVersion,
        adminReason: revokeReason.trim(),
      },
    };
    setLogs((prev) => [newLog, ...prev]);
    setRevokeTargetLink(null);
    setRevokeReason("");
    toast.success(t("auditLogs.toasts.revokeSuccess", "Đã thu hồi liên kết gia đình và lưu nhật ký kiểm toán"));
  };

  const filteredLogs = logs.filter((log) => {
    const matchDomain = domainFilter === "all" || log.domain === domainFilter;
    const matchRole = roleFilter === "all" || log.actorRole === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      log.id.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.actorId.toLowerCase().includes(q) ||
      log.resourceId.toLowerCase().includes(q);
    return matchDomain && matchRole && matchSearch;
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-slate-950 min-h-screen text-gray-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("auditLogs.title", "Nhật ký Kiểm toán & Liên kết Gia đình")}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t("auditLogs.subtitle", "Tra cứu lịch sử thao tác quản trị và trạng thái vận hành hệ thống")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh", "Làm mới")}
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
          <span className="font-bold">
            {t("auditLogs.privacyTitle", "Bảo mật dữ liệu y tế:")}
          </span>{" "}
          {t(
            "auditLogs.privacyDesc",
            "Nhật ký hệ thống chỉ lưu trữ lịch sử chuyển đổi trạng thái, lý do thao tác và thông tin vận hành. Nội dung tin nhắn khám, triệu chứng chi tiết và ghi chú lâm sàng của Bác sĩ được bảo mật tuyệt đối."
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("audit_logs")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "audit_logs"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          {t("auditLogs.tabSystemLogs", "Nhật ký Hệ thống")}
        </button>
        <button
          onClick={() => setActiveTab("family_audit")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "family_audit"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          {t("auditLogs.tabFamilyLinks", "Liên kết Gia đình")}
        </button>
      </div>

      {activeTab === "audit_logs" ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  "auditLogs.searchPlaceholder",
                  "Tìm theo mã nhật ký, hành động, người thực hiện..."
                )}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">{t("auditLogs.allDomains", "Tất cả phân hệ")}</option>
              <option value="billing">{t("auditLogs.domains.billing", "Thanh toán & Gói dịch vụ")}</option>
              <option value="care">{t("auditLogs.domains.chronicCare", "Chăm sóc bệnh mạn tính")}</option>
              <option value="consultation">{t("auditLogs.domains.consultation", "Tư vấn & Phòng chờ")}</option>
              <option value="ai_kb">{t("auditLogs.domains.ai", "Kho tri thức AI")}</option>
              <option value="user">{t("auditLogs.domains.user", "Người dùng & Xác minh")}</option>
              <option value="family">{t("auditLogs.domains.family", "Liên kết gia đình")}</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">{t("auditLogs.allRoles", "Tất cả vai trò")}</option>
              <option value="super_admin">Super Admin</option>
              <option value="user_admin">User Admin</option>
              <option value="ai_admin">AI Admin</option>
              <option value="doctor">{t("auditLogs.roles.doctor", "Bác sĩ")}</option>
              <option value="patient">{t("auditLogs.roles.patient", "Bệnh nhân")}</option>
              <option value="system">{t("auditLogs.roles.system", "Hệ thống")}</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 text-xs font-bold uppercase text-gray-400 dark:text-slate-500">
                    <th className="py-3.5 px-4">{t("auditLogs.table.timestamp", "Thời gian")}</th>
                    <th className="py-3.5 px-4">{t("auditLogs.table.domain", "Phân hệ")}</th>
                    <th className="py-3.5 px-4">{t("auditLogs.table.action", "Hành động")}</th>
                    <th className="py-3.5 px-4">{t("auditLogs.table.actor", "Người thực hiện")}</th>
                    <th className="py-3.5 px-4">{t("auditLogs.table.resource", "Đối tượng")}</th>
                    <th className="py-3.5 px-4">{t("auditLogs.table.statusChange", "Chuyển trạng thái")}</th>
                    <th className="py-3.5 px-4 text-right">{t("auditLogs.table.details", "Chi tiết")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500 dark:text-slate-400">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.domain}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 dark:text-slate-200">{log.actorId}</div>
                        <div className="text-xs text-gray-400">{log.actorRole}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                        {log.resourceType}:{log.resourceId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
                            {log.beforeStatus || "none"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            {log.afterStatus || "none"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-xs font-bold text-gray-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t("auditLogs.table.inspect", "Xem")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: Family Links Audit */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("auditLogs.familyLinksList")}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {t("auditLogs.familyNotice")}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-xs font-bold uppercase text-gray-400 dark:text-slate-500">
                  <th className="py-3.5 px-4">{t("auditLogs.table.resource", "Mã liên kết")}</th>
                  <th className="py-3.5 px-4">{t("auditLogs.roles.patient", "Bệnh nhân")}</th>
                  <th className="py-3.5 px-4">{t("auditLogs.domains.family", "Người đồng hành")}</th>
                  <th className="py-3.5 px-4">{t("auditLogs.table.relationship", "Mối quan hệ")}</th>
                  <th className="py-3.5 px-4">{t("auditLogs.table.permissions", "Quyền chia sẻ")}</th>
                  <th className="py-3.5 px-4">{t("auditLogs.table.status", "Trạng thái")}</th>
                  <th className="py-3.5 px-4 text-right">{t("auditLogs.table.action", "Thao tác")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
                {familyLinks.map((fl) => (
                  <tr key={fl.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold">{fl.id}</td>
                    <td className="py-3.5 px-4 font-medium">{fl.patientMasked}</td>
                    <td className="py-3.5 px-4 font-medium">{fl.companionMasked}</td>
                    <td className="py-3.5 px-4">
                      <span className="uppercase text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                        {fl.relationship}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-slate-300">
                      {t("auditLogs.permissions.reminders")}:{" "}
                      <b>{fl.permissions.receiveReminders ? t("auditLogs.permissions.on") : t("auditLogs.permissions.off")}</b> •{" "}
                      {t("auditLogs.permissions.progress")}:{" "}
                      <b>{fl.permissions.viewCareProgress ? t("auditLogs.permissions.on") : t("auditLogs.permissions.off")}</b> •{" "}
                      {t("auditLogs.permissions.alerts")}:{" "}
                      <b>{fl.permissions.viewAlertSummary ? t("auditLogs.permissions.on") : t("auditLogs.permissions.off")}</b>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          fl.status === "active"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : fl.status === "revoked"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {fl.status === "active"
                          ? t("auditLogs.status.active", "Đang hoạt động")
                          : fl.status === "revoked"
                            ? t("auditLogs.status.revoked", "Đã thu hồi")
                            : fl.status === "paused"
                              ? t("auditLogs.status.paused", "Tạm dừng")
                              : t("auditLogs.status.pending", "Chờ xác nhận")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {fl.status !== "revoked" && (
                        <button
                          onClick={() => setRevokeTargetLink(fl)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer"
                        >
                          {t("auditLogs.table.revoke", "Thu hồi")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("auditLogs.modal.eventDetails", "Chi tiết Sự kiện Kiểm toán")} ({selectedLog.id})
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{selectedLog.timestamp}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/70 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">
                {t("auditLogs.table.statusChange", "Chuyển đổi trạng thái")}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{t("auditLogs.table.resource", "Đối tượng")}</p>
                  <p className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedLog.resourceType} / {selectedLog.resourceId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-gray-200 dark:bg-slate-700 text-xs font-bold">
                    {selectedLog.beforeStatus || "N/A"}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    {selectedLog.afterStatus || "N/A"}
                  </span>
                </div>
              </div>
              {selectedLog.reasonCode && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-2">
                  {t("auditLogs.modal.revokeReasonLabel", "Lý do:")} {selectedLog.reasonCode}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">
                {t("auditLogs.operationalDetailsRedacted")}
              </p>
              <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                {JSON.stringify(selectedLog.safeMetadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold cursor-pointer"
              >
                {t("common.close", "Đóng")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Family Link Revoke Modal */}
      {revokeTargetLink && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">
                {t("auditLogs.modal.revokeTitle", "Thu hồi Liên kết Gia đình")}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              {t("auditLogs.modal.revokeDesc", "Hành động này sẽ hủy bỏ ngay lập tức quyền truy cập của người thân và ghi nhận vào nhật ký kiểm toán.")}
            </p>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                {t("auditLogs.modal.revokeReasonLabel", "Lý do thu hồi bắt buộc *")}
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                placeholder={t("auditLogs.modal.revokeReasonPlaceholder")}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRevokeTargetLink(null);
                  setRevokeReason("");
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm font-semibold cursor-pointer"
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                onClick={handleAdminRevokeFamilyLink}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer"
              >
                {t("auditLogs.modal.confirmRevoke", "Xác nhận thu hồi")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

