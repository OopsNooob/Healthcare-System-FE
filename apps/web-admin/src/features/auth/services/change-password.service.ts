import { webAdminApi } from "@/lib/api";

export type ChangePasswordPayload = {
  email: string;
  otpCode: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export async function submitChangePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  return webAdminApi.authResetPassword({
    email: payload.email.trim(),
    otpCode: payload.otpCode.trim(),
    newPassword: payload.newPassword,
  });
}
