import {
  normalizePaginatedList,
  webAdminApi,
  type AdminGetAllConsultationsRequest,
} from "@/lib/api";

export type AppointmentStatus =
  | "Completed"
  | "In Progress"
  | "Waiting"
  | "Scheduled"
  | "Canceled";

export type AppointmentChannelType =
  | "Video Call"
  | "Chat"
  | "Direct Consultation";

export interface AppointmentReview {
  id?: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  flagged: boolean;
  adminNotes?: string;
}

export interface Appointment {
  id: string;
  time: string;
  rawDate?: string;
  patientId: string;
  patient: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorId: string;
  doctor: string;
  doctorEmail?: string;
  doctorSpecialty?: string;
  type: AppointmentChannelType;
  status: AppointmentStatus;
  mode: "on_demand" | "scheduled";
  requestStatus: string;
  sessionStatus: string;
  expectedDurationMinutes?: number;
  estimatedWaitMinutes?: number;
  duration?: string;
  roomId?: string;
  callStartedAt?: string;
  callEndedAt?: string;
  callEndReason?: string;
  requestedAt?: string;
  respondedAt?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  sessionStartedAt?: string;
  completedAt?: string;
  patientNotes?: string;
  doctorNotes?: string;
  cancellationReason?: string;
  declinedReason?: string;
  noShowReason?: string;
  interruptionReason?: string;
  quotaPolicy?: "consultation_limit" | "care_program_included";
}

export interface ListAppointmentsParams {
  page?: number;
  limit?: number;
  status?: string;
  mode?: "on_demand" | "scheduled";
  doctorId?: string;
  locale?: string;
}

export interface PaginatedAppointmentsResult {
  items: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type RawConsultation = Record<string, unknown>;

const userNameCache = new Map<string, { fullName: string; email?: string; phoneNumber?: string; specialty?: string }>();

function extractId(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (typeof record._id === "string") return record._id;
    if (typeof record.id === "string") return record.id;
  }
  return "";
}

function extractPerson(
  raw: unknown,
  fallbackId?: string,
): { id: string; name: string; email?: string; phoneNumber?: string; specialty?: string } {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const id = extractId(record) || fallbackId || "";
    const fullName =
      typeof record.fullName === "string" && record.fullName.trim()
        ? record.fullName.trim()
        : typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : id
            ? `#${id.slice(-6).toUpperCase()}`
            : "-";
    const doctorProfile =
      record.doctorProfile && typeof record.doctorProfile === "object"
        ? (record.doctorProfile as Record<string, unknown>)
        : undefined;
    return {
      id,
      name: fullName,
      email: typeof record.email === "string" ? record.email : undefined,
      phoneNumber:
        typeof record.phoneNumber === "string" ? record.phoneNumber : undefined,
      specialty:
        doctorProfile && typeof doctorProfile.specialty === "string"
          ? doctorProfile.specialty
          : undefined,
    };
  }

  const id = typeof raw === "string" ? raw : fallbackId || "";
  const cached = id ? userNameCache.get(id) : undefined;
  return {
    id,
    name: cached?.fullName ?? (id ? `#${id.slice(-6).toUpperCase()}` : "-"),
    email: cached?.email,
    phoneNumber: cached?.phoneNumber,
    specialty: cached?.specialty,
  };
}

async function resolveMissingPersonNames(items: Appointment[]): Promise<void> {
  const unresolvedIds = new Set<string>();
  for (const item of items) {
    if (item.patientId && item.patient.startsWith("#") && !userNameCache.has(item.patientId)) {
      unresolvedIds.add(item.patientId);
    }
    if (item.doctorId && item.doctor.startsWith("#") && !userNameCache.has(item.doctorId)) {
      unresolvedIds.add(item.doctorId);
    }
  }
  if (unresolvedIds.size === 0) return;

  await Promise.allSettled(
    Array.from(unresolvedIds)
      .slice(0, 20)
      .map(async (id) => {
        const res = await webAdminApi.usersFindOne({ params: { id } });
        const userRecord = (res as unknown as { data?: Record<string, unknown> })?.data ??
          (res as unknown as Record<string, unknown>);
        if (userRecord && typeof userRecord === "object") {
          const doctorProfile =
            userRecord.doctorProfile && typeof userRecord.doctorProfile === "object"
              ? (userRecord.doctorProfile as Record<string, unknown>)
              : undefined;
          const fullName =
            typeof userRecord.fullName === "string" && userRecord.fullName.trim()
              ? userRecord.fullName.trim()
              : `#${id.slice(-6).toUpperCase()}`;
          userNameCache.set(id, {
            fullName,
            email: typeof userRecord.email === "string" ? userRecord.email : undefined,
            phoneNumber:
              typeof userRecord.phoneNumber === "string"
                ? userRecord.phoneNumber
                : undefined,
            specialty:
              doctorProfile && typeof doctorProfile.specialty === "string"
                ? doctorProfile.specialty
                : undefined,
          });
        }
      }),
  );

  for (const item of items) {
    if (item.patientId && userNameCache.has(item.patientId)) {
      const cached = userNameCache.get(item.patientId)!;
      if (item.patient.startsWith("#")) {
        item.patient = cached.fullName;
        item.patientEmail = item.patientEmail ?? cached.email;
        item.patientPhone = item.patientPhone ?? cached.phoneNumber;
      }
    }
    if (item.doctorId && userNameCache.has(item.doctorId)) {
      const cached = userNameCache.get(item.doctorId)!;
      if (item.doctor.startsWith("#")) {
        item.doctor = cached.fullName;
        item.doctorEmail = item.doctorEmail ?? cached.email;
        item.doctorSpecialty = item.doctorSpecialty ?? cached.specialty;
      }
    }
  }
}

export function mapConsultationStatus(
  requestStatus?: string,
  sessionStatus?: string,
  mode?: string,
): AppointmentStatus {
  if (
    requestStatus === "declined" ||
    requestStatus === "cancelled" ||
    requestStatus === "expired" ||
    sessionStatus === "no_show"
  ) {
    return "Canceled";
  }
  if (sessionStatus === "completed") {
    return "Completed";
  }
  if (sessionStatus === "in_consultation" || sessionStatus === "interrupted") {
    return "In Progress";
  }
  if (sessionStatus === "waiting") {
    return "Waiting";
  }
  if (mode === "scheduled") {
    return "Scheduled";
  }
  return requestStatus === "pending" ? "Waiting" : "Scheduled";
}

function resolveChannelType(raw: RawConsultation): AppointmentChannelType {
  if (raw.roomId || raw.callStartedAt || raw.callEndedAt) {
    return "Video Call";
  }
  if (raw.lastMessageId || raw.lastMessageAt) {
    return "Chat";
  }
  return raw.mode === "on_demand" ? "Direct Consultation" : "Video Call";
}

function formatDateTime(iso?: string, locale = "vi-VN"): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCallDuration(raw: RawConsultation): string | undefined {
  const startIso = typeof raw.callStartedAt === "string"
    ? raw.callStartedAt
    : typeof raw.sessionStartedAt === "string"
      ? raw.sessionStartedAt
      : undefined;
  const endIso = typeof raw.callEndedAt === "string"
    ? raw.callEndedAt
    : typeof raw.completedAt === "string"
      ? raw.completedAt
      : undefined;

  if (startIso && endIso) {
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
      const totalSeconds = Math.floor((endMs - startMs) / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }
  }

  if (typeof raw.expectedDurationMinutes === "number" && raw.expectedDurationMinutes > 0) {
    return `${raw.expectedDurationMinutes}m`;
  }

  return undefined;
}

export function mapConsultationToAppointment(
  raw: RawConsultation,
  locale = "vi-VN",
): Appointment {
  const id = extractId(raw);
  const patient = extractPerson(raw.patientId);
  const doctor = extractPerson(raw.doctorId);

  const mode: "on_demand" | "scheduled" =
    raw.mode === "on_demand" ? "on_demand" : "scheduled";
  const requestStatus =
    typeof raw.requestStatus === "string" ? raw.requestStatus : "pending";
  const sessionStatus =
    typeof raw.sessionStatus === "string" ? raw.sessionStatus : "not_started";

  const rawDate =
    (typeof raw.scheduledStartAt === "string" && raw.scheduledStartAt) ||
    (typeof raw.requestedAt === "string" && raw.requestedAt) ||
    (typeof raw.createdAt === "string" && raw.createdAt) ||
    undefined;

  return {
    id,
    time: formatDateTime(rawDate, locale),
    rawDate,
    patientId: patient.id,
    patient: patient.name,
    patientEmail: patient.email,
    patientPhone: patient.phoneNumber,
    doctorId: doctor.id,
    doctor: doctor.name,
    doctorEmail: doctor.email,
    doctorSpecialty: doctor.specialty,
    type: resolveChannelType(raw),
    status: mapConsultationStatus(requestStatus, sessionStatus, mode),
    mode,
    requestStatus,
    sessionStatus,
    expectedDurationMinutes:
      typeof raw.expectedDurationMinutes === "number"
        ? raw.expectedDurationMinutes
        : undefined,
    estimatedWaitMinutes:
      typeof raw.estimatedWaitMinutes === "number"
        ? raw.estimatedWaitMinutes
        : undefined,
    duration: formatCallDuration(raw),
    roomId: typeof raw.roomId === "string" ? raw.roomId : undefined,
    callStartedAt:
      typeof raw.callStartedAt === "string" ? raw.callStartedAt : undefined,
    callEndedAt:
      typeof raw.callEndedAt === "string" ? raw.callEndedAt : undefined,
    callEndReason:
      typeof raw.callEndReason === "string" ? raw.callEndReason : undefined,
    requestedAt:
      typeof raw.requestedAt === "string" ? raw.requestedAt : undefined,
    respondedAt:
      typeof raw.respondedAt === "string" ? raw.respondedAt : undefined,
    scheduledStartAt:
      typeof raw.scheduledStartAt === "string"
        ? raw.scheduledStartAt
        : undefined,
    scheduledEndAt:
      typeof raw.scheduledEndAt === "string" ? raw.scheduledEndAt : undefined,
    sessionStartedAt:
      typeof raw.sessionStartedAt === "string"
        ? raw.sessionStartedAt
        : undefined,
    completedAt:
      typeof raw.completedAt === "string" ? raw.completedAt : undefined,
    patientNotes:
      typeof raw.patientNotes === "string" ? raw.patientNotes : undefined,
    doctorNotes:
      typeof raw.doctorNotes === "string" ? raw.doctorNotes : undefined,
    cancellationReason:
      typeof raw.cancellationReason === "string"
        ? raw.cancellationReason
        : undefined,
    declinedReason:
      typeof raw.declinedReason === "string" ? raw.declinedReason : undefined,
    noShowReason:
      typeof raw.noShowReason === "string" ? raw.noShowReason : undefined,
    interruptionReason:
      typeof raw.interruptionReason === "string"
        ? raw.interruptionReason
        : undefined,
    quotaPolicy:
      raw.quotaPolicy === "consultation_limit" ||
      raw.quotaPolicy === "care_program_included"
        ? raw.quotaPolicy
        : undefined,
  };
}

export const appointmentManagementService = {
  async listAppointments(
    params: ListAppointmentsParams = {},
  ): Promise<PaginatedAppointmentsResult> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const locale = params.locale ?? "vi-VN";

    const query: AdminGetAllConsultationsRequest["query"] = {
      page,
      limit,
      sortBy: "requestedAt",
      sortOrder: -1,
    };

    if (params.mode) query.mode = params.mode;
    if (params.doctorId) query.doctorId = params.doctorId;

    if (params.status && params.status !== "all") {
      if (params.status === "Completed") {
        query.sessionStatus = "completed";
      } else if (params.status === "In Progress") {
        query.sessionStatus = "in_consultation";
      } else if (params.status === "Waiting") {
        query.sessionStatus = "waiting";
      } else if (params.status === "Scheduled") {
        query.mode = "scheduled";
        query.sessionStatus = "not_started";
      }
    }

    const response = await webAdminApi.adminGetAllConsultations({ query });
    const paginated = normalizePaginatedList<RawConsultation>(
      response,
      page,
      limit,
    );

    const mapped = paginated.items.map((item) =>
      mapConsultationToAppointment(item, locale),
    );
    await resolveMissingPersonNames(mapped);

    return {
      items: mapped,
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
      hasNextPage: paginated.hasNextPage,
      hasPrevPage: paginated.hasPrevPage,
    };
  },

  async getAppointmentDetail(
    id: string,
    locale = "vi-VN",
  ): Promise<Appointment> {
    const response = await webAdminApi.adminGetConsultationById({
      params: { id },
    });
    const unwrapped =
      response &&
      typeof response === "object" &&
      "data" in response &&
      response.data &&
      typeof response.data === "object"
        ? (response.data as RawConsultation)
        : (response as unknown as RawConsultation);

    const mapped = mapConsultationToAppointment(unwrapped, locale);
    await resolveMissingPersonNames([mapped]);
    return mapped;
  },

  async getConsultationReview(
    consultationId: string,
  ): Promise<AppointmentReview | null> {
    try {
      const response = await webAdminApi.reviewsFindByConsultationId({
        params: { id: consultationId },
      });
      const data = response?.data as
        | (typeof response.data & { _id?: string; id?: string })
        | undefined;
      if (!data || typeof data.rating !== "number") return null;
      return {
        id: data._id ?? data.id,
        rating: data.rating,
        comment: data.comment ?? "",
        helpfulCount: data.helpfulCount ?? 0,
        flagged: Boolean(data.flagged),
        adminNotes: data.adminNotes,
      };
    } catch {
      return null;
    }
  },
};
