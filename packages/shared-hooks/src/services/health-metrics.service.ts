import type { FeTypes } from "@healthcare/api-client";
import { mobileApi } from "../api";

export type MetricType =
  | "blood_pressure"
  | "heart_rate"
  | "blood_glucose"
  | "oxygen_saturation"
  | "body_temperature"
  | "respiratory_rate"
  | "bmi"
  | "weight"
  | "height"
  | "water_intake"
  | "kcal_intake";

export type MetricValueDetail = {
  value: number;
  recordedAt: string;
};

export type HealthMetric = {
  id: string;
  patientId: string;
  type: MetricType;
  metricType: MetricType;
  values: Record<string, MetricValueDetail>;
  unit: string;
  recordedAt: string;
  createdAt?: string;
  updatedAt?: string;
  validationStatus?: "valid" | "rejected" | "superseded" | "voided";
  validationReasonCodes?: string[];
  replacesMetricId?: string;
  voidedAt?: string;
  voidReason?: string;
};

type ApiHealthMetric = {
  id?: string;
  _id?: string;
  patientId?: string;
  type?: MetricType;
  metricType?: MetricType;
  meta?: {
    patientId?: string;
    metricType?: MetricType;
    unit?: string;
  };
  values: Record<string, unknown>;
  unit?: string;
  recordedAt: string;
  createdAt?: string;
  updatedAt?: string;
  validationStatus?: "valid" | "rejected" | "superseded" | "voided";
  validationReasonCodes?: string[];
  replacesMetricId?: string;
  voidedAt?: string;
  voidReason?: string;
};

export type HealthMetricsResponse = {
  statusCode: number;
  message: string;
  data: ApiHealthMetric[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type HealthMetricMutationResponse = {
  statusCode: number;
  message: string;
  data?: ApiHealthMetric;
};

export type HealthMetricsQuery = {
  type?: MetricType;
  metricType?: MetricType;
  patientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: "recordedAt" | "createdAt";
  sortOrder?: 1 | -1;
};

export type CreateHealthMetricPayload = {
  type?: MetricType;
  metricType?: MetricType;
  values: Record<string, MetricValueDetail | number>;
  source?: "manual" | "device" | "clinician" | "import";
  recordedTimezone?: string;
  recordedAt?: string;
};

export type UpdateHealthMetricPayload = {
  type?: MetricType;
  metricType?: MetricType;
  values?: Record<string, MetricValueDetail | number>;
  recordedAt?: string;
  recordedTimezone?: string;
  reason?: string;
};

function normalizeValues(
  rawValues: Record<string, unknown> | undefined,
  recordedAt: string,
): Record<string, MetricValueDetail> {
  const result: Record<string, MetricValueDetail> = {};
  if (!rawValues) return result;
  for (const [key, entry] of Object.entries(rawValues)) {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      result[key] = { value: entry, recordedAt };
    } else if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { value?: unknown }).value === "number"
    ) {
      const detail = entry as { value: number; recordedAt?: string };
      result[key] = {
        value: detail.value,
        recordedAt: detail.recordedAt ?? recordedAt,
      };
    }
  }
  return result;
}

function mapApiMetric(item: ApiHealthMetric): HealthMetric {
  const resolvedType = (item.metricType ??
    item.type ??
    item.meta?.metricType ??
    "blood_pressure") as MetricType;
  return {
    id: String(item.id ?? item._id ?? ""),
    patientId: String(item.patientId ?? item.meta?.patientId ?? ""),
    type: resolvedType,
    metricType: resolvedType,
    values: normalizeValues(item.values, item.recordedAt),
    unit: item.unit ?? item.meta?.unit ?? "",
    recordedAt: item.recordedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    validationStatus: item.validationStatus,
    validationReasonCodes: item.validationReasonCodes,
    replacesMetricId: item.replacesMetricId,
    voidedAt: item.voidedAt,
    voidReason: item.voidReason,
  };
}

function normalizeQuery(
  query: HealthMetricsQuery,
): FeTypes.HealthMetricsFindAllRequest["query"] {
  const limit = query.limit ?? undefined;
  const normalizedLimit =
    typeof limit === "number" ? Math.min(limit, 100) : undefined;

  return {
    page: query.page,
    limit: normalizedLimit,
    cursor: query.cursor,
    metricType: query.metricType ?? query.type,
    startDate: query.startDate,
    endDate: query.endDate,
    patientId: query.patientId,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
}

export async function getHealthMetrics(
  query: HealthMetricsQuery = {},
): Promise<HealthMetric[]> {
  const response = await mobileApi.healthMetricsFindAll({
    query: normalizeQuery(query),
  });
  const items = ((response as unknown as HealthMetricsResponse)?.data ??
    []) as ApiHealthMetric[];
  return items.map(mapApiMetric);
}

export async function getHealthMetricsPage(
  query: HealthMetricsQuery = {},
): Promise<{
  data: HealthMetric[];
  pagination?: HealthMetricsResponse["pagination"];
}> {
  const response = await mobileApi.healthMetricsFindAll({
    query: normalizeQuery(query),
  });
  const typed = response as unknown as HealthMetricsResponse;
  const items = typed?.data ?? [];
  return {
    data: items.map(mapApiMetric),
    pagination: typed?.pagination,
  };
}

export async function getAllHealthMetrics(
  query: HealthMetricsQuery = {},
): Promise<HealthMetric[]> {
  const limit = Math.min(query.limit ?? 100, 100);
  let page = query.page ?? 1;
  let all: HealthMetric[] = [];
  let totalPages = 1;

  do {
    const { data, pagination } = await getHealthMetricsPage({
      ...query,
      page,
      limit,
    });

    all = all.concat(data);
    totalPages = pagination?.pages ?? page;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export async function getHealthMetricById(id: string): Promise<HealthMetric> {
  const response = await mobileApi.healthMetricsFindOne({ params: { id } });
  return mapApiMetric(response.data as unknown as ApiHealthMetric);
}

export async function getHealthMetricStatistics(
  type: MetricType,
  query: HealthMetricsQuery = {},
): Promise<FeTypes.HealthMetricsGetStatisticsResponse["data"]> {
  const response = await mobileApi.healthMetricsGetStatistics({
    params: { type },
    query: normalizeQuery(query),
  });
  return response.data;
}

export async function getHealthMetricAlerts(): Promise<HealthMetric[]> {
  const response = await mobileApi.healthMetricsGetAlerts();
  const items = ((response as { data?: ApiHealthMetric[] })?.data ??
    []) as ApiHealthMetric[];
  return items.map(mapApiMetric);
}

function serializeValuesForApi(
  rawValues: Record<string, unknown> | undefined,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!rawValues) return result;
  for (const [key, entry] of Object.entries(rawValues)) {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      result[key] = entry;
    } else if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { value?: unknown }).value === "number" &&
      Number.isFinite((entry as { value: number }).value)
    ) {
      result[key] = (entry as { value: number }).value;
    }
  }
  return result;
}

export async function createHealthMetric(
  payload: CreateHealthMetricPayload,
): Promise<HealthMetric> {
  const metricType = payload.metricType ?? payload.type ?? "blood_pressure";
  const response = await mobileApi.healthMetricsCreate({
    metricType,
    values: serializeValuesForApi(payload.values as Record<string, unknown>),
    source: payload.source ?? "manual",
    recordedTimezone: payload.recordedTimezone,
    recordedAt: payload.recordedAt,
  });

  return mapApiMetric(response.data as unknown as ApiHealthMetric);
}

export async function correctHealthMetric(
  id: string,
  payload: {
    values: Record<string, unknown>;
    recordedAt: string;
    recordedTimezone?: string;
    reason: string;
  },
): Promise<HealthMetric> {
  const response = await mobileApi.healthMetricsCorrect({
    params: { id },
    body: {
      values: serializeValuesForApi(payload.values),
      recordedAt: payload.recordedAt,
      recordedTimezone: payload.recordedTimezone,
      reason: payload.reason,
    },
  });

  return mapApiMetric(response.data as unknown as ApiHealthMetric);
}

export async function markHealthMetricAsReviewed(
  id: string,
): Promise<HealthMetric> {
  const response = await mobileApi.healthMetricsMarkAsReviewed({
    params: { id },
  });
  return mapApiMetric(response.data as unknown as ApiHealthMetric);
}

export async function voidHealthMetric(
  id: string,
  reason = "Voided by user",
): Promise<HealthMetric> {
  const response = await mobileApi.healthMetricsVoid({
    params: { id },
    body: { reason },
  });
  return mapApiMetric(response.data as unknown as ApiHealthMetric);
}

export async function updateHealthMetric(
  id: string,
  payload: UpdateHealthMetricPayload,
): Promise<HealthMetric> {
  return correctHealthMetric(id, {
    values: (payload.values ?? {}) as Record<string, unknown>,
    recordedAt: payload.recordedAt ?? new Date().toISOString(),
    recordedTimezone: payload.recordedTimezone,
    reason: payload.reason ?? "User correction",
  });
}

export async function deleteHealthMetric(
  id: string,
  reason = "Voided by user",
): Promise<HealthMetricMutationResponse> {
  const voided = await voidHealthMetric(id, reason);
  return {
    statusCode: 200,
    message: "Voided",
    data: {
      id: voided.id,
      _id: voided.id,
      patientId: voided.patientId,
      type: voided.type,
      metricType: voided.metricType,
      values: voided.values,
      unit: voided.unit,
      recordedAt: voided.recordedAt,
      voidedAt: voided.voidedAt,
      voidReason: voided.voidReason,
      validationStatus: voided.validationStatus,
    },
  };
}
