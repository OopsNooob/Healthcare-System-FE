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
  publishedCarePrograms: 0,
  draftCarePrograms: 0,
  retiredCarePrograms: 0,
  pendingViolationReports: 0,
  resolvedViolationReports: 0,
  publishedPlansCount: 0,
  draftPlansCount: 0,
  totalPlanVersions: 0,
  planQuotas: {
    labels: [],
    aiRequestLimits: [],
    consultationLimits: [],
    careProgramLimits: [],
  },
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
