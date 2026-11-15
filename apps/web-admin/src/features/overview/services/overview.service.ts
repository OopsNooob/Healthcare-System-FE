import {
  normalizeCursorList,
  normalizePaginatedList,
  webAdminApi,
} from "@/lib/api";
import { format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";

export interface SystemHealthStatus {
  live: "ok" | "degraded" | "down";
  ready: "ok" | "degraded" | "down";
}

export interface OverviewSummary {
  totalUsers: number;
  activeDoctors: number;
  aiKnowledgeDocuments: number;
  pendingVerifications: number;
  doctorSessions: number;
  violationReports: number;
  bannedAccounts: number;
  activeEnrollments: number;
  openAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  systemHealth: SystemHealthStatus;
  monthly: {
    labels: string[];
    totalUsers: number[];
    activeDoctors: number[];
    aiDocuments: number[];
  };
  weekly: {
    labels: string[];
    doctorSessions: number[];
    violationReports: number[];
  };
  tierDistribution: {
    labels: string[];
    planPrices: number[];
    orderCounts: number[];
  };
}

type CreatedAtRecord = {
  createdAt?: string;
  detectedAt?: string;
  status?: string;
  severity?: string;
  acknowledgedAt?: string;
  planId?: string;
  orderSnapshot?: { code?: string; name?: string };
  doctorProfile?: { verificationStatus?: string };
};

function getMonthKeysLast8Months() {
  return Array.from({ length: 8 }, (_, index) => {
    const monthsAgo = 7 - index;
    const date = subMonths(new Date(), monthsAgo);
    return format(date, "yyyy-MM");
  });
}

function getDayKeysLast7Days() {
  return Array.from({ length: 7 }, (_, index) => {
    const daysAgo = 6 - index;
    const date = subDays(new Date(), daysAgo);
    return format(date, "yyyy-MM-dd");
  });
}

function buildMonthlyCounts(items: CreatedAtRecord[], monthKeys: string[]) {
  const monthlyCounter = new Map<string, number>(
    monthKeys.map((monthKey) => [monthKey, 0]),
  );

  for (const item of items) {
    const rawDate = item.createdAt ?? item.detectedAt;
    if (!rawDate) continue;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) continue;

    const monthKey = format(parsed, "yyyy-MM");
    if (!monthlyCounter.has(monthKey)) continue;
    monthlyCounter.set(monthKey, (monthlyCounter.get(monthKey) ?? 0) + 1);
  }

  return monthKeys.map((monthKey) => monthlyCounter.get(monthKey) ?? 0);
}

function buildDailyCounts(items: CreatedAtRecord[], dayKeys: string[]) {
  const dailyCounter = new Map<string, number>(
    dayKeys.map((dayKey) => [dayKey, 0]),
  );

  for (const item of items) {
    const rawDate = item.createdAt ?? item.detectedAt;
    if (!rawDate) continue;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) continue;

    const dayKey = format(parsed, "yyyy-MM-dd");
    if (!dailyCounter.has(dayKey)) continue;
    dailyCounter.set(dayKey, (dailyCounter.get(dayKey) ?? 0) + 1);
  }

  return dayKeys.map((dayKey) => dailyCounter.get(dayKey) ?? 0);
}

function toHealthState(
  settled: PromiseSettledResult<{ status?: string }>,
): "ok" | "degraded" | "down" {
  if (settled.status !== "fulfilled") return "down";
  const status = settled.value?.status?.toLowerCase();
  if (status === "ok") return "ok";
  return status ? "degraded" : "ok";
}

export async function getOverviewSummary(): Promise<OverviewSummary> {
  const monthKeys = getMonthKeysLast8Months();
  const dayKeys = getDayKeysLast7Days();
  const rangeStart = startOfMonth(subMonths(new Date(), 7)).getTime();
  const dailyRangeStart = startOfDay(subDays(new Date(), 6)).getTime();

  const [
    liveRes,
    readyRes,
    dashboardStatsRes,
    usersPagedRes,
    doctorsPagedRes,
    pendingAppsRes,
    consultationsRes,
    violationsStatsRes,
    violationsListRes,
    aiDocsRes,
    enrollmentsRes,
    alertsRes,
    plansRes,
    ordersRes,
  ] = await Promise.allSettled([
    webAdminApi.healthLive(),
    webAdminApi.healthReady(),
    webAdminApi.adminGetDashboardStats(),
    webAdminApi.usersFindAllPaged({ query: { page: 1, limit: 100 } }),
    webAdminApi.usersSearchDoctors({ query: { page: 1, limit: 100 } }),
    webAdminApi.adminGetDoctorApplication({
      query: { page: 1, limit: 100 },
    }),
    webAdminApi.adminGetAllConsultations({ query: { page: 1, limit: 100 } }),
    webAdminApi.violationsGetStats(),
    webAdminApi.violationsFindAll({ query: { page: 1, limit: 100 } }),
    webAdminApi.aiDocumentsGetAllDocuments({ query: { page: 1, limit: 100 } }),
    webAdminApi.careEnrollmentList({ query: { page: 1, limit: 100 } }),
    webAdminApi.careAlertInbox({ query: { limit: 100 } }),
    webAdminApi.plansList(),
    webAdminApi.paymentsList({ query: { page: 1, limit: 100 } }),
  ]);

  const usersPaged =
    usersPagedRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(usersPagedRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const doctorsPaged =
    doctorsPagedRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(doctorsPagedRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const pendingApps =
    pendingAppsRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(pendingAppsRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const consultationsPaged =
    consultationsRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(consultationsRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const violationsPaged =
    violationsListRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(violationsListRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const aiDocsPaged =
    aiDocsRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(aiDocsRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const enrollmentsPaged =
    enrollmentsRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(enrollmentsRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const alertsCursor =
    alertsRes.status === "fulfilled"
      ? normalizeCursorList<CreatedAtRecord>(alertsRes.value)
      : normalizeCursorList<CreatedAtRecord>([]);

  const plans =
    plansRes.status === "fulfilled"
      ? normalizePaginatedList<{ _id?: string; id?: string; code?: string; name?: string; price?: number }>(plansRes.value).items
      : [];

  const ordersPaged =
    ordersRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(ordersRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const dashStats =
    dashboardStatsRes.status === "fulfilled" ? dashboardStatsRes.value : null;
  const vStats =
    violationsStatsRes.status === "fulfilled" ? violationsStatsRes.value : null;

  const recentConsultations = consultationsPaged.items.filter(
    (item) =>
      Boolean(item.createdAt) &&
      new Date(item.createdAt as string).getTime() >= dailyRangeStart,
  );
  const recentViolations = violationsPaged.items.filter(
    (item) =>
      Boolean(item.createdAt) &&
      new Date(item.createdAt as string).getTime() >= dailyRangeStart,
  );

  const monthUsers = usersPaged.items.filter(
    (u) => !u.createdAt || new Date(u.createdAt).getTime() >= rangeStart,
  );
  const monthDoctors = doctorsPaged.items.filter(
    (d) => !d.createdAt || new Date(d.createdAt).getTime() >= rangeStart,
  );
  const monthAiDocs = aiDocsPaged.items.filter(
    (doc) => !doc.createdAt || new Date(doc.createdAt).getTime() >= rangeStart,
  );

  const activeEnrollments = enrollmentsPaged.items.filter(
    (e) => e.status === "active" || !e.status,
  ).length;
  const openAlerts = alertsCursor.items.filter((a) => a.status === "open").length;
  const acknowledgedAlerts = alertsCursor.items.filter(
    (a) => a.status === "acknowledged",
  ).length;
  const resolvedAlerts = alertsCursor.items.filter(
    (a) => a.status === "resolved",
  ).length;

  const orderCountByCode = new Map<string, number>();
  for (const ord of ordersPaged.items) {
    const label = ord.orderSnapshot?.name ?? ord.orderSnapshot?.code ?? "Plan";
    orderCountByCode.set(label, (orderCountByCode.get(label) ?? 0) + 1);
  }

  const tierLabels =
    plans.length > 0
      ? plans.map((p) => p.name ?? p.code ?? "Plan")
      : Array.from(orderCountByCode.keys());
  const planPrices =
    plans.length > 0
      ? plans.map((p) => Number(p.price ?? 0))
      : tierLabels.map(() => 0);
  const orderCounts = tierLabels.map((lbl) => orderCountByCode.get(lbl) ?? 0);

  return {
    totalUsers: dashStats?.users.total ?? usersPaged.total,
    activeDoctors: dashStats?.users.doctors ?? doctorsPaged.total,
    aiKnowledgeDocuments: aiDocsPaged.total,
    pendingVerifications: dashStats?.users.pendingDoctors ?? pendingApps.total,
    doctorSessions: dashStats?.consultations.total ?? consultationsPaged.total,
    violationReports: vStats?.total ?? violationsPaged.total,
    bannedAccounts: dashStats?.security.bannedAccounts ?? 0,
    activeEnrollments: activeEnrollments || enrollmentsPaged.total,
    openAlerts,
    acknowledgedAlerts,
    resolvedAlerts,
    systemHealth: {
      live: toHealthState(liveRes),
      ready: toHealthState(readyRes),
    },
    monthly: {
      labels: monthKeys.map((monthKey) => {
        const [year, month] = monthKey.split("-");
        return format(new Date(Number(year), Number(month) - 1, 1), "MMM");
      }),
      totalUsers: buildMonthlyCounts(monthUsers, monthKeys),
      activeDoctors: buildMonthlyCounts(monthDoctors, monthKeys),
      aiDocuments: buildMonthlyCounts(monthAiDocs, monthKeys),
    },
    weekly: {
      labels: dayKeys.map((dayKey) => {
        const [year, month, day] = dayKey.split("-");
        return format(
          new Date(Number(year), Number(month) - 1, Number(day)),
          "EEE",
        );
      }),
      doctorSessions: buildDailyCounts(recentConsultations, dayKeys),
      violationReports: buildDailyCounts(recentViolations, dayKeys),
    },
    tierDistribution: {
      labels: tierLabels,
      planPrices,
      orderCounts,
    },
  };
}
