import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useAuthStore } from "@repo/ui/store/useAuthStore";
import {
  Field,
  FieldControl,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@repo/ui/components/ui/field";
import { Input } from "@repo/ui/components/ui/input";
import {
  Camera,
  FileText,
  LogOut,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  ShieldUser,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import { showToast } from "@repo/ui/components/ui/toasts";
import { webAdminApi, type AuthSessionItem } from "@/lib/api";
import { useProfile } from "../hooks/useProfile";
import type {
  ProfileDataReceiver,
  UserRole,
} from "../services/profile.service";
import {
  uploadProfileAvatar,
  deleteProfileAvatar,
} from "../services/profile.service";
import { useTranslation } from "react-i18next";

type VerificationDoc = {
  id: string;
  name: string;
  uploadedAt: string;
  fileUrl: string;
};

type ProfileProps = {
  role?: UserRole;
  onSave?: (payload: {
    role: UserRole;
    values: ProfileFormValues;
    avatarUrl: string;
    verificationDocs: VerificationDoc[];
  }) => Promise<void> | void;
};

type ProfileFormValues = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  country: string;
  adminAssignedRole: string;
  yearsOfExperience: string;
  specialty: string;
  workplace: string;
};

const ROLE_META: Record<
  UserRole,
  { label: string; icon: React.ReactNode; badgeClassName: string }
> = {
  admin: {
    label: "Admin",
    icon: <ShieldUser className="h-4 w-4" />,
    badgeClassName: "bg-violet-50 text-violet-600 border-violet-200",
  },
  doctor: {
    label: "Doctor",
    icon: <Stethoscope className="h-4 w-4" />,
    badgeClassName: "bg-blue-50 text-blue-600 border-blue-200",
  },
  patient: {
    label: "Patient",
    icon: <UserRound className="h-4 w-4" />,
    badgeClassName: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
};

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-6 first:border-t-0 first:pt-0">
      <p className="text-base font-semibold text-slate-900 dark:text-gray-100">{title}</p>
      <p className="text-xs text-slate-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}

function AdminRoleSection({ assignedRole }: { assignedRole: string }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionTitle title={t("profile.titles.systemRole")} />
      <div className="rounded-xl border border-violet-100 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-900/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500 p-2">
          {t("profile.fields.assignedAdminRole")}
        </p>
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="mt-1 text-sm font-semibold text-violet-700 dark:text-violet-400">
            {assignedRole}
          </p>
        </div>
      </div>
    </>
  );
}

function DoctorRoleSection({
  values,
  verificationDocs,
  onFieldChange,
  onAddDocs,
  onReplaceDoc,
}: {
  values: ProfileFormValues;
  verificationDocs: VerificationDoc[];
  onFieldChange: <K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) => void;
  onAddDocs: (files: FileList | null) => void;
  onReplaceDoc: (docId: string, file: File | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <SectionTitle title={t("profile.titles.professionalInfo")} />

      <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field className="gap-1.5">
          <FieldLabel
            htmlFor="yoe"
            className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
          >
            {t("profile.fields.yearsOfExperience")}
          </FieldLabel>
          <FieldControl>
            <Input
              id="yoe"
              value={values.yearsOfExperience}
              onChange={(e) =>
                onFieldChange("yearsOfExperience", e.target.value)
              }
              className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
            />
          </FieldControl>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel
            htmlFor="specialty"
            className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
          >
            {t("profile.fields.specialty")}
          </FieldLabel>
          <FieldControl>
            <Input
              id="specialty"
              value={values.specialty}
              onChange={(e) => onFieldChange("specialty", e.target.value)}
              className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
            />
          </FieldControl>
        </Field>

        <Field className="gap-1.5">
          <FieldLabel
            htmlFor="workplace"
            className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
          >
            {t("profile.fields.workplace")}
          </FieldLabel>
          <FieldControl>
            <Input
              id="workplace"
              value={values.workplace}
              onChange={(e) => onFieldChange("workplace", e.target.value)}
              className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
            />
          </FieldControl>
        </Field>
      </FieldGroup>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
              {t("profile.messages.verificationDocs")}
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {t("profile.messages.verificationDocsSubtitle")}
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-900 dark:bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("profile.actions.addDocs")}
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                onAddDocs(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="space-y-2">
          {verificationDocs.length > 0 ? (
            verificationDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-gray-200">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      {t("profile.messages.uploaded")} {doc.uploadedAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {t("profile.actions.view")}
                  </a>

                  <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    {t("profile.actions.replace")}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        onReplaceDoc(doc.id, e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {t("profile.messages.noDocs")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Profile({ role = "admin", onSave }: ProfileProps) {
  const { t } = useTranslation();
  const {
    data: profileData,
    isLoading,
    error,
    save: saveProfile,
  } = useProfile();

  const previousAvatarPublicId = profileData?.avatarPublicId ?? null;

  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string>("");
  const [savedValues, setSavedValues] = useState<ProfileFormValues>({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    street: "",
    ward: "",
    district: "",
    city: "",
    country: "",
    adminAssignedRole: "",
    yearsOfExperience: "",
    specialty: "",
    workplace: "",
  });
  const [savedVerificationDocs, setSavedVerificationDocs] = useState<
    VerificationDoc[]
  >([]);

  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string>(savedAvatarUrl);
  const [draftAvatarFile, setDraftAvatarFile] = useState<File | null>(null);
  const [isAvatarMarkedForRemoval, setIsAvatarMarkedForRemoval] =
    useState(false);
  const [draftValues, setDraftValues] =
    useState<ProfileFormValues>(savedValues);
  const [draftVerificationDocs, setDraftVerificationDocs] = useState<
    VerificationDoc[]
  >(savedVerificationDocs);
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();
  const clearAuthState = useAuthStore((state) => state.logout);
  const [sessions, setSessions] = useState<AuthSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      const list = await webAdminApi.authListSessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : t("profile.sessions.loadFailed", "Unable to load active sessions"),
      );
    } finally {
      setIsLoadingSessions(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSessions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: string) => {
    if (revokingSessionId || isLoggingOutAll) return;
    setRevokingSessionId(sessionId);
    try {
      await webAdminApi.authRevokeSession({ sessionId });
      setSessions((prev) =>
        prev.map((item) =>
          item.id === sessionId
            ? { ...item, revokedAt: new Date().toISOString() }
            : item,
        ),
      );
      showToast.success(t("profile.sessions.revokedSuccess", "Device session revoked"));
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("profile.sessions.revokeFailed", "Unable to revoke session"),
      );
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleLogoutAll = async () => {
    if (isLoggingOutAll || Boolean(revokingSessionId)) return;
    setIsLoggingOutAll(true);
    try {
      await webAdminApi.authLogoutAll();
      showToast.success(t("profile.sessions.logoutAllSuccess", "Signed out from all devices"));
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : t("common.failed", "Operation failed"),
      );
    } finally {
      clearAuthState();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setIsLoggingOutAll(false);
      navigate("/login");
    }
  };

  const activeRole = profileData?.role ?? role;
  const roleMeta = ROLE_META[activeRole];
  const avatarInitials = useMemo(
    () => initialsFromName(draftValues.fullName || "User"),
    [draftValues.fullName],
  );

  const isDirty = useMemo(() => {
    return (
      draftAvatarUrl !== savedAvatarUrl ||
      JSON.stringify(draftValues) !== JSON.stringify(savedValues) ||
      JSON.stringify(draftVerificationDocs) !==
        JSON.stringify(savedVerificationDocs)
    );
  }, [
    draftAvatarUrl,
    draftValues,
    draftVerificationDocs,
    savedAvatarUrl,
    savedValues,
    savedVerificationDocs,
  ]);

  useEffect(() => {
    if (!profileData) {
      return;
    }

    const nextValues: ProfileFormValues = {
      fullName: profileData.fullName,
      email: profileData.email,
      phone: profileData.phone,
      gender: profileData.gender,
      street: profileData.street,
      ward: profileData.ward,
      district: profileData.district,
      city: profileData.city,
      country: profileData.country,
      adminAssignedRole: profileData.adminAssignedRole ?? "",
      yearsOfExperience: profileData.yearsOfExperience ?? "",
      specialty: profileData.specialty ?? "",
      workplace: profileData.workplace ?? "",
    };

    const nextDocs: VerificationDoc[] = (profileData.documentsUrl ?? []).map(
      (fileUrl, index) => {
        const pathPart = fileUrl.split("/").pop() ?? "document";
        const cleanName = pathPart.split("?")[0] || `document-${index + 1}`;

        return {
          id: `server-doc-${index}`,
          name: cleanName,
          uploadedAt: t("profile.messages.fromServer"),
          fileUrl,
        };
      },
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedAvatarUrl(profileData.avatarUrl ?? "");
    setSavedValues(nextValues);
    setSavedVerificationDocs(nextDocs);

    setDraftAvatarUrl(profileData.avatarUrl ?? "");
    setIsAvatarMarkedForRemoval(false);
    setDraftValues(nextValues);
    setDraftVerificationDocs(nextDocs);
  }, [profileData, t]);

  useEffect(() => {
    if (!error) {
      return;
    }

    showToast.error(error);
  }, [error]);

  const onFieldChange = <K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) => {
    setDraftValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarUpload = (file: File | null) => {
    if (!file) return;
    setIsAvatarMarkedForRemoval(false);
    setDraftAvatarFile(file);
    setDraftAvatarUrl(URL.createObjectURL(file));
  };

  const handleAvatarRemove = () => {
    const hasPersistedAvatar = Boolean(
      savedAvatarUrl || previousAvatarPublicId,
    );
    setDraftAvatarUrl("");
    setDraftAvatarFile(null);
    setIsAvatarMarkedForRemoval(hasPersistedAvatar);
  };

  const handleAddVerificationDocs = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const uploadedAt = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const nextDocs = Array.from(files).map((file, index) => ({
      id: `new-doc-${Date.now()}-${index}`,
      name: file.name,
      uploadedAt,
      fileUrl: URL.createObjectURL(file),
    }));

    setDraftVerificationDocs((prev) => [...nextDocs, ...prev]);
  };

  const handleReplaceVerificationDoc = (docId: string, file: File | null) => {
    if (!file) return;

    const uploadedAt = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    setDraftVerificationDocs((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              name: file.name,
              uploadedAt,
              fileUrl: URL.createObjectURL(file),
            }
          : doc,
      ),
    );
  };

  const handleDiscardChanges = () => {
    setDraftAvatarUrl(savedAvatarUrl);
    setDraftAvatarFile(null);
    setIsAvatarMarkedForRemoval(false);
    setDraftValues(savedValues);
    setDraftVerificationDocs(savedVerificationDocs);
  };

  const handleSaveChanges = async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    try {
      let avatarUrlToSave = savedAvatarUrl;
      let avatarPublicIdToSave = profileData?.avatarPublicId ?? "";

      if (draftAvatarFile) {
        const uploadedAvatar = await uploadProfileAvatar(
          draftAvatarFile,
          activeRole,
        );

        if (uploadedAvatar.avatarUrl) {
          avatarUrlToSave = uploadedAvatar.avatarUrl;
          avatarPublicIdToSave = uploadedAvatar.avatarPublicId;
        }
      } else if (isAvatarMarkedForRemoval) {
        avatarUrlToSave = "";
        avatarPublicIdToSave = "";
      } else if (draftAvatarUrl && !draftAvatarUrl.startsWith("blob:")) {
        avatarUrlToSave = draftAvatarUrl;
      }

      if (onSave) {
        await onSave({
          role: activeRole,
          values: draftValues,
          avatarUrl: avatarUrlToSave,
          verificationDocs: draftVerificationDocs,
        });
      } else {
        const payload: ProfileDataReceiver = {
          id: profileData?.id ?? "",
          isOnline: profileData?.isOnline ?? false,
          role: activeRole,
          avatarUrl: avatarUrlToSave,
          avatarPublicId: avatarPublicIdToSave || undefined,
          fullName: draftValues.fullName,
          email: draftValues.email,
          phone: draftValues.phone,
          gender: draftValues.gender,
          street: draftValues.street,
          ward: draftValues.ward,
          district: draftValues.district,
          city: draftValues.city,
          country: draftValues.country,
          adminAssignedRole: draftValues.adminAssignedRole,
          yearsOfExperience: draftValues.yearsOfExperience,
          specialty: draftValues.specialty,
          workplace: draftValues.workplace,
          documentsUrl: draftVerificationDocs
            .map((doc) => doc.fileUrl)
            .filter((url) => /^https?:\/\//.test(url)),
        };

        await saveProfile(payload);
      }

      if (
        draftAvatarFile &&
        previousAvatarPublicId &&
        previousAvatarPublicId !== avatarPublicIdToSave
      ) {
        await deleteProfileAvatar(previousAvatarPublicId);
      }

      if (isAvatarMarkedForRemoval && previousAvatarPublicId) {
        await deleteProfileAvatar(previousAvatarPublicId);
      }

      setSavedAvatarUrl(avatarUrlToSave);
      setDraftAvatarUrl(avatarUrlToSave);
      setDraftAvatarFile(null);
      setIsAvatarMarkedForRemoval(false);
      setSavedValues(draftValues);
      setSavedVerificationDocs(draftVerificationDocs);
      showToast.success(t("profile.messages.profileUpdated"));
    } catch (saveError) {
      showToast.error(
        saveError instanceof Error
          ? saveError.message
          : t("profile.messages.failedToSave"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profileData) {
    return (
      <div className="w-full p-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
          <p className="sr-only">{t("profile.subtitles.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="relative">
            {draftAvatarUrl ? (
              <img
                src={draftAvatarUrl}
                alt="Profile avatar"
                className="h-40 w-40 rounded-full border-2 border-white object-cover shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-violet-500 text-3xl font-bold text-white shadow-md">
                {avatarInitials || "U"}
              </div>
            )}

            <button
              type="button"
              className="cursor-pointer absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white dark:border-slate-800 bg-slate-900 dark:bg-slate-700 text-white shadow-sm hover:bg-slate-700 dark:hover:bg-slate-600"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
            </button>

            {draftAvatarUrl ? (
              <button
                type="button"
                className="cursor-pointer absolute top-26 -right-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-red-600 text-white shadow-sm hover:bg-red-500"
                onClick={handleAvatarRemove}
                aria-label="Remove avatar"
                title="Remove avatar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}

            <input
              ref={avatarInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                handleAvatarUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>

          <Badge
            variant="outline"
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleMeta.badgeClassName}`}
          >
            <span className="mr-1 inline-flex">{roleMeta.icon}</span>
            {t(`profile.roles.${activeRole}`)}
          </Badge>
        </div>

        <FieldSet className="gap-6">
          <SectionTitle title={t("profile.titles.basicInfo")} />

          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field className="gap-1.5 md:col-span-2">
              <FieldLabel
                htmlFor="fullName"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.fullName")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="fullName"
                  value={draftValues.fullName}
                  onChange={(e) => onFieldChange("fullName", e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
                />
              </FieldControl>
            </Field>

            <Field className="gap-1.5 md:col-span-2">
              <FieldLabel
                htmlFor="email"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.email")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="email"
                  disabled
                  readOnly
                  value={draftValues.email}
                  className="h-auto cursor-not-allowed border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-500"
                />
              </FieldControl>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="phone"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.phone")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="phone"
                  value={draftValues.phone}
                  onChange={(e) => onFieldChange("phone", e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
                />
              </FieldControl>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="gender"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.gender")}
              </FieldLabel>
              <FieldControl>
                <select
                  id="gender"
                  value={draftValues.gender}
                  onChange={(e) => onFieldChange("gender", e.target.value)}
                  className="h-auto w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-900 dark:text-gray-100 outline-none focus-visible:ring-0"
                >
                  <option value="Female">{t("profile.genders.female")}</option>
                  <option value="Male">{t("profile.genders.male")}</option>
                </select>
              </FieldControl>
            </Field>
          </FieldGroup>

          <SectionTitle title={t("profile.titles.contactAddress")} />

          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field className="gap-1.5 md:col-span-2">
              <FieldLabel
                htmlFor="street"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.street")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="street"
                  value={draftValues.street}
                  onChange={(e) => onFieldChange("street", e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
                />
              </FieldControl>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="ward"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.ward")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="ward"
                  value={draftValues.ward}
                  onChange={(e) => onFieldChange("ward", e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
                />
              </FieldControl>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="district"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.district")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="district"
                  value={draftValues.district}
                  onChange={(e) => onFieldChange("district", e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
                />
              </FieldControl>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="city"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.city")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="city"
                  value={draftValues.city}
                  onChange={(e) => onFieldChange("city", e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
                />
              </FieldControl>
            </Field>

            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="country"
                className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400"
              >
                {t("profile.fields.country")}
              </FieldLabel>
              <FieldControl>
                <Input
                  id="country"
                  value={draftValues.country}
                  onChange={(e) => onFieldChange("country", e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:text-gray-100"
                />
              </FieldControl>
            </Field>
          </FieldGroup>

          {activeRole === "admin" ? (
            <AdminRoleSection assignedRole={draftValues.adminAssignedRole} />
          ) : null}

          {activeRole === "doctor" ? (
            <DoctorRoleSection
              values={draftValues}
              verificationDocs={draftVerificationDocs}
              onFieldChange={onFieldChange}
              onAddDocs={handleAddVerificationDocs}
              onReplaceDoc={handleReplaceVerificationDoc}
            />
          ) : null}

          {/* {role === "patient" ? <PatientRoleSection /> : null} */}

          <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              type="button"
              className="rounded-xl px-6 text-white"
              onClick={handleSaveChanges}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? t("profile.actions.saving") : t("profile.actions.saveChanges")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-6 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
              onClick={handleDiscardChanges}
              disabled={!isDirty || isSaving}
            >
              {t("profile.actions.discard")}
            </Button>
          </div>
        </FieldSet>

        <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-gray-100">
                  {t("profile.sessions.title", "Security & Active Sessions")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  {t("profile.sessions.subtitle", "Monitor signed-in browsers and revoke active refresh sessions.")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchSessions()}
                disabled={isLoadingSessions || isLoggingOutAll}
                className="rounded-xl dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
                {t("common.refresh", "Refresh")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void handleLogoutAll()}
                disabled={isLoggingOutAll || Boolean(revokingSessionId)}
                className="rounded-xl"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {t("profile.sessions.logoutAll", "Sign out all devices")}
              </Button>
            </div>
          </div>

          {sessionsError && (
            <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
              {sessionsError}
            </div>
          )}

          {isLoadingSessions ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-6 text-center text-xs text-slate-500 dark:text-gray-400">
              {t("profile.sessions.empty", "No active sessions found.")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((session) => {
                const isRevoked = Boolean(session.revokedAt);
                const lastSeenRaw = session.lastActiveAt || session.issuedAt;
                const formattedSeen = lastSeenRaw
                  ? new Date(lastSeenRaw).toLocaleString(t("common.dateLocale", "vi-VN"))
                  : "-";
                return (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <Monitor className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-gray-100">
                            {session.deviceLabel || t("profile.sessions.unknownDevice", "Recognized Browser / Device")}
                          </span>
                          {session.current && (
                            <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-none text-[11px]">
                              {t("profile.sessions.currentBadge", "Current")}
                            </Badge>
                          )}
                          {isRevoked && (
                            <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-none text-[11px]">
                              {t("profile.sessions.revokedBadge", "Revoked")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          {t("profile.sessions.lastSeen", "Last active")}: {formattedSeen}
                        </p>
                      </div>
                    </div>

                    {!session.current && !isRevoked && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={revokingSessionId === session.id || isLoggingOutAll}
                        onClick={() => void handleRevokeSession(session.id)}
                        className="rounded-lg border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {t("profile.sessions.revoke", "Revoke")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
