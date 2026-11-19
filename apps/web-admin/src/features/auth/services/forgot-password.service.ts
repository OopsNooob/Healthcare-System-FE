import { webAdminApi } from "@/lib/api";

export type ForgotPasswordPayload = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export async function submitForgotPassword(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  return webAdminApi.authPasswordRecovery({
    email: payload.email.trim(),
  });
}
