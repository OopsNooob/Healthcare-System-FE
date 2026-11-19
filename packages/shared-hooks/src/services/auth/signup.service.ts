import { api, mobileApi } from "../../api";
import { type AppRole } from "@repo/shared-types";
import type { FeTypes } from "@healthcare/api-client";

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  filename: string;
  format: string;
  size: number;
  uploadedAt: Date;
}

export type UploadableFile = {
  originalname: string;
  mimetype?: string;
  buffer: Buffer;
  size: number;
  fileType: string;
};

export type NativeUploadableFile = {
  uri: string;
  name?: string;
  type?: string;
};

export type VerificationUploadInput = File | NativeUploadableFile;

export interface SignUpPatient {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface SignUpDoctor {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  specialty: string;
  workplace: string;
  experienceYears: number;
  newVerificationDocuments: VerificationUploadInput[];
  existingVerificationDocuments?: string[];
}

export type DoctorVerificationStatus = "rejected" | "pending" | "approved";

export type DoctorReRegisterPrefillApiResponse = {
  email?: string;
  phone?: string;
  phoneNumber?: string | null;
  fullName?: string;
  specialty?: string;
  workplace?: string;
  yearsOfExperience?: string | number | null;
  experienceYears?: string | number | null;
  verificationStatus?: DoctorVerificationStatus;
  verification_status?: DoctorVerificationStatus;
  rejectReason?: string | null;
  reason?: string | null;
  verificationDocuments?: Array<string | { id: string; label: string }>;
  verificationDocumentCount?: number;
  verification_documents?: string[];
  existingDocuments?: unknown[];
};

export type RestoreDoctorReapplicationPayload = {
  email: string;
  password: string;
};

export type RestoreDoctorReapplicationResponse =
  FeTypes.AuthRestoreDoctorReapplicationResponse;

type ApiUserSignUpResponse = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
};

export type ApiSignUpResponse = {
  status?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: ApiUserSignUpResponse;
};

export async function submitSignUpPatient(
  payload: SignUpPatient,
): Promise<ApiSignUpResponse> {
  const cleanPhone = payload.phoneNumber?.trim();
  return mobileApi.authRegisterPatient({
    email: payload.email.trim(),
    password: payload.password,
    fullName: payload.fullName.trim(),
    ...(cleanPhone ? { phoneNumber: cleanPhone } : {}),
  });
}

export async function fetchDoctorPrefillData(
  email: string,
): Promise<DoctorReRegisterPrefillApiResponse> {
  const res = await api.get(`/users/doctor/${encodeURIComponent(email)}`);
  return res.data;
}

export async function restoreDoctorReapplication(
  payload: RestoreDoctorReapplicationPayload,
): Promise<RestoreDoctorReapplicationResponse> {
  return mobileApi.authRestoreDoctorReapplication({
    email: payload.email.trim(),
    password: payload.password,
  });
}

export async function submitSignUpDoctor(
  payload: SignUpDoctor,
): Promise<ApiSignUpResponse> {
  const cleanPhone = payload.phoneNumber?.trim();
  const files = payload.newVerificationDocuments ?? [];

  if (files.length === 0) {
    return mobileApi.authRegisterDoctor({
      email: payload.email.trim(),
      password: payload.password,
      fullName: payload.fullName.trim(),
      specialty: payload.specialty.trim(),
      workplace: payload.workplace.trim(),
      experienceYears: Math.max(0, Math.trunc(payload.experienceYears)),
      ...(cleanPhone ? { phoneNumber: cleanPhone } : {}),
    });
  }

  const formData = new FormData();
  formData.append("email", payload.email.trim());
  formData.append("password", payload.password);
  formData.append("fullName", payload.fullName.trim());
  if (cleanPhone) {
    formData.append("phoneNumber", cleanPhone);
  }
  formData.append("specialty", payload.specialty.trim());
  formData.append("workplace", payload.workplace.trim());
  formData.append(
    "experienceYears",
    String(Math.max(0, Math.trunc(payload.experienceYears))),
  );

  for (const file of files) {
    if (
      typeof file === "object" &&
      file !== null &&
      "uri" in file &&
      typeof file.uri === "string"
    ) {
      formData.append(
        "newFilesToUpload",
        {
          uri: file.uri,
          name: file.name ?? "verification-document.pdf",
          type: file.type ?? "application/pdf",
        } as unknown as Blob,
      );
    } else {
      formData.append("newFilesToUpload", file as Blob);
    }
  }

  return mobileApi.authRegisterDoctor(formData);
}
