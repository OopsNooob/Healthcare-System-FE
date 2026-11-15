import { useQuery } from "@tanstack/react-query";
import {
  getOverviewSummary,
  type OverviewSummary,
} from "../services/overview.service";

const initialSummary: OverviewSummary = {
  totalUsers: 0,
  activeDoctors: 0,
  aiKnowledgeDocuments: 0,
  pendingVerifications: 0,
  doctorSessions: 0,
  violationReports: 0,
  bannedAccounts: 0,
  activeEnrollments: 0,
  openAlerts: 0,
  acknowledgedAlerts: 0,
  resolvedAlerts: 0,
  systemHealth: {
    live: "down",
    ready: "down",
  },
  monthly: {
    labels: Array.from({ length: 8 }, () => ""),
    totalUsers: Array.from({ length: 8 }, () => 0),
    activeDoctors: Array.from({ length: 8 }, () => 0),
    aiDocuments: Array.from({ length: 8 }, () => 0),
  },
  weekly: {
    labels: Array.from({ length: 7 }, () => ""),
    doctorSessions: Array.from({ length: 7 }, () => 0),
    violationReports: Array.from({ length: 7 }, () => 0),
  },
  tierDistribution: {
    labels: [],
    planPrices: [],
    orderCounts: [],
  },
};

export function useOverview() {
  const query = useQuery({
    queryKey: ["overview", "summary"],
    queryFn: () => getOverviewSummary(),
  });

  const error =
    query.error instanceof Error
      ? query.error.message
      : query.isError
        ? "Failed to load overview data"
        : null;

  return {
    summary: query.data ?? initialSummary,
    isLoading: query.isLoading,
    error,
    refresh: async () => {
      await query.refetch();
    },
  };
}
