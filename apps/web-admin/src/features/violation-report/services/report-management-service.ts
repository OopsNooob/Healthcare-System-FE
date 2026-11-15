import { normalizePaginatedList, type FeTypes } from "@healthcare/api-client";
import { webAdminApi } from "@/lib/api";
import type {
  DoctorRatingSummary,
  ReportStatus,
  ReportType,
  ResolutionAction,
  ReviewModerationItem,
  TopRatedDoctorItem,
  ViolationReport,
  ViolationStatsOverview,
} from "../types";

export interface GetViolationsParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
  report_type?: ReportType;
}

export interface ViolationsListResult {
  items: ViolationReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateViolationPayload {
  status?: ReportStatus;
  resolution_note?: string;
  action_taken?: ResolutionAction;
}

export interface GetReviewsParams {
  page?: number;
  limit?: number;
  doctorId?: string;
  rating?: number;
  sortBy?: "createdAt" | "rating";
  sortOrder?: -1 | 1;
}

export interface ReviewsListResult {
  items: ReviewModerationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RawUserRef {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  role?: "patient" | "doctor" | "admin";
  accountStatus?: "active" | "banned";
}

const VALID_REPORT_TYPES = new Set<ReportType>([
  "harassment",
  "spam",
  "misinformation",
  "inappropriate_content",
  "impersonation",
  "fraud",
  "ai_hallucination",
  "other",
]);

const VALID_STATUSES = new Set<ReportStatus>([
  "pending",
  "processing",
  "resolved",
  "dismissed",
]);

const VALID_ACTIONS = new Set<ResolutionAction>([
  "warning",
  "suspend",
  "ban",
  "none",
]);

const userCache = new Map<string, RawUserRef>();

function extractUserId(ref: unknown): string {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object") {
    const obj = ref as RawUserRef;
    return obj._id ?? obj.id ?? "";
  }
  return "";
}

function extractUserObject(ref: unknown): RawUserRef | null {
  if (ref && typeof ref === "object") {
    return ref as RawUserRef;
  }
  return null;
}

async function resolveUserRefs(ids: string[]): Promise<Map<string, RawUserRef>> {
  const uniqueMissing = Array.from(
    new Set(ids.filter((id) => Boolean(id) && !userCache.has(id))),
  );

  if (uniqueMissing.length > 0) {
    await Promise.allSettled(
      uniqueMissing.map(async (id) => {
        try {
          const user = await webAdminApi.usersFindOne({ params: { id } });
          if (user) {
            userCache.set(id, {
              id,
              fullName: user.fullName,
              email: user.email,
              role: user.role,
              accountStatus: user.accountStatus,
            });
          }
        } catch {
          // Leave unresolved if user was deleted or inaccessible
        }
      }),
    );
  }

  return userCache;
}

function mapRawViolation(
  raw: Record<string, unknown>,
  resolvedUsers: Map<string, RawUserRef>,
): ViolationReport {
  const reporterRef = extractUserObject(raw.reporterId);
  const reporterId = extractUserId(raw.reporterId);
  const cachedReporter = reporterId ? resolvedUsers.get(reporterId) : undefined;

  const reportedRef = extractUserObject(raw.reportedUserId);
  const reportedUserId = extractUserId(raw.reportedUserId);
  const cachedReported = reportedUserId
    ? resolvedUsers.get(reportedUserId)
    : undefined;

  const resolvedByRef = extractUserObject(raw.resolvedBy);
  const resolvedById = extractUserId(raw.resolvedBy);
  const cachedResolver = resolvedById
    ? resolvedUsers.get(resolvedById)
    : undefined;

  const rawType = String(raw.reportType ?? raw.report_type ?? "other");
  const reportType: ReportType = VALID_REPORT_TYPES.has(rawType as ReportType)
    ? (rawType as ReportType)
    : "other";

  const rawStatus = String(raw.status ?? "pending");
  const status: ReportStatus = VALID_STATUSES.has(rawStatus as ReportStatus)
    ? (rawStatus as ReportStatus)
    : "pending";

  const rawAction = raw.actionTaken ?? raw.action_taken;
  const actionTaken =
    typeof rawAction === "string" &&
    VALID_ACTIONS.has(rawAction as ResolutionAction)
      ? (rawAction as ResolutionAction)
      : undefined;

  return {
    id: String(raw._id ?? raw.id ?? ""),
    reporterId,
    reporterName:
      reporterRef?.fullName ?? cachedReporter?.fullName ?? reporterId,
    reporterEmail: reporterRef?.email ?? cachedReporter?.email ?? "",
    reportedUserId,
    reportedUserName:
      reportedRef?.fullName ?? cachedReported?.fullName ?? reportedUserId,
    reportedUserEmail: reportedRef?.email ?? cachedReported?.email ?? "",
    reportedUserRole: reportedRef?.role ?? cachedReported?.role,
    reportedUserStatus:
      reportedRef?.accountStatus ?? cachedReported?.accountStatus,
    reportType,
    reason: String(raw.reason ?? ""),
    status,
    resolutionNote:
      typeof raw.resolutionNote === "string"
        ? raw.resolutionNote
        : typeof raw.resolution_note === "string"
          ? raw.resolution_note
          : undefined,
    actionTaken,
    resolvedBy: resolvedById || undefined,
    resolvedByName:
      resolvedByRef?.fullName ?? cachedResolver?.fullName ?? undefined,
    resolvedAt:
      typeof raw.resolvedAt === "string" ? raw.resolvedAt : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

async function mapRawViolationList(
  rows: Array<Record<string, unknown>>,
): Promise<ViolationReport[]> {
  const missingIds: string[] = [];
  for (const row of rows) {
    const rObj = extractUserObject(row.reporterId);
    const rId = extractUserId(row.reporterId);
    if (rId && !rObj?.fullName) missingIds.push(rId);

    const uObj = extractUserObject(row.reportedUserId);
    const uId = extractUserId(row.reportedUserId);
    if (uId && !uObj?.fullName) missingIds.push(uId);

    const aObj = extractUserObject(row.resolvedBy);
    const aId = extractUserId(row.resolvedBy);
    if (aId && !aObj?.fullName) missingIds.push(aId);
  }

  const resolvedMap = await resolveUserRefs(missingIds);
  return rows.map((row) => mapRawViolation(row, resolvedMap));
}

export async function getViolationReports(
  params: GetViolationsParams = {},
): Promise<ViolationsListResult> {
  const response = await webAdminApi.violationsFindAll({
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...(params.status ? { status: params.status } : {}),
      ...(params.report_type ? { report_type: params.report_type } : {}),
    },
  });

  const normalized = normalizePaginatedList<Record<string, unknown>>(
    response,
    params.page ?? 1,
    params.limit ?? 10,
  );

  const items = await mapRawViolationList(normalized.items);
  return {
    items,
    total: normalized.total,
    page: normalized.page,
    limit: normalized.limit,
    totalPages: normalized.totalPages,
  };
}

export async function getViolationStatsOverview(): Promise<ViolationStatsOverview> {
  const response = await webAdminApi.violationsGetStats();
  const payload =
    (response as unknown as { data?: ViolationStatsOverview })?.data ?? response;

  return {
    total: Number(payload?.total ?? 0),
    pending: Number(payload?.pending ?? 0),
    resolved: Number(payload?.resolved ?? 0),
    by_type: (payload?.by_type as Record<string, number>) ?? {},
  };
}

export async function getViolationById(id: string): Promise<ViolationReport> {
  const response = await webAdminApi.violationsFindById({ params: { id } });
  const raw =
    (response as unknown as { data?: Record<string, unknown> })?.data ??
    (response as unknown as Record<string, unknown>);
  const [mapped] = await mapRawViolationList([raw]);
  return mapped;
}

export async function getUserViolations(
  userId: string,
  page = 1,
  limit = 10,
): Promise<ViolationsListResult> {
  const response = await webAdminApi.violationsFindByUserId({
    params: { userId },
    query: { page, limit },
  });

  const normalized = normalizePaginatedList<Record<string, unknown>>(
    response,
    page,
    limit,
  );

  const items = await mapRawViolationList(normalized.items);
  return {
    items,
    total: normalized.total,
    page: normalized.page,
    limit: normalized.limit,
    totalPages: normalized.totalPages,
  };
}

export async function updateViolationStatus(
  id: string,
  payload: UpdateViolationPayload,
): Promise<ViolationReport> {
  const response = await webAdminApi.violationsUpdate({
    params: { id },
    body: payload,
  });
  const raw =
    (response as unknown as { data?: Record<string, unknown> })?.data ??
    (response as unknown as Record<string, unknown>);
  const [mapped] = await mapRawViolationList([raw]);
  return mapped;
}

export async function resolveViolationReport(
  id: string,
  payload: UpdateViolationPayload,
): Promise<ViolationReport> {
  const response = await webAdminApi.violationsResolve({
    params: { id },
    body: payload,
  });
  const raw =
    (response as unknown as { data?: Record<string, unknown> })?.data ??
    (response as unknown as Record<string, unknown>);
  const [mapped] = await mapRawViolationList([raw]);
  return mapped;
}

export async function deleteViolationReport(id: string): Promise<void> {
  await webAdminApi.violationsDelete({ params: { id } });
}

function mapRawReview(
  raw: Record<string, unknown>,
  resolvedUsers: Map<string, RawUserRef>,
): ReviewModerationItem {
  const patientObj = extractUserObject(raw.patientId);
  const patientId = extractUserId(raw.patientId);
  const cachedPatient = patientId ? resolvedUsers.get(patientId) : undefined;

  const doctorObj = extractUserObject(raw.doctorId);
  const doctorId = extractUserId(raw.doctorId);
  const cachedDoctor = doctorId ? resolvedUsers.get(doctorId) : undefined;

  return {
    id: String(raw._id ?? raw.id ?? ""),
    patientId,
    patientName:
      patientObj?.fullName ?? cachedPatient?.fullName ?? patientId,
    doctorId,
    doctorName: doctorObj?.fullName ?? cachedDoctor?.fullName ?? doctorId,
    consultationId: extractUserId(raw.consultationId) || String(raw.consultationId ?? ""),
    rating: Number(raw.rating ?? 0),
    comment: String(raw.comment ?? ""),
    helpfulCount: Number(raw.helpfulCount ?? 0),
    flagged: Boolean(raw.flagged),
    adminNotes:
      typeof raw.adminNotes === "string" ? raw.adminNotes : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
  };
}

export async function getReviewsList(
  params: GetReviewsParams = {},
): Promise<ReviewsListResult> {
  const response = await webAdminApi.reviewsFindAll({
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      sortBy: params.sortBy ?? "createdAt",
      sortOrder: params.sortOrder ?? -1,
      ...(params.doctorId ? { doctorId: params.doctorId } : {}),
      ...(typeof params.rating === "number" ? { rating: params.rating } : {}),
    },
  });

  const normalized = normalizePaginatedList<Record<string, unknown>>(
    response,
    params.page ?? 1,
    params.limit ?? 10,
  );

  const missingIds: string[] = [];
  for (const row of normalized.items) {
    const pObj = extractUserObject(row.patientId);
    const pId = extractUserId(row.patientId);
    if (pId && !pObj?.fullName) missingIds.push(pId);

    const dObj = extractUserObject(row.doctorId);
    const dId = extractUserId(row.doctorId);
    if (dId && !dObj?.fullName) missingIds.push(dId);
  }

  const resolvedMap = await resolveUserRefs(missingIds);
  const items = normalized.items.map((row) => mapRawReview(row, resolvedMap));

  return {
    items,
    total: normalized.total,
    page: normalized.page,
    limit: normalized.limit,
    totalPages: normalized.totalPages,
  };
}

export async function getReviewById(id: string): Promise<ReviewModerationItem> {
  const response = await webAdminApi.reviewsFindOne({ params: { id } });
  const raw = ((response as unknown as { data?: Record<string, unknown> })?.data ??
    response) as unknown as Record<string, unknown>;

  const pId = extractUserId(raw.patientId);
  const dId = extractUserId(raw.doctorId);
  const resolvedMap = await resolveUserRefs([pId, dId]);
  return mapRawReview(raw, resolvedMap);
}

export async function flagReviewById(
  id: string,
  adminNotes: string,
): Promise<ReviewModerationItem> {
  const response = await webAdminApi.reviewsFlagReview({
    params: { id },
    body: { adminNotes },
  } as unknown as FeTypes.ReviewsFlagReviewRequest);

  const raw = ((response as unknown as { data?: Record<string, unknown> })?.data ??
    response) as unknown as Record<string, unknown>;

  const pId = extractUserId(raw.patientId);
  const dId = extractUserId(raw.doctorId);
  const resolvedMap = await resolveUserRefs([pId, dId]);
  return mapRawReview(raw, resolvedMap);
}

export async function getDoctorRatingSummary(
  doctorId: string,
): Promise<DoctorRatingSummary> {
  const response = await webAdminApi.reviewsGetDoctorRating({
    params: { doctorId },
  });
  const data = (response as unknown as { data?: FeTypes.ReviewsGetDoctorRatingResponse["data"] })
    ?.data ?? (response as unknown as FeTypes.ReviewsGetDoctorRatingResponse["data"]);

  return {
    doctorId: String(data?.doctorId ?? doctorId),
    averageRating: Number(data?.averageRating ?? 0),
    totalReviews: Number(data?.totalReviews ?? 0),
    starDistribution: {
      fiveStar: Number(data?.starDistribution?.fiveStar ?? 0),
      fourStar: Number(data?.starDistribution?.fourStar ?? 0),
      threeStar: Number(data?.starDistribution?.threeStar ?? 0),
      twoStar: Number(data?.starDistribution?.twoStar ?? 0),
      oneStar: Number(data?.starDistribution?.oneStar ?? 0),
    },
  };
}

export async function getTopRatedDoctors(
  limit = 6,
): Promise<TopRatedDoctorItem[]> {
  const response = await webAdminApi.reviewsGetTopDoctors({
    query: { limit },
  });
  const list =
    (response as unknown as { data?: TopRatedDoctorItem[] })?.data ??
    (Array.isArray(response) ? (response as TopRatedDoctorItem[]) : []);

  return list.map((doc) => ({
    doctorId: String(doc.doctorId ?? ""),
    doctorName: String(doc.doctorName ?? ""),
    specialty: doc.specialty,
    avatarUrl: String(doc.avatarUrl ?? ""),
    averageRating: Number(doc.averageRating ?? 0),
    totalReviews: Number(doc.totalReviews ?? 0),
  }));
}
