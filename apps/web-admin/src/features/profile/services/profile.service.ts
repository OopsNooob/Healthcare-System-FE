import { webAdminApi } from "@/lib/api";

export type UserRole = "admin" | "patient" | "doctor";

type GenderValue = "male" | "female" | "other" | string;

type AdminRole = "super_admin" | "user_admin" | "ai_admin" | "user_manager" | "ai_manager";

type DoctorVerificationStatus = "approved" | "pending" | "rejected";

export interface ProfileDataReceiver {
  id: string;
  isOnline: boolean;
  avatarUrl?: string;
  avatarPublicId?: string;
  fullName: string;
  role: UserRole;
  email: string;
  phone: string;
  gender: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  country: string;
  adminAssignedRole?: string;
  yearsOfExperience?: string;
  documentsUrl?: string[];
  specialty?: string;
  workplace?: string;
}

type ApiAddress = {
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  country?: string;
};

type ApiDoctorProfile = {
  _id: string;
  userId: string;
  specialty?: string;
  workplace?: string;
  verificationDocuments?: string[];
  experienceYears?: number;
  averageRating?: number;
  verifiedAt?: string;
  verificationStatus?: DoctorVerificationStatus;
  rejectReason?: string;
  __v: number;
  createdAt: string;
  updatedAt: string;
};

type ApiAdminProfile = {
  _id: string;
  userId: string;
  adminRole?: AdminRole;
  __v: number;
  createdAt: string;
  updatedAt: string;
};

type UserProfileResponse = {
  _id: string;
  email: string;
  fullName: string;
  role: UserRole;
  accountStatus: "active" | "banned";
  isOnline?: boolean;
  gender?: GenderValue;
  dateOfBirth?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  address?: ApiAddress;
  __v?: number;
  createdAt?: string;
  updatedAt?: string;
  doctorProfile?: ApiDoctorProfile | null;
  adminProfile?: ApiAdminProfile | null;
};

type UpdateMyProfilePayload = {
  fullName: string;
  phoneNumber: string;
  gender: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  specialty?: string;
  workplace?: string;
  verificationDocuments?: string[];
  experienceYears?: number;
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    country: string;
  };
};

function normalizeAdminRole(value?: AdminRole | string) {
  if (!value) {
    return "";
  }
  if (value === "super_admin") {
    return "Super Admin";
  }
  if (value === "ai_admin" || value === "ai_manager") {
    return "AI Admin";
  }
  if (value === "user_admin" || value === "user_manager") {
    return "User Admin";
  }

  return value
    .split("_")
    .map((part) =>
      part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : "",
    )
    .join(" ");
}

export function mapApiProfileToUiProfile(
  payload: UserProfileResponse,
): ProfileDataReceiver {
  const doctorProfile = payload.doctorProfile ?? null;
  const adminProfile = payload.adminProfile ?? null;

  return {
    id: payload._id,
    isOnline: Boolean(payload.isOnline),
    avatarUrl: payload.avatarUrl,
    avatarPublicId: payload.avatarPublicId,
    fullName: payload.fullName ?? "",
    role: payload.role,
    email: payload.email ?? "",
    phone: payload.phoneNumber ?? "",
    gender:
      typeof payload.gender === "string" && payload.gender.trim()
        ? payload.gender.trim().charAt(0).toUpperCase() +
          payload.gender.trim().slice(1).toLowerCase()
        : "--",
    street: payload.address?.street ?? "",
    ward: payload.address?.ward ?? "",
    district: payload.address?.district ?? "",
    city: payload.address?.city ?? "",
    country: payload.address?.country ?? "",
    adminAssignedRole: normalizeAdminRole(adminProfile?.adminRole),
    yearsOfExperience:
      doctorProfile?.experienceYears != null
        ? String(doctorProfile.experienceYears)
        : "",
    documentsUrl: doctorProfile?.verificationDocuments ?? [],
    specialty: doctorProfile?.specialty ?? "",
    workplace: doctorProfile?.workplace ?? "",
  };
}

export async function getMyProfile() {
  const data = await webAdminApi.usersGetMe();
  return mapApiProfileToUiProfile(data as unknown as UserProfileResponse);
}

export async function uploadProfileAvatar(file: File, role?: UserRole) {
  void role;
  const response = await webAdminApi.uploadUploadAvatar({ file });

  return {
    avatarUrl:
      response.data.files[0]?.secureUrl ??
      response.data.files[0]?.url ??
      "",
    avatarPublicId: response.data.files[0]?.publicId ?? "",
  };
}

export async function deleteProfileAvatar(publicId: string) {
  return webAdminApi.uploadDeleteFile({
    query: { publicId },
    body: { fileType: "image" },
  });
}

export async function updateMyProfile(payload: ProfileDataReceiver) {
  const body: UpdateMyProfilePayload = {
    fullName: payload.fullName,
    phoneNumber: payload.phone,
    gender: payload.gender.toLowerCase(),
    avatarUrl: payload.avatarUrl,
    avatarPublicId: payload.avatarPublicId,
    address: {
      street: payload.street,
      ward: payload.ward,
      district: payload.district,
      city: payload.city,
      country: payload.country,
    },
  };

  if (payload.role === "doctor") {
    body.specialty = payload.specialty?.trim() || undefined;
    body.workplace = payload.workplace?.trim() || undefined;

    if (payload.yearsOfExperience?.trim()) {
      const years = Number(payload.yearsOfExperience);
      if (Number.isFinite(years) && years >= 0) {
        body.experienceYears = years;
      }
    }

    const verificationDocuments = (payload.documentsUrl ?? []).filter((url) =>
      /^https?:\/\//.test(url),
    );
    if (verificationDocuments.length > 0) {
      body.verificationDocuments = verificationDocuments;
    }
  }

  await webAdminApi.usersUpdateMe(body);
}
