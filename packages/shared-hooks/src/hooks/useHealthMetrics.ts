import { useCallback, useEffect, useMemo, useState } from "react";
import {
  correctHealthMetric,
  createHealthMetric,
  deleteHealthMetric,
  getAllHealthMetrics,
  getHealthMetricAlerts,
  markHealthMetricAsReviewed,
  voidHealthMetric,
  type HealthMetric,
  type HealthMetricsQuery,
  type MetricValueDetail,
  updateHealthMetric,
} from "../services/health-metrics.service";
import type { MetricReading, MetricsTypes } from "../utils/useMetricStatus";

type UseHealthMetricsOptions = HealthMetricsQuery & {
  enabled?: boolean;
};

export type CreateEntryInput = {
  metricType: MetricsTypes;
  recordedAt: string;
  primaryValue: number;
  secondaryValue?: number;
  recordedTimezone?: string;
};

export type UpdateEntryInput = CreateEntryInput & {
  id: string;
  reason?: string;
};

export function useHealthMetrics(options: UseHealthMetricsOptions = {}) {
  const {
    enabled = true,
    type,
    metricType,
    patientId,
    startDate,
    endDate,
    page,
    limit,
    cursor,
    sortBy,
    sortOrder,
  } = options;
  const [data, setData] = useState<HealthMetric[]>([]);
  const [alerts, setAlerts] = useState<HealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const requestQuery: HealthMetricsQuery = {
        ...(type !== undefined ? { type } : {}),
        ...(metricType !== undefined ? { metricType } : {}),
        ...(patientId !== undefined ? { patientId } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
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
    metricType,
    patientId,
    startDate,
    endDate,
    page,
    limit,
    cursor,
    sortBy,
    sortOrder,
  ]);

  const refreshAlerts = useCallback(async () => {
    if (!enabled) return [];
    const list = await getHealthMetricAlerts();
    setAlerts(list);
    return list;
  }, [enabled]);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const readings = useMemo(() => {
    const mapped = data
      .map((metric) => toMetricReading(metric))
      .filter((entry): entry is MetricReading => entry !== null);

    return mapped;
  }, [data]);

  const addEntry = useCallback(async (input: CreateEntryInput) => {
    setError(null);
    const values = buildMetricValues(
      input.metricType,
      input.primaryValue,
      input.secondaryValue,
      input.recordedAt,
    );

    const created = await createHealthMetric({
      type: input.metricType,
      metricType: input.metricType,
      values,
      recordedTimezone: input.recordedTimezone,
      recordedAt: input.recordedAt,
    });

    setData((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateEntry = useCallback(async (input: UpdateEntryInput) => {
    setError(null);
    const values = buildMetricValues(
      input.metricType,
      input.primaryValue,
      input.secondaryValue,
      input.recordedAt,
    );

    const updated = await updateHealthMetric(input.id, {
      type: input.metricType,
      metricType: input.metricType,
      values,
      recordedTimezone: input.recordedTimezone,
      recordedAt: input.recordedAt,
      reason: input.reason ?? "User correction",
    });

    setData((prev) =>
      prev.map((item) => (item.id === input.id ? updated : item)),
    );
    return updated;
  }, []);

  const correctEntry = useCallback(
    async (
      id: string,
      input: {
        metricType: MetricsTypes;
        primaryValue: number;
        secondaryValue?: number;
        recordedAt: string;
        recordedTimezone?: string;
        reason: string;
      },
    ) => {
      setError(null);
      const values = buildMetricValues(
        input.metricType,
        input.primaryValue,
        input.secondaryValue,
        input.recordedAt,
      );
      const corrected = await correctHealthMetric(id, {
        values,
        recordedAt: input.recordedAt,
        recordedTimezone: input.recordedTimezone,
        reason: input.reason,
      });
      setData((prev) => [
        corrected,
        ...prev.filter((item) => item.id !== id),
      ]);
      return corrected;
    },
    [],
  );

  const voidEntry = useCallback(async (id: string, reason = "Voided by user") => {
    setError(null);
    const voided = await voidHealthMetric(id, reason);
    setData((prev) => prev.filter((item) => item.id !== id));
    return voided;
  }, []);

  const reviewEntry = useCallback(async (id: string) => {
    setError(null);
    const reviewed = await markHealthMetricAsReviewed(id);
    setAlerts((prev) => prev.filter((item) => item.id !== id));
    return reviewed;
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    setError(null);
    await deleteHealthMetric(id);
    setData((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    data,
    alerts,
    readings,
    isLoading,
    error,
    addEntry,
    updateEntry,
    correctEntry,
    voidEntry,
    reviewEntry,
    removeEntry,
    refresh: fetchMetrics,
    refreshAlerts,
  };
}

function buildMetricValues(
  metricType: MetricsTypes,
  primaryValue: number,
  secondaryValue: number | undefined,
  recordedAt: string,
): Record<string, MetricValueDetail> {
  const recordedDetail = (value: number) => ({
    value,
    recordedAt,
  });

  if (metricType === "blood_pressure") {
    if (!Number.isFinite(secondaryValue)) {
      throw new Error("Diastolic value is required for blood pressure");
    }
    return {
      systolic: recordedDetail(primaryValue),
      diastolic: recordedDetail(secondaryValue as number),
    };
  }

  if (metricType === "water_intake" || metricType === "kcal_intake") {
    return {
      amount: recordedDetail(primaryValue),
    };
  }

  return {
    value: recordedDetail(primaryValue),
  };
}

function toMetricReading(metric: HealthMetric): MetricReading | null {
  const metricType = metric.type as MetricsTypes;
  const values = metric.values ?? {};

  if (metricType === "blood_pressure") {
    const systolic = values.systolic?.value;
    const diastolic = values.diastolic?.value;

    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
      return null;
    }

    return {
      id: metric.id,
      recordedAt: metric.recordedAt,
      primaryValue: Number(systolic),
      secondaryValue: Number(diastolic),
      status: "normal",
    };
  }

  const primary = values.value?.value ?? values.amount?.value;
  if (!Number.isFinite(primary)) {
    return null;
  }

  return {
    id: metric.id,
    recordedAt: metric.recordedAt,
    primaryValue: Number(primary),
    status: "normal",
  };
}
