import { webAdminApi } from "@/lib/api";
import type {
  AdminGetDoctorApplicationRequest,
  AdminRejectDoctorRequest,
  UsersFindDoctorByEmailResponse,
} from "@healthcare/api-client";

export type VerificationFile = {
  name: string;
  url: string;
  type: "pdf" | "jpg" | "jpeg" | "png";
  size: number;
};

export type VerificationStatus = "pending" | "approved" | "rejected";

export type DoctorApplicationQuery = {
  status?: VerificationStatus;
  page?: number;
  limit?: number;
  search?: string;
};

export type DocumentItemReceiver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  experienceYears?: number;
  experience: string;
  workplace: string;
  sent_at: string;
  sentAtRaw?: string;
  status: VerificationStatus;
  verificationFiles: VerificationFile[];
  rejectionReason?: string;
};

export type DebugUploadFileItem = {
  publicId: string;
  url: string;
  secureUrl: string;
  format?: string;
  size?: number;
  createdAt?: string;
};

type User = {
  _id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  createdAt?: string;
};

type ApiDoctor = {
  _id?: string;
  userId?: User;
  specialty?: string;
  workplace?: string;
  verificationDocuments?: string[];
  experienceYears?: number;
  verificationStatus: VerificationStatus;
  rejectReason?: string;
  createdAt?: string;
};

type ApiDoctorApplicationsResponse = {
  data: ApiDoctor[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

export interface DoctorDocumentList {
  doctorDocumentList: DocumentItemReceiver[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

function resolveJoinedDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function decodeFileName(rawUrl: string): string {
  const rawName = rawUrl.split("/").pop() ?? "document";
  const withoutQuery = rawName.split("?")[0] ?? rawName;
  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

function mapApitoUi(item: ApiDoctor): DocumentItemReceiver | null {
  const userId = item.userId?._id || item._id;
  if (!userId) return null;

  const createdAt = item.createdAt ?? item.userId?.createdAt;

  return {
    id: userId,
    name: item.userId?.fullName ?? item.userId?.email ?? "-",
    email: item.userId?.email ?? "",
    phone: item.userId?.phoneNumber ?? "",
    specialty: item.specialty ?? "",
    experienceYears: item.experienceYears,
    experience:
      item.experienceYears != null ? String(item.experienceYears) : "",
    workplace: item.workplace ?? "",
    sent_at: resolveJoinedDate(createdAt),
    sentAtRaw: createdAt,
    status: item.verificationStatus,
    verificationFiles: (item.verificationDocuments ?? []).map((url) => {
      const normalizedUrl = String(url);
      const fileName = decodeFileName(normalizedUrl);
      const extension = fileName.split(".").pop()?.toLowerCase();
      const type: VerificationFile["type"] =
        extension === "jpg" || extension === "jpeg" || extension === "png"
          ? extension
          : "pdf";

      return {
        name: fileName,
        url: normalizedUrl,
        type,
        size: 0,
      };
    }),
    rejectionReason: item.rejectReason,
  };
}

export async function getDoctorDocuments(
  query: DoctorApplicationQuery = {},
): Promise<DoctorDocumentList> {
  const response = await webAdminApi.adminGetDoctorApplication({
    query: {
      status: query.status,
      page: query.page,
      limit: query.limit,
      search: query.search,
    } as unknown as AdminGetDoctorApplicationRequest["query"],
  });

  const payload = response as unknown as ApiDoctorApplicationsResponse;

  return {
    doctorDocumentList: (payload.data ?? [])
      .map(mapApitoUi)
      .filter((item): item is DocumentItemReceiver => item !== null),
    pagination: payload.pagination,
    summary: payload.summary,
  };
}

export async function approveDoctorDocument(
  id: string,
  verificationNotes?: string,
) {
  return webAdminApi.adminVerifyDoctor({
    params: { id },
    body: verificationNotes ? { verificationNotes } : {},
  });
}

export async function rejectDoctorDocument(id: string, reason: string) {
  return webAdminApi.adminRejectDoctor({
    params: { id },
    body: {
      reason,
    } as unknown as AdminRejectDoctorRequest["body"],
  });
}

export async function lookupDoctorByEmail(
  email: string,
): Promise<UsersFindDoctorByEmailResponse> {
  return webAdminApi.usersFindDoctorByEmail({
    params: { email: email.trim() },
  });
}

export async function listStorageFiles(): Promise<DebugUploadFileItem[]> {
  const res = await webAdminApi.uploadDebugListFiles();
  const raw = res.data as
    | DebugUploadFileItem[]
    | { files?: DebugUploadFileItem[]; resources?: DebugUploadFileItem[] }
    | null
    | undefined;

  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && Array.isArray(raw.files)) {
    return raw.files;
  }
  if (raw && Array.isArray(raw.resources)) {
    return raw.resources;
  }
  return [];
}

export async function getStorageFileInfo(publicId: string) {
  return webAdminApi.uploadGetFileInfo({
    query: { publicId },
  });
}

export async function deleteStorageFile(
  publicId: string,
  fileType?: "image" | "document",
) {
  return webAdminApi.uploadDeleteFile({
    query: { publicId },
    body: fileType ? { fileType } : {},
  });
}

export async function deleteMultipleStorageFiles(
  publicIds: string[],
  fileType?: "image" | "document",
) {
  return webAdminApi.uploadDeleteMultiple({
    publicIds,
    fileType,
  });
}
