import { AuthenticationHeader } from "@repo/ui/components/ui/auth-header";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldControl,
  FieldError,
} from "@repo/ui/components/ui/field";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Mail } from "lucide-react";
import { Spinner } from "@repo/ui/components/ui/spinner";
import { showToast } from "@repo/ui/components/ui/toasts";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resendRecoveryOtp } from "../services/confirm-otp.service";

interface ConfirmOTPProps {
  onSubmit?: (otp: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string;
  submitLabel?: string;
}

interface ConfirmOTPErrors {
  otp?: string;
}

export function ConfirmOTP({
  onSubmit,
  isLoading: propIsLoading = false,
  error: propError,
  submitLabel,
}: ConfirmOTPProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [otp, setOTP] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [touched, setTouched] = useState({
    otp: false,
  });
  const [localErrors, setLocalErrors] = useState<ConfirmOTPErrors>({});

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const locationState = (location.state as { email?: string } | null) ?? null;
  const email =
    locationState?.email ||
    sessionStorage.getItem("resetPasswordEmail") ||
    "";

  function validate(values: { otp: string }): ConfirmOTPErrors {
    const nextErrors: ConfirmOTPErrors = {};
    const clean = values.otp.replace(/\s+/g, "").trim();

    if (!clean) {
      nextErrors.otp = t("auth.otpRequired", "Please enter the OTP.");
    } else if (!/^\d{6}$/.test(clean)) {
      nextErrors.otp = t("auth.otpInvalid6", "OTP must be 6 digits.");
    }

    return nextErrors;
  }

  function handleBlur() {
    setTouched({ otp: true });
    setLocalErrors(validate({ otp }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (propIsLoading || isResending) return;
    setError(null);

    const nextErrors = validate({ otp });
    setLocalErrors(nextErrors);
    setTouched({ otp: true });

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const cleanOtp = otp.replace(/\s+/g, "").trim();
    try {
      if (onSubmit) {
        await onSubmit(cleanOtp);
        navigate("/change-password");
        return;
      }

      if (!email.trim()) {
        throw new Error(
          t(
            "auth.missingEmailError",
            "Missing email. Please restart from Forgot Password.",
          ),
        );
      }

      sessionStorage.setItem("resetPasswordEmail", email.trim());
      sessionStorage.setItem("resetPasswordOtp", cleanOtp);
      navigate("/change-password", {
        state: { email: email.trim(), otpCode: cleanOtp },
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("auth.verifyFailed", "Failed to verify OTP");
      setError(message);
      showToast.error(message);
    }
  }

  async function handleResend() {
    if (isResending || cooldown > 0 || propIsLoading) return;
    if (!email.trim()) {
      const msg = t(
        "auth.missingEmailError",
        "Missing email. Please restart from Forgot Password.",
      );
      setError(msg);
      showToast.error(msg);
      return;
    }

    setIsResending(true);
    setError(null);
    try {
      await resendRecoveryOtp(email.trim());
      setCooldown(60);
      showToast.success(t("auth.otpSent", "OTP has been sent to your email"));
    } catch (resendError) {
      const msg =
        resendError instanceof Error
          ? resendError.message
          : t("auth.sendOtpFailed", "Failed to send OTP");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsResending(false);
    }
  }

  const otpError = touched.otp ? localErrors.otp : undefined;
  const submitting = propIsLoading || isResending;
  const displayError = error || propError;

  return (
    <div className="min-h-screen min-w-screen flex flex-col bg-white dark:bg-slate-900">
      <AuthenticationHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          <p className="text-center text-5xl font-bold text-[#313A34] dark:text-slate-100 mb-2">
            {t("auth.verifyOtpTitle", "Verify OTP")}
          </p>

          <p className="text-center text-lg text-black dark:text-white font-light ">
            {t("auth.verifyOtpDesc", "Enter the code from our email sent to you.")}
          </p>

          {displayError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {displayError}
            </div>
          )}

          <FieldSet className="gap-4 border border-bordercolor px-10 py-20 rounded-sm">
            <FieldGroup>
              <Field className="gap-2">
                <FieldLabel
                  htmlFor="otp"
                  className="text-lg font-medium text-[#1E1E1E] dark:text-slate-200"
                >
                  {t("auth.otpLabel", "OTP")}
                </FieldLabel>
                <FieldControl invalid={Boolean(otpError)}>
                  <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOTP(e.target.value.replace(/[^\d]/g, ""))}
                    onBlur={handleBlur}
                    placeholder={t("auth.otpPlaceholder", "Enter your OTP")}
                    disabled={submitting}
                    className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
                  />
                </FieldControl>
                <FieldError>{otpError}</FieldError>
              </Field>

              <Field>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl text-base"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Spinner className="size-6" />
                  ) : (
                    submitLabel || t("auth.continueResetButton", "Continue")
                  )}
                </Button>
              </Field>

              <Field>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-emerald-600 dark:text-emerald-400"
                  onClick={() => void handleResend()}
                  disabled={submitting || cooldown > 0}
                >
                  {cooldown > 0
                    ? t("auth.tryAgainIn", { seconds: cooldown })
                    : t("auth.resendOtpButton", "Resend OTP")}
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>
      </div>
    </div>
  );
}
