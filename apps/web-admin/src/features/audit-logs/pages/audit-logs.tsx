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
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith("vi");
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
      toast.info(
        t(
          "auditLogs.refreshed",
          isVi ? "Đã làm mới dữ liệu nhật ký kiểm toán" : "Audit logs refreshed"
        )
      );
    }, 500);
  };

  const handleAdminRevokeFamilyLink = () => {
    if (!revokeTargetLink) return;
    if (!revokeReason.trim()) {
      toast.error(
        t(
          "auditLogs.revokeReasonRequired",
          isVi ? "Vui lòng nhập lý do thu hồi liên kết" : "Please enter a reason for revoking this link"
        )
      );
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
    toast.success(
      t(
        "auditLogs.familyLinkRevoked",
        isVi
          ? "Đã thu hồi liên kết gia đình và lưu nhật ký kiểm toán"
          : "Family link revoked and logged in audit trail"
      )
    );
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
              {t(
                "auditLogs.title",
                isVi ? "Nhật ký Kiểm toán & Liên kết Gia đình" : "System Audit Logs & Family Links"
              )}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t(
              "auditLogs.subtitle",
              isVi
                ? "Tra cứu lịch sử thao tác quản trị và trạng thái vận hành hệ thống"
                : "Monitor administrative actions and system operational events"
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh", isVi ? "Làm mới" : "Refresh")}
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
          <span className="font-bold">
            {isVi ? "Bảo mật dữ liệu y tế:" : "Clinical Privacy Protection:"}
          </span>{" "}
          {isVi
            ? "Nhật ký hệ thống chỉ lưu trữ lịch sử chuyển đổi trạng thái, lý do thao tác và thông tin vận hành. Nội dung tin nhắn khám, triệu chứng chi tiết và ghi chú lâm sàng của Bác sĩ được bảo mật tuyệt đối."
            : "System audit logs only record status transitions, action reasons, and operational metadata. Consultation messages, patient symptoms, and clinical notes are strictly hidden."}
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
          {t("auditLogs.tabSystemLogs", isVi ? "Nhật ký Hệ thống" : "System Audit Logs")}
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
          {t("auditLogs.tabFamilyLinks", isVi ? "Liên kết Gia đình" : "Family Links Audit")}
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
                  isVi
                    ? "Tìm theo mã nhật ký, hành động, người thực hiện..."
                    : "Search by log ID, action, actor, resource..."
                )}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">{t("auditLogs.allDomains", isVi ? "Tất cả phân hệ" : "All Domains")}</option>
              <option value="billing">{isVi ? "Thanh toán & Gói dịch vụ" : "Billing & Subscriptions"}</option>
              <option value="care">{isVi ? "Chăm sóc bệnh mạn tính" : "Chronic Care & Rules"}</option>
              <option value="consultation">{isVi ? "Tư vấn & Phòng chờ" : "Consultation & Queue"}</option>
              <option value="ai_kb">{isVi ? "Kho tri thức AI" : "AI Knowledge Base"}</option>
              <option value="user">{isVi ? "Người dùng & Xác minh" : "User & Verification"}</option>
              <option value="family">{isVi ? "Liên kết gia đình" : "Family Companion"}</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">{t("auditLogs.allRoles", isVi ? "Tất cả vai trò" : "All Roles")}</option>
              <option value="super_admin">Super Admin</option>
              <option value="user_admin">User Admin</option>
              <option value="ai_admin">AI Admin</option>
              <option value="doctor">{isVi ? "Bác sĩ" : "Doctor"}</option>
              <option value="patient">{isVi ? "Bệnh nhân" : "Patient"}</option>
              <option value="system">{isVi ? "Hệ thống" : "System"}</option>
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
                    <th className="py-3.5 px-4">{isVi ? "Thời gian" : "Timestamp"}</th>
                    <th className="py-3.5 px-4">{isVi ? "Phân hệ" : "Domain"}</th>
                    <th className="py-3.5 px-4">{isVi ? "Hành động" : "Action"}</th>
                    <th className="py-3.5 px-4">{isVi ? "Người thực hiện" : "Actor"}</th>
                    <th className="py-3.5 px-4">{isVi ? "Đối tượng" : "Resource"}</th>
                    <th className="py-3.5 px-4">{isVi ? "Chuyển trạng thái" : "Status Change"}</th>
                    <th className="py-3.5 px-4 text-right">{isVi ? "Chi tiết" : "Details"}</th>
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
                          {isVi ? "Xem" : "Inspect"}
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
                {t(
                  "auditLogs.familyLinksList",
                  isVi ? "Danh sách Liên kết Gia đình" : "Family Companion Links"
                )}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {isVi
                  ? "Quản trị viên chỉ kiểm tra trạng thái đồng thuận và quyền chia sẻ, hoặc thu hồi khẩn cấp khi có báo cáo lạm dụng."
                  : "Administrators can inspect consent status and sharing permissions, or revoke links in case of reported abuse."}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-xs font-bold uppercase text-gray-400 dark:text-slate-500">
                  <th className="py-3.5 px-4">{isVi ? "Mã liên kết" : "Link ID"}</th>
                  <th className="py-3.5 px-4">{isVi ? "Bệnh nhân" : "Patient"}</th>
                  <th className="py-3.5 px-4">{isVi ? "Người đồng hành" : "Companion"}</th>
                  <th className="py-3.5 px-4">{isVi ? "Mối quan hệ" : "Relationship"}</th>
                  <th className="py-3.5 px-4">{isVi ? "Quyền chia sẻ" : "Permissions"}</th>
                  <th className="py-3.5 px-4">{isVi ? "Trạng thái" : "Status"}</th>
                  <th className="py-3.5 px-4 text-right">{isVi ? "Thao tác" : "Actions"}</th>
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
                      {isVi ? "Nhắc lịch:" : "Reminders:"}{" "}
                      <b>{fl.permissions.receiveReminders ? (isVi ? "Bật" : "ON") : (isVi ? "Tắt" : "OFF")}</b> •{" "}
                      {isVi ? "Tiến độ:" : "Progress:"}{" "}
                      <b>{fl.permissions.viewCareProgress ? (isVi ? "Bật" : "ON") : (isVi ? "Tắt" : "OFF")}</b> •{" "}
                      {isVi ? "Cảnh báo:" : "Alerts:"}{" "}
                      <b>{fl.permissions.viewAlertSummary ? (isVi ? "Bật" : "ON") : (isVi ? "Tắt" : "OFF")}</b>
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
                          ? isVi
                            ? "Đang hoạt động"
                            : "Active"
                          : fl.status === "revoked"
                            ? isVi
                              ? "Đã thu hồi"
                              : "Revoked"
                            : fl.status === "paused"
                              ? isVi
                                ? "Tạm dừng"
                                : "Paused"
                              : isVi
                                ? "Chờ xác nhận"
                                : "Pending"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {fl.status !== "revoked" && (
                        <button
                          onClick={() => setRevokeTargetLink(fl)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer"
                        >
                          {isVi ? "Thu hồi liên kết" : "Revoke Link"}
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
                  {isVi
                    ? `Chi tiết Sự kiện Kiểm toán (${selectedLog.id})`
                    : `Audit Event Details (${selectedLog.id})`}
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
                {isVi ? "Chuyển đổi trạng thái" : "Status Transition"}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{isVi ? "Đối tượng" : "Resource"}</p>
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
                  {isVi ? "Mã lý do:" : "Reason:"} {selectedLog.reasonCode}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">
                {isVi
                  ? "Thông tin vận hành (Đã ẩn dữ liệu lâm sàng)"
                  : "Operational Details (Clinical data redacted)"}
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
                {isVi ? "Đóng" : "Close"}
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
                {isVi ? "Thu hồi Liên kết Gia đình" : "Revoke Family Link"}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              {isVi ? (
                <>
                  Bạn đang thu hồi liên kết <span className="font-bold">{revokeTargetLink.id}</span> giữa{" "}
                  <b>{revokeTargetLink.patientMasked}</b> và <b>{revokeTargetLink.companionMasked}</b>.
                </>
              ) : (
                <>
                  You are revoking link <span className="font-bold">{revokeTargetLink.id}</span> between{" "}
                  <b>{revokeTargetLink.patientMasked}</b> and <b>{revokeTargetLink.companionMasked}</b>.
                </>
              )}
            </p>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                {isVi ? "Lý do thu hồi bắt buộc *" : "Mandatory Revocation Reason *"}
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                placeholder={
                  isVi
                    ? "Nhập lý do can thiệp an toàn hoặc theo yêu cầu hỗ trợ..."
                    : "Enter safety intervention or support request reason..."
                }
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
                {isVi ? "Hủy" : "Cancel"}
              </button>
              <button
                onClick={handleAdminRevokeFamilyLink}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer"
              >
                {isVi ? "Xác nhận thu hồi" : "Confirm Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

