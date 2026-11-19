import { useCallback, useEffect, useState } from "react";
import {
  getAllHealthMetrics,
  type HealthMetric,
  type HealthMetricsQuery,
} from "../services/health-metrics.service";

type UseHealthMetricsOptions = HealthMetricsQuery & {
  enabled?: boolean;
};

export function useHealthMetrics(options: UseHealthMetricsOptions = {}) {
  const {
    enabled = true,
    type,
    patientId,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  } = options;
  const [data, setData] = useState<HealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const requestQuery: HealthMetricsQuery = {
        ...(type !== undefined ? { type } : {}),
        ...(patientId !== undefined ? { patientId } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(sortBy !== undefined ? { sortBy } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      };
      const metrics = await getAllHealthMetrics(requestQuery);
      setData(metrics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load health metrics",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    enabled,
    type,
    patientId,
    startDate,
    endDate,
    page,
    limit,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchMetrics,
  };
}
