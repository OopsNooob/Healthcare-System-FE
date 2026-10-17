import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
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

export type AdminAssignedRole = "super_admin" | "user_admin" | "ai_admin";

const ADMIN_ROLE_CONFIG: Array<{ value: AdminAssignedRole; roleKey: string; defaultLabel: string }> = [
  {
    value: "super_admin",
    roleKey: "superAdmin",
    defaultLabel: "Super Admin - Full Access",
  },
  {
    value: "user_admin",
    roleKey: "userAdmin",
    defaultLabel: "User Manager - User & Doctor Verification",
  },
  {
    value: "ai_admin",
    roleKey: "aiAdmin",
    defaultLabel: "AI Manager - AI Knowledge Base",
  },
];

interface AddAdminModalProps {
  isOpen: boolean;
  fullName: string;
  email: string;
  password: string;
  role: AdminAssignedRole;
  errorMessage?: string;
  onChangeFullName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeRole: (value: AdminAssignedRole) => void;
  onClose: () => void;
  onAdd: () => void;
}

export function AddAdminModal({
  isOpen,
  fullName,
  email,
  password,
  role,
  errorMessage,
  onChangeFullName,
  onChangeEmail,
  onChangePassword,
  onChangeRole,
  onClose,
  onAdd,
}: AddAdminModalProps) {
  const { t } = useTranslation();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={t("common.close", "Close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-lg font-bold">
              {t("userManagement.addAdminModal.title", "Create admin account")}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-500 dark:text-slate-400"
              aria-label={t("common.close", "Close")}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <FieldSet className="mt-6">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("userManagement.addAdminModal.fullName", "Full Name")}{" "}
                  <span className="text-red-500">*</span>
                </FieldLabel>
                <FieldControl>
                  <UserRound className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => onChangeFullName(e.target.value)}
                    placeholder={t("userManagement.addAdminModal.fullNamePlaceholder", "e.g. Alex Rivera")}
                    className="h-full border-0 bg-transparent px-0 focus-visible:border-0 focus-visible:ring-0"
                  />
                </FieldControl>
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("userManagement.addAdminModal.email", "Email Address")}{" "}
                  <span className="text-red-500">*</span>
                </FieldLabel>
                <FieldControl>
                  <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => onChangeEmail(e.target.value)}
                    placeholder={t("userManagement.addAdminModal.emailPlaceholder", "admin@healthcare.com")}
                    className="h-full border-0 bg-transparent px-0 focus-visible:border-0 focus-visible:ring-0"
                  />
                </FieldControl>
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("userManagement.addAdminModal.tempPassword", "Temporary Password")}{" "}
                  <span className="text-red-500">*</span>
                </FieldLabel>
                <FieldControl>
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => onChangePassword(e.target.value)}
                    placeholder={t("userManagement.addAdminModal.tempPasswordPlaceholder", "Minimum 8 characters")}
                    className="h-full border-0 bg-transparent px-0 focus-visible:border-0 focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                    className="text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-600 dark:text-slate-300"
                  >
                    {isPasswordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </FieldControl>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t("userManagement.addAdminModal.tempPasswordHint", "The admin will be prompted to change this on first login.")}
                </p>
              </Field>

              <Field>
                <FieldLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("userManagement.addAdminModal.selectRole", "Select Role")}{" "}
                  <span className="text-red-500">*</span>
                </FieldLabel>
                <FieldControl>
                  <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <select
                    value={role}
                    onChange={(e) =>
                      onChangeRole(e.target.value as AdminAssignedRole)
                    }
                    className="h-full w-full appearance-none bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none"
                  >
                    {ADMIN_ROLE_CONFIG.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`userManagement.addAdminModal.roles.${option.roleKey}`, option.defaultLabel)}
                      </option>
                    ))}
                  </select>
                </FieldControl>
              </Field>

              <FieldError>{errorMessage}</FieldError>
            </FieldGroup>
          </FieldSet>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("userManagement.addAdminModal.cancel", "Cancel")}
          </Button>
          <Button type="button" onClick={onAdd}>
            {t("userManagement.addAdminModal.createAdmin", "Create Admin")}
          </Button>
        </div>
      </div>
    </div>
  );
}
