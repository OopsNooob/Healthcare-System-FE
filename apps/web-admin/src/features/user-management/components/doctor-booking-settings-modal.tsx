import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@repo/ui/components/ui/button";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { showToast } from "@repo/ui/components/ui/toasts";
import { extractApiErrorMessage, webAdminApi } from "@/lib/api";

interface DoctorTarget {
  id: string;
  name: string;
  email: string;
}

interface DoctorBookingSettingsModalProps {
  doctor: DoctorTarget | null;
  onClose: () => void;
}

interface FormValues {
  bufferMinutes: string;
  minNoticeMinutes: string;
  cancellationDeadlineMinutes: string;
  checkInEarlyMinutes: string;
  noShowAfterMinutes: string;
  overrideReason: string;
}

const DEFAULT_SETTINGS: Omit<FormValues, "overrideReason"> = {
  bufferMinutes: "15",
  minNoticeMinutes: "60",
  cancellationDeadlineMinutes: "60",
  checkInEarlyMinutes: "5",
  noShowAfterMinutes: "10",
};

const BOUNDS = {
  bufferMinutes: { min: 0, max: 60 },
  minNoticeMinutes: { min: 0, max: 10080 },
  cancellationDeadlineMinutes: { min: 0, max: 10080 },
  checkInEarlyMinutes: { min: 0, max: 1440 },
  noShowAfterMinutes: { min: 0, max: 1440 },
} as const;

export function DoctorBookingSettingsModal({
  doctor,
  onClose,
}: DoctorBookingSettingsModalProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>({
    ...DEFAULT_SETTINGS,
    overrideReason: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);

  useEffect(() => {
    if (!doctor) return;
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setSubmitError(null);
      setIsConfigured(true);
      setEffectiveFrom(null);
      setUpdatedAt(null);
      setValues({ ...DEFAULT_SETTINGS, overrideReason: "" });

      try {
        const res = await webAdminApi.doctorBookingSettingsGetForAdmin({
          params: { doctorId: doctor.id },
        });
        if (!active) return;
        const data = res?.data;
        if (data) {
          setIsConfigured(true);
          setEffectiveFrom(data.effectiveFrom ?? null);
          setUpdatedAt(data.updatedAt ?? null);
          setValues({
            bufferMinutes: String(data.bufferMinutes),
            minNoticeMinutes: String(data.minNoticeMinutes),
            cancellationDeadlineMinutes: String(data.cancellationDeadlineMinutes),
            checkInEarlyMinutes: String(data.checkInEarlyMinutes),
            noShowAfterMinutes: String(data.noShowAfterMinutes),
            overrideReason: "",
          });
        }
      } catch (err) {
        if (!active) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setIsConfigured(false);
        } else {
          setLoadError(
            extractApiErrorMessage(err, t("doctorBookingSettings.errors.loadFailed")),
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [doctor, t]);

  if (!doctor) return null;

  const updateNumericField = (
    field: Exclude<keyof FormValues, "overrideReason">,
    raw: string,
  ) => {
    setValues((prev) => ({ ...prev, [field]: raw.replace(/[^\d]/g, "") }));
    setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || saveLockRef.current) return;
    setSubmitError(null);

    const parsedBuffer = Number(values.bufferMinutes);
    const parsedMinNotice = Number(values.minNoticeMinutes);
    const parsedCancel = Number(values.cancellationDeadlineMinutes);
    const parsedCheckInEarly = Number(values.checkInEarlyMinutes);
    const parsedNoShow = Number(values.noShowAfterMinutes);
    const trimmedReason = values.overrideReason.trim();

    const checks: Array<{
      raw: string;
      val: number;
      min: number;
      max: number;
      label: string;
    }> = [
      {
        raw: values.bufferMinutes,
        val: parsedBuffer,
        ...BOUNDS.bufferMinutes,
        label: t("doctorBookingSettings.fields.bufferMinutes"),
      },
      {
        raw: values.minNoticeMinutes,
        val: parsedMinNotice,
        ...BOUNDS.minNoticeMinutes,
        label: t("doctorBookingSettings.fields.minNoticeMinutes"),
      },
      {
        raw: values.cancellationDeadlineMinutes,
        val: parsedCancel,
        ...BOUNDS.cancellationDeadlineMinutes,
        label: t("doctorBookingSettings.fields.cancellationDeadlineMinutes"),
      },
      {
        raw: values.checkInEarlyMinutes,
        val: parsedCheckInEarly,
        ...BOUNDS.checkInEarlyMinutes,
        label: t("doctorBookingSettings.fields.checkInEarlyMinutes"),
      },
      {
        raw: values.noShowAfterMinutes,
        val: parsedNoShow,
        ...BOUNDS.noShowAfterMinutes,
        label: t("doctorBookingSettings.fields.noShowAfterMinutes"),
      },
    ];

    for (const c of checks) {
      if (!c.raw.trim() || !Number.isInteger(c.val) || c.val < c.min || c.val > c.max) {
        setSubmitError(
          t("doctorBookingSettings.errors.rangeInvalid", {
            field: c.label,
            min: c.min,
            max: c.max,
          }),
        );
        return;
      }
    }

    if (trimmedReason.length < 3 || trimmedReason.length > 500) {
      setSubmitError(t("doctorBookingSettings.errors.overrideReasonLength"));
      return;
    }

    saveLockRef.current = true;
    setIsSaving(true);
    try {
      await webAdminApi.doctorBookingSettingsOverride({
        params: { doctorId: doctor.id },
        body: {
          bookingPolicy: "instant",
          bufferMinutes: parsedBuffer,
          minNoticeMinutes: parsedMinNotice,
          cancellationDeadlineMinutes: parsedCancel,
          checkInEarlyMinutes: parsedCheckInEarly,
          noShowAfterMinutes: parsedNoShow,
          overrideReason: trimmedReason,
        },
      });
      showToast.success(t("doctorBookingSettings.toasts.overrideSuccess"));
      onClose();
    } catch (err) {
      const msg = extractApiErrorMessage(err, t("doctorBookingSettings.errors.overrideFailed"));
      setSubmitError(msg);
      showToast.error(msg);
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const renderNumberInput = (
    field: Exclude<keyof FormValues, "overrideReason">,
    label: string,
    rangeHint: string,
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-700 dark:text-slate-200">{label}</label>
        <span className="text-slate-400 dark:text-slate-500">{rangeHint}</span>
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={values[field]}
          disabled={isSaving || isLoading}
          onChange={(e) => updateNumericField(field, e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 pr-14 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
          {t("doctorBookingSettings.minutesUnit")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("doctorBookingSettings.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {doctor.name} • {doctor.email}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <Skeleton className="mb-2 h-3 w-28" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {loadError}
            </div>
          ) : (
            <>
              {!isConfigured ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{t("doctorBookingSettings.unconfiguredNotice")}</span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-3.5 py-2.5 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("doctorBookingSettings.bookingPolicyLabel")}:</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold dark:bg-emerald-900/60">
                    {t("doctorBookingSettings.policyInstant")}
                  </span>
                </div>
                {effectiveFrom || updatedAt ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {new Date(effectiveFrom ?? updatedAt ?? "").toLocaleString()}
                    </span>
                  </div>
                ) : null}
              </div>

              {submitError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                  {submitError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {renderNumberInput(
                  "bufferMinutes",
                  t("doctorBookingSettings.fields.bufferMinutes"),
                  "0–60",
                )}
                {renderNumberInput(
                  "minNoticeMinutes",
                  t("doctorBookingSettings.fields.minNoticeMinutes"),
                  "0–10080",
                )}
                {renderNumberInput(
                  "cancellationDeadlineMinutes",
                  t("doctorBookingSettings.fields.cancellationDeadlineMinutes"),
                  "0–10080",
                )}
                {renderNumberInput(
                  "checkInEarlyMinutes",
                  t("doctorBookingSettings.fields.checkInEarlyMinutes"),
                  "0–1440",
                )}
                {renderNumberInput(
                  "noShowAfterMinutes",
                  t("doctorBookingSettings.fields.noShowAfterMinutes"),
                  "0–1440",
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t("doctorBookingSettings.fields.overrideReason")}
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  disabled={isSaving}
                  value={values.overrideReason}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, overrideReason: e.target.value }));
                    setSubmitError(null);
                  }}
                  placeholder={t("doctorBookingSettings.placeholders.overrideReason")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
            {!loadError ? (
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || isLoading}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {isSaving
                  ? t("doctorBookingSettings.saving")
                  : t("doctorBookingSettings.saveOverride")}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

