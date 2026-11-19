import { webAdminApi } from "@/lib/api";

export type ConfirmOtpPayload = {
  email: string;
  otpCode: string;
};

export type ConfirmOtpResponse = {
  message: string;
};

export async function resendRecoveryOtp(
  email: string,
): Promise<ConfirmOtpResponse> {
  return webAdminApi.authPasswordRecovery({
    email: email.trim(),
  });
}

export async function submitConfirmOtp(
  payload: ConfirmOtpPayload,
): Promise<ConfirmOtpResponse> {
  const cleanOtp = payload.otpCode.trim();
  if (!payload.email.trim() || !/^\d{6}$/.test(cleanOtp)) {
    throw new Error("Invalid email or 6-digit verification code.");
  }
  return {
    message: "OTP captured for password reset.",
  };
}
