import { OverviewCard } from "@repo/ui/components/data-display/overview-card";
import {
  MessageSquareText,
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
  const { summary, isLoading, error } = useOverview();
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  const isDark = theme === "dark";

  const lineChartLabels = summary.monthly.labels;

  const barChartLabels = summary.weekly.labels;

  const lineChartDatasets = [
    {
      label: t("overview.patients"),
      data: summary.monthly.totalUsers,
      borderColor: isDark ? "rgb(96, 165, 250)" : "rgb(59, 130, 246)",
      backgroundColor: isDark ? "rgba(96, 165, 250, 0.14)" : "rgba(59, 130, 246, 0.14)",
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
      backgroundColor: isDark ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.08)",
      tension: 0.35,
      fill: false,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
    },
    {
      label: t("overview.aiSessions"),
      data: summary.monthly.aiChatSessions,
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
          color: "rgb(100, 116, 139)",
          font: {
            size: 11,
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 2400,
        ticks: {
          stepSize: 600,
          color: "rgb(148, 163, 184)",
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(148, 163, 184, 0.18)",
        },
        border: {
          display: false,
        },
      },
      x: {
        ticks: {
          color: "rgb(148, 163, 184)",
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
  };

  const barOptions: ChartOptions<"bar"> = {
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
          color: "rgb(148, 163, 184)",
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(148, 163, 184, 0.18)",
        },
        border: {
          display: false,
        },
      },
      x: {
        ticks: {
          color: "rgb(148, 163, 184)",
          font: {
            size: 11,
          },
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
  };

  const overviewStats = [
    {
      title: t("overview.totalUsers"),
      icon: <UsersRound size={18} />,
      stats: isLoading ? 0 : summary.totalUsers,
      subText: t("overview.vsLastMonth"),
      comparedStats: 12.5,
      iconClassName: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      title: t("overview.activeDoctors"),
      icon: <Stethoscope size={18} />,
      stats: isLoading ? 0 : summary.activeDoctors,
      subText: t("overview.vsLastMonth"),
      comparedStats: 8.2,
      iconClassName: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      title: t("overview.aiChatSessions"),
      icon: <MessageSquareText size={18} />,
      stats: isLoading ? 0 : summary.aiChatSessions,
      subText: t("overview.thisMonth"),
      comparedStats: 31.4,
      iconClassName: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
    {
      title: t("overview.pendingVerifications"),
      icon: <ShieldAlert size={18} />,
      stats: isLoading ? 0 : summary.pendingVerifications,
      subText: t("overview.needsReview"),
      comparedStats: -5,
      iconClassName: "bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400",
    },
  ];

  const date = new Date();
  const today = date.toLocaleDateString("en-US", {
    weekday: "long", // "Monday"
    year: "numeric", // "2024"
    month: "long", // "May"
    day: "numeric", // "15"
  });

  return (
    <div className="w-full p-6">
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t("overview.title")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{today}</p>
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {isLoading ? t("overview.loading") : null}
          </button>
        </div>

        <ul className="m-0 grid w-full list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((item) => (
            <OverviewCard key={item.title} {...item} />
          ))}
        </ul>

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
      </div>
    </div>
  );
}
