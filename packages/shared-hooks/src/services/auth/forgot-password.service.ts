import { mobileApi } from "../../api";

export type ForgotPasswordPayload = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export async function submitForgotPassword(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  return mobileApi.authPasswordRecovery({
    email: payload.email.trim(),
  });
}
