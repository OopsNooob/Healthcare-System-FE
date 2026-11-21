import { normalizePaginatedList, webAdminApi } from "@/lib/api";
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
  publishedCarePrograms: number;
  draftCarePrograms: number;
  retiredCarePrograms: number;
  pendingViolationReports: number;
  resolvedViolationReports: number;
  publishedPlansCount: number;
  draftPlansCount: number;
  totalPlanVersions: number;
  planQuotas: {
    labels: string[];
    aiRequestLimits: number[];
    consultationLimits: number[];
    careProgramLimits: number[];
  };
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
}

type CreatedAtRecord = {
  createdAt?: string;
  detectedAt?: string;
  status?: string;
  severity?: string;
  doctorProfile?: { verificationStatus?: string };
};

type PlanRecord = {
  _id?: string;
  id?: string;
  code?: string;
  name?: string;
  version?: number;
  status?: string;
  price?: number;
  aiRequestLimit?: number;
  consultationLimitPerCycle?: number;
  activeCareProgramLimit?: number;
};

function deduplicatePlansByCode(plans: PlanRecord[]): PlanRecord[] {
  const byCode = new Map<string, PlanRecord>();
  for (const plan of plans) {
    const key = String(plan.code || plan.name || "PLAN").toUpperCase();
    const existing = byCode.get(key);
    if (!existing || Number(plan.version ?? 1) >= Number(existing.version ?? 1)) {
      byCode.set(key, plan);
    }
  }
  return Array.from(byCode.values()).sort((a, b) => {
    const priceDiff = Number(a.price ?? 0) - Number(b.price ?? 0);
    if (priceDiff !== 0) return priceDiff;
    return String(a.name ?? a.code ?? "").localeCompare(
      String(b.name ?? b.code ?? ""),
    );
  });
}

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
    careProgramsRes,
    plansRes,
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
    webAdminApi.careProgramRuleListPrograms({ query: { page: 1, limit: 100 } }),
    webAdminApi.plansList(),
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

  const careProgramsPaged =
    careProgramsRes.status === "fulfilled"
      ? normalizePaginatedList<CreatedAtRecord>(careProgramsRes.value, 1, 100)
      : normalizePaginatedList<CreatedAtRecord>([]);

  const plans =
    plansRes.status === "fulfilled"
      ? Array.isArray(plansRes.value)
        ? (plansRes.value as unknown as PlanRecord[])
        : normalizePaginatedList<PlanRecord>(plansRes.value).items
      : [];

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

  const publishedCarePrograms = careProgramsPaged.items.filter(
    (program) => program.status === "published",
  ).length;
  const draftCarePrograms = careProgramsPaged.items.filter(
    (program) => program.status === "draft",
  ).length;
  const retiredCarePrograms = careProgramsPaged.items.filter(
    (program) => program.status === "retired",
  ).length;

  const totalViolationReports = vStats?.total ?? violationsPaged.total;
  const pendingViolationReports =
    vStats?.pending ??
    violationsPaged.items.filter(
      (item) => item.status === "pending" || item.status === "processing",
    ).length;
  const resolvedViolationReports =
    vStats?.resolved ??
    violationsPaged.items.filter((item) => item.status === "resolved").length;

  const totalPlanVersions = plans.length;
  const draftPlansCount = plans.filter((p) => p.status === "draft").length;
  const publishedUniquePlans = deduplicatePlansByCode(
    plans.filter((p) => p.status === "published"),
  );
  const displayPlans =
    publishedUniquePlans.length > 0
      ? publishedUniquePlans
      : deduplicatePlansByCode(plans);

  return {
    totalUsers: dashStats?.users.total ?? usersPaged.total,
    activeDoctors: dashStats?.users.doctors ?? doctorsPaged.total,
    aiKnowledgeDocuments: aiDocsPaged.total,
    pendingVerifications: dashStats?.users.pendingDoctors ?? pendingApps.total,
    doctorSessions: dashStats?.consultations.total ?? consultationsPaged.total,
    violationReports: totalViolationReports,
    bannedAccounts: dashStats?.security.bannedAccounts ?? 0,
    publishedCarePrograms,
    draftCarePrograms,
    retiredCarePrograms,
    pendingViolationReports,
    resolvedViolationReports,
    publishedPlansCount: publishedUniquePlans.length,
    draftPlansCount,
    totalPlanVersions,
    planQuotas: {
      labels: displayPlans.map((p) => p.name || p.code || "Plan"),
      aiRequestLimits: displayPlans.map((p) => Number(p.aiRequestLimit ?? 0)),
      consultationLimits: displayPlans.map((p) =>
        Number(p.consultationLimitPerCycle ?? 0),
      ),
      careProgramLimits: displayPlans.map((p) =>
        Number(p.activeCareProgramLimit ?? 0),
      ),
    },
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
  };
}
