import { normalizePaginatedList, webAdminApi } from "@/lib/api";
import type {
  AdminGetDoctorApplicationRequest,
  AdminLockAccountRequest,
  PresenceCheckUsersStatusRequest,
  ReviewsGetDoctorRatingResponse,
  UsersFindOneResponse,
} from "@healthcare/api-client";

export interface UserManagement {
  totalUser: number;
  activeDoctors: number;
  pendingVerifications: number;
  bannedUsers: number;
  totalPatients: number;
  userList: UserManagementUser[];
}

type UserRole = "patient" | "doctor" | "admin";
type UserStatus = "active" | "banned";
type AdminAssignedRole = "super_admin" | "user_admin" | "ai_admin";

export type UserManagementUser = {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  location: string;
  joined: string;
  role: UserRole;
  status: UserStatus;
  isOnline?: boolean;
  specialty?: string;
  assigned_role?: AdminAssignedRole;
};

export type UserOperationalDetails = {
  profile: UsersFindOneResponse;
  doctorRating?: ReviewsGetDoctorRatingResponse["data"];
};

type ApiAddress = {
  city?: string;
  country?: string;
};

type ApiUser = {
  _id?: string;
  id?: string;
  fullName?: string;
  avatarUrl?: string;
  email?: string;
  role?: UserRole;
  accountStatus?: UserStatus;
  isOnline?: boolean;
  createdAt?: string;
  address?: ApiAddress;
  specialty?: string;
};

type ApiAdminRecord = {
  _id?: string;
  id?: string;
  userId?: ApiUser | string;
  adminRole?: AdminAssignedRole;
};

export type ApiBanUser = {
  id: string;
  reason?: string;
};

export type ApiUnbanUser = {
  id: string;
};

export type VerificationStatus = "pending" | "approved" | "rejected";
type User = {
  _id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
};

type ApiDoctor = {
  _id: string;
  userId: User;
  specialty?: string;
  workplace?: string;
  verificationDocuments?: string[];
  experienceYears?: number;
  verificationStatus: VerificationStatus;
  rejectReason?: string;
  createdAt: string;
};

function resolveId(record: { _id?: string; id?: string }) {
  return record._id ?? record.id ?? "";
}

function resolveLocation(address?: ApiAddress) {
  if (!address) {
    return "-";
  }

  const locationParts = [address.city, address.country].filter(Boolean);
  return locationParts.length > 0 ? locationParts.join(", ") : "-";
}

function resolveJoinedDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toISOString();
}

async function fetchAllPagedUsers(): Promise<{
  items: ApiUser[];
  total: number;
}> {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  let total = 0;
  const collected: ApiUser[] = [];

  try {
    do {
      const response = await webAdminApi.usersFindAllPaged({
        query: { page, limit },
      });
      const normalized = normalizePaginatedList<ApiUser>(
        response,
        page,
        limit,
      );
      collected.push(...normalized.items);
      total = normalized.total;
      totalPages = Math.max(1, normalized.totalPages);
      page += 1;
    } while (page <= totalPages && page <= 10);

    return { items: collected, total };
  } catch {
    const rawList = await webAdminApi.usersFindAll();
    const items = Array.isArray(rawList) ? (rawList as unknown as ApiUser[]) : [];
    return { items, total: items.length };
  }
}

async function fetchDoctorsDirectory(): Promise<{
  items: ApiUser[];
  total: number;
}> {
  try {
    const response = await webAdminApi.usersSearchDoctors({
      query: { page: 1, limit: 100 },
    });
    const normalized = normalizePaginatedList<ApiUser>(response, 1, 100);
    return { items: normalized.items, total: normalized.total };
  } catch {
    const rawDoctors = await webAdminApi.usersFindDoctors();
    const items = Array.isArray(rawDoctors)
      ? (rawDoctors as unknown as ApiUser[])
      : [];
    return { items, total: items.length };
  }
}

async function fetchAllPendingDoctorApplicationsCount(): Promise<number> {
  const response = await webAdminApi.adminGetDoctorApplication({
    query: {
      status: "pending",
      page: 1,
      limit: 1,
    } as unknown as AdminGetDoctorApplicationRequest["query"],
  });

  const payload = response as unknown as {
    summary?: { pending?: number };
    pagination?: { total?: number };
    data?: ApiDoctor[];
  };

  if (typeof payload.summary?.pending === "number") {
    return payload.summary.pending;
  }
  if (typeof payload.pagination?.total === "number") {
    return payload.pagination.total;
  }
  return Array.isArray(payload.data) ? payload.data.length : 0;
}

function mapApiUserToUiUser(user: ApiUser): UserManagementUser | null {
  const id = resolveId(user);
  if (!id || !user.fullName || !user.email || !user.role) {
    return null;
  }

  return {
    id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    email: user.email,
    location: resolveLocation(user.address),
    joined: resolveJoinedDate(user.createdAt),
    role: user.role,
    status: user.accountStatus ?? "active",
    isOnline: Boolean(user.isOnline),
    specialty: user.specialty,
  };
}

export async function checkUsersOnlineStatus(
  userIds: string[],
): Promise<Set<string>> {
  const cleanIds = Array.from(new Set(userIds.filter(Boolean)));
  if (cleanIds.length === 0) {
    return new Set();
  }

  try {
    const res = await webAdminApi.presenceCheckUsersStatus({
      userIds: cleanIds,
    } as unknown as PresenceCheckUsersStatusRequest);
    const onlineIds = res.data?.onlineUserIds ?? [];
    return new Set(onlineIds.map((id) => String(id)));
  } catch {
    return new Set();
  }
}

export async function banUser(payload: ApiBanUser) {
  return webAdminApi.adminLockAccount({
    params: { id: payload.id },
    body: {
      reason: payload.reason ?? "Banned by admin",
    } as unknown as AdminLockAccountRequest["body"],
  });
}

export async function unbanUser(payload: ApiUnbanUser) {
  return webAdminApi.adminUnlockAccount({
    params: { id: payload.id },
  });
}

export async function deactivateUser(userId: string) {
  return webAdminApi.usersDeactivate({
    params: { id: userId },
  });
}

export async function getUserOperationalDetails(
  userId: string,
  role: UserRole,
): Promise<UserOperationalDetails> {
  const [profile, ratingRes] = await Promise.all([
    webAdminApi.usersFindOne({ params: { id: userId } }),
    role === "doctor"
      ? webAdminApi.reviewsGetDoctorRating({ params: { doctorId: userId } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    profile,
    doctorRating: ratingRes?.data ?? undefined,
  };
}

export async function getUserManagement(): Promise<UserManagement> {
  const [
    pagedUsers,
    doctorsDirectory,
    pendingVerificationsCount,
    adminProfilesResponse,
    patientsResponse,
  ] = await Promise.all([
    fetchAllPagedUsers(),
    fetchDoctorsDirectory(),
    fetchAllPendingDoctorApplicationsCount(),
    webAdminApi.adminsFindAll({ query: { page: 1, limit: 100 } }),
    webAdminApi.patientProfileFindAll({ query: { page: 1, limit: 1 } }).catch(() => null),
  ]);

  const mergedUsers = new Map<string, UserManagementUser>();

  for (const apiUser of pagedUsers.items) {
    const mapped = mapApiUserToUiUser(apiUser);
    if (!mapped) {
      continue;
    }

    mergedUsers.set(mapped.id, mapped);
  }

  for (const doctorUser of doctorsDirectory.items) {
    const mappedDoctor = mapApiUserToUiUser({
      ...doctorUser,
      role: doctorUser.role ?? "doctor",
    });
    if (!mappedDoctor) {
      continue;
    }

    const existing = mergedUsers.get(mappedDoctor.id);
    mergedUsers.set(mappedDoctor.id, {
      ...(existing ?? mappedDoctor),
      specialty: mappedDoctor.specialty ?? existing?.specialty,
    });
  }

  const adminProfiles = (adminProfilesResponse.data?.admins ?? []) as unknown as ApiAdminRecord[];

  for (const adminProfile of adminProfiles) {
    const adminUser =
      typeof adminProfile.userId === "string"
        ? ({ _id: adminProfile.userId, role: "admin" as UserRole } as ApiUser)
        : adminProfile.userId;

    if (!adminUser) {
      continue;
    }

    const mappedAdminUser = mapApiUserToUiUser({
      ...adminUser,
      role: adminUser.role ?? "admin",
    });

    if (!mappedAdminUser) {
      continue;
    }

    mergedUsers.set(mappedAdminUser.id, {
      ...(mergedUsers.get(mappedAdminUser.id) ?? mappedAdminUser),
      role: "admin",
      assigned_role: adminProfile.adminRole ?? mappedAdminUser.assigned_role,
    });
  }

  const allUserIds = Array.from(mergedUsers.keys());
  const onlineSet = await checkUsersOnlineStatus(allUserIds);

  const userList = Array.from(mergedUsers.values())
    .map((user) => ({
      ...user,
      isOnline: onlineSet.has(user.id) || Boolean(user.isOnline),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const bannedUsers = userList.filter(
    (user) => user.status === "banned",
  ).length;

  const totalPatients =
    patientsResponse?.data?.pagination?.total ??
    userList.filter((user) => user.role === "patient").length;

  return {
    totalUser: Math.max(pagedUsers.total, userList.length),
    activeDoctors: doctorsDirectory.total || userList.filter((u) => u.role === "doctor").length,
    pendingVerifications: pendingVerificationsCount,
    bannedUsers,
    totalPatients,
    userList,
  };
}
