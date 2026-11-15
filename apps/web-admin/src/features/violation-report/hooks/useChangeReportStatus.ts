import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteViolationReport,
  flagReviewById,
  resolveViolationReport,
  updateViolationStatus,
  type UpdateViolationPayload,
} from "../services/report-management-service";
import { VIOLATIONS_QUERY_KEYS } from "./useReportManagement";

export function useChangeReportStatus() {
  const queryClient = useQueryClient();

  const invalidateViolations = async () => {
    await queryClient.invalidateQueries({
      queryKey: VIOLATIONS_QUERY_KEYS.all,
    });
  };

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateViolationPayload;
    }) => updateViolationStatus(id, payload),
    onSuccess: invalidateViolations,
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateViolationPayload;
    }) => resolveViolationReport(id, payload),
    onSuccess: invalidateViolations,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteViolationReport(id),
    onSuccess: invalidateViolations,
  });

  return {
    changeStatus: updateMutation.mutate,
    changeStatusAsync: updateMutation.mutateAsync,
    isChangingStatus: updateMutation.isPending,

    resolveReport: resolveMutation.mutate,
    resolveReportAsync: resolveMutation.mutateAsync,
    isResolving: resolveMutation.isPending,

    deleteReport: deleteMutation.mutate,
    deleteReportAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    isSubmitting:
      updateMutation.isPending ||
      resolveMutation.isPending ||
      deleteMutation.isPending,
  };
}

export function useFlagReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes: string }) =>
      flagReviewById(id, adminNotes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: VIOLATIONS_QUERY_KEYS.reviewsAll,
      });
    },
  });
}
