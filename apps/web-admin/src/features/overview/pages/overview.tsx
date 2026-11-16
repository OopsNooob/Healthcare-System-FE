import { OverviewCard } from "@repo/ui/components/data-display/overview-card";
import {
  Activity,
  FileText,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import type { ChartOptions } from "chart.js";
import { LineChart } from "@repo/ui/components/ui/line-chart";
import { BarChart } from "@repo/ui/components/ui/vertical-bar-chart";
import { useOverview } from "../hooks/useOverview";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";

export function Overview() {
  const { summary, isLoading, error, refresh } = useOverview();
  const { t, i18n } = useTranslation();
  const { resolvedTheme, theme } = useTheme();

  const isDark = (resolvedTheme ?? theme) === "dark";

  const lineChartLabels = summary.monthly.labels.map((label) =>
    label ? t(`overview.months.${label}`, label) : "",
  );
  const barChartLabels = summary.weekly.labels.map((label) =>
    label ? t(`overview.weekdays.${label}`, label) : "",
  );

  const lineChartDatasets = [
    {
      label: t("overview.patients"),
      data: summary.monthly.totalUsers,
      borderColor: isDark ? "rgb(96, 165, 250)" : "rgb(59, 130, 246)",
      backgroundColor: isDark
        ? "rgba(96, 165, 250, 0.14)"
        : "rgba(59, 130, 246, 0.14)",
      tension: 0.4,
      fill: true,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
    },
    {
      label: t("overview.doctors"),
      data: summary.monthly.activeDoctors,
      borderColor: isDark ? "rgb(52, 211, 153)" : "rgb(16, 185, 129)",
      backgroundColor: isDark
        ? "rgba(52, 211, 153, 0.08)"
        : "rgba(16, 185, 129, 0.08)",
      tension: 0.35,
      fill: false,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
    },
    {
      label: t("overview.aiKnowledgeDocs"),
      data: summary.monthly.aiDocuments,
      borderColor: "rgb(245, 158, 11)",
      backgroundColor: "rgba(245, 158, 11, 0.12)",
      tension: 0.4,
      fill: true,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
    },
  ];

  const barChartDatasets = [
    {
      label: t("overview.consultations"),
      data: summary.weekly.doctorSessions,
      borderColor: isDark ? "rgb(96, 165, 250)" : "rgb(59, 130, 246)",
      backgroundColor: isDark ? "rgb(96, 165, 250)" : "rgb(59, 130, 246)",
      borderRadius: 6,
      maxBarThickness: 14,
    },
    {
      label: t("overview.reports"),
      data: summary.weekly.violationReports,
      borderColor: isDark ? "rgb(248, 113, 113)" : "rgb(239, 68, 68)",
      backgroundColor: isDark ? "rgb(248, 113, 113)" : "rgb(239, 68, 68)",
      borderRadius: 6,
      maxBarThickness: 14,
    },
  ];

  const lineOptions: ChartOptions<"line"> = {
    plugins: {
      legend: {
        align: "end",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxHeight: 6,
          boxWidth: 6,
          padding: 14,
          color: isDark ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)",
          font: {
            size: 11,
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: "rgb(148, 163, 184)",
          font: { size: 11 },
        },
        grid: { color: "rgba(148, 163, 184, 0.18)" },
        border: { display: false },
      },
      x: {
        ticks: { color: "rgb(148, 163, 184)", font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const barOptions: ChartOptions<"bar"> = {
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: "rgb(148, 163, 184)",
          font: { size: 11 },
        },
        grid: { color: "rgba(148, 163, 184, 0.18)" },
        border: { display: false },
      },
      x: {
        ticks: { color: "rgb(148, 163, 184)", font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const overviewStats = [
    {
      title: t("overview.totalUsers"),
      icon: <UsersRound size={18} />,
      stats: summary.totalUsers,
      subText: t("overview.bannedCount", { count: summary.bannedAccounts }),
      iconClassName:
        "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      title: t("overview.activeDoctors"),
      icon: <Stethoscope size={18} />,
      stats: summary.activeDoctors,
      subText: t("overview.consultationsTotal", {
        count: summary.doctorSessions,
      }),
      iconClassName:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      title: t("overview.aiKnowledgeDocs"),
      icon: <FileText size={18} />,
      stats: summary.aiKnowledgeDocuments,
      subText: t("overview.thisMonth"),
      iconClassName:
        "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
    {
      title: t("overview.pendingVerifications"),
      icon: <ShieldAlert size={18} />,
      stats: summary.pendingVerifications,
      subText: t("overview.needsReview"),
      iconClassName:
        "bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400",
    },
  ];

  const locale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const healthBadgeClass = (state: "ok" | "degraded" | "down") =>
    state === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
      : state === "degraded"
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {t("overview.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {today}
            </p>
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${healthBadgeClass(summary.systemHealth.live)}`}
            >
              <Activity size={13} />
              {t("overview.healthLive")}:{" "}
              {t(`overview.healthState.${summary.systemHealth.live}`)}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${healthBadgeClass(summary.systemHealth.ready)}`}
            >
              <Activity size={13} />
              {t("overview.healthReady")}:{" "}
              {t(`overview.healthState.${summary.systemHealth.ready}`)}
            </span>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? t("overview.loading") : t("overview.refresh")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60"
              />
            ))}
          </div>
        ) : (
          <ul className="m-0 grid w-full list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((item) => (
              <OverviewCard key={item.title} {...item} />
            ))}
          </ul>
        )}

        <div className="mt-5 grid min-h-[130px] grid-cols-1 gap-4 xl:grid-cols-3">
          <LineChart
            title={t("overview.platformGrowth")}
            subtitle={t("overview.platformGrowthDesc")}
            labels={lineChartLabels}
            datasets={lineChartDatasets}
            options={lineOptions}
            className="xl:col-span-2"
            height={460}
          />

          <BarChart
            title={t("overview.weeklyActivity")}
            subtitle={t("overview.weeklyActivityDesc")}
            labels={barChartLabels}
            datasets={barChartDatasets}
            options={barOptions}
            className="xl:col-span-1"
            height={460}
          />
        </div>

        <div className="mt-8 border-t border-slate-200/70 dark:border-slate-800 pt-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t("overview.careProgramKPIs")}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60"
                />
              ))}
            </div>
          ) : (
            <ul className="m-0 grid w-full list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
              <OverviewCard
                title={t("overview.activeEnrollments")}
                icon={<UsersRound size={18} />}
                stats={summary.activeEnrollments}
                subText={t("overview.activeEnrollmentsDesc")}
                iconClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              />
              <OverviewCard
                title={t("overview.openCareAlerts")}
                icon={<ShieldAlert size={18} />}
                stats={summary.openAlerts}
                subText={t("overview.acknowledgedAlertsCount", {
                  count: summary.acknowledgedAlerts,
                })}
                iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
              />
              <OverviewCard
                title={t("overview.resolvedCareAlerts")}
                icon={<Stethoscope size={18} />}
                stats={summary.resolvedAlerts}
                subText={t("overview.violationTotalCount", {
                  count: summary.violationReports,
                })}
                iconClassName="bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
              />
            </ul>
          )}

          {summary.tierDistribution.labels.length > 0 && (
            <div className="mt-5 grid min-h-[130px] grid-cols-1 gap-4 xl:grid-cols-2">
              <BarChart
                title={t("overview.tierUsage")}
                subtitle={t("overview.tierUsageDesc")}
                labels={summary.tierDistribution.labels}
                datasets={[
                  {
                    label: t("overview.ordersCount"),
                    data: summary.tierDistribution.orderCounts,
                    backgroundColor: isDark
                      ? "rgb(16, 185, 129)"
                      : "rgb(52, 211, 153)",
                    borderColor: isDark
                      ? "rgb(16, 185, 129)"
                      : "rgb(52, 211, 153)",
                    borderRadius: 6,
                  },
                ]}
                options={barOptions}
                className="xl:col-span-2"
                height={300}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
