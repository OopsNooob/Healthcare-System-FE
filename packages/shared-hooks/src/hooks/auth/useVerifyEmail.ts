import { useCallback, useState } from "react";
import axios from "axios";
import {
  submitVerifyEmail,
  requestEmailVerification,
  type ConfirmOtpPayload,
  type ConfirmOtpResponse,
} from "../../services/auth/confirm-otp.service";

function extractHookErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const raw = (error.response?.data as { message?: string | string[] })?.message;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string" && raw) return raw;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useVerifyEmail() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConfirmOtpResponse | null>(null);

  const verifyEmail = useCallback(async (payload: ConfirmOtpPayload) => {
    setIsVerifying(true);
    setError(null);
    try {
      const res = await submitVerifyEmail(payload);
      setData(res);
      return res;
    } catch (err) {
      setError(extractHookErrorMessage(err, "Email verification failed."));
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    setIsResending(true);
    setError(null);
    try {
      return await requestEmailVerification({ email });
    } catch (err) {
      setError(extractHookErrorMessage(err, "Failed to queue verification email."));
      throw err;
    } finally {
      setIsResending(false);
    }
  }, []);

  return {
    verifyEmail,
    resendVerification,
    isVerifying,
    isResending,
    error,
    data,
  };
}

