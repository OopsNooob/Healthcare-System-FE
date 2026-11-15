import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDoctorRatingSummary,
  getReviewById,
  getReviewsList,
  getTopRatedDoctors,
  getUserViolations,
  getViolationById,
  getViolationReports,
  getViolationStatsOverview,
  type GetReviewsParams,
  type GetViolationsParams,
} from "../services/report-management-service";

export const VIOLATIONS_QUERY_KEYS = {
  all: ["violations"] as const,
  list: (params: GetViolationsParams) => ["violations", "list", params] as const,
  stats: ["violations", "stats"] as const,
  detail: (id: string) => ["violations", "detail", id] as const,
  userHistory: (userId: string, page = 1) =>
    ["violations", "user-history", userId, page] as const,
  reviewsAll: ["reviews-moderation"] as const,
  reviewsList: (params: GetReviewsParams) =>
    ["reviews-moderation", "list", params] as const,
  reviewDetail: (id: string) => ["reviews-moderation", "detail", id] as const,
  doctorRating: (doctorId: string) =>
    ["reviews-moderation", "doctor-rating", doctorId] as const,
  topDoctors: (limit: number) =>
    ["reviews-moderation", "top-doctors", limit] as const,
};

export function useReportList(params: GetViolationsParams) {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.list(params),
    queryFn: () => getViolationReports(params),
  });
}

export function useViolationStats() {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.stats,
    queryFn: () => getViolationStatsOverview(),
  });
}

export function useViolationDetail(id: string | null) {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => getViolationById(id!),
    enabled: Boolean(id),
  });
}

export function useUserViolationsHistory(userId: string | null, page = 1) {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.userHistory(userId ?? "", page),
    queryFn: () => getUserViolations(userId!, page, 5),
    enabled: Boolean(userId),
  });
}

export function useReviewsModerationList(params: GetReviewsParams) {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.reviewsList(params),
    queryFn: () => getReviewsList(params),
  });
}

export function useReviewDetail(id: string | null) {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.reviewDetail(id ?? ""),
    queryFn: () => getReviewById(id!),
    enabled: Boolean(id),
  });
}

export function useDoctorRating(doctorId: string | null) {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.doctorRating(doctorId ?? ""),
    queryFn: () => getDoctorRatingSummary(doctorId!),
    enabled: Boolean(doctorId),
  });
}

export function useTopRatedDoctors(limit = 6) {
  return useQuery({
    queryKey: VIOLATIONS_QUERY_KEYS.topDoctors(limit),
    queryFn: () => getTopRatedDoctors(limit),
  });
}

export function useInvalidateViolationQueries() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: VIOLATIONS_QUERY_KEYS.all,
    });
  };
}
