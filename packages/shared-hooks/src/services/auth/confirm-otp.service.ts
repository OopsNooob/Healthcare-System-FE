import { mobileApi } from "../../api";

export type ConfirmOtpPayload = {
  email: string;
  otpCode: string;
};

export type ConfirmOtpResponse = {
  message: string;
};

export type RequestEmailVerificationPayload = {
  email: string;
};

export async function submitVerifyEmail(
  payload: ConfirmOtpPayload,
): Promise<ConfirmOtpResponse> {
  return mobileApi.authVerifyEmail({
    email: payload.email.trim(),
    otpCode: payload.otpCode.trim(),
  });
}

export async function requestEmailVerification(
  payload: RequestEmailVerificationPayload,
): Promise<ConfirmOtpResponse> {
  return mobileApi.authRequestEmailVerification({
    email: payload.email.trim(),
  });
}

export async function submitConfirmOtp(
  payload: ConfirmOtpPayload,
): Promise<ConfirmOtpResponse> {
  return submitVerifyEmail(payload);
}
