import { webAdminApi } from "@/lib/api";

type AdminAssignedRole = "super_admin" | "user_admin" | "ai_admin";
type AccountStatus = "active" | "banned";

export interface AdminCreate {
  fullName: string;
  email: string;
  password: string;
  assignedRole: AdminAssignedRole;
  accountStatus?: AccountStatus;
}

export interface AdminChangeRole {
  id: string;
  assignedRole: AdminAssignedRole;
}

export async function createAdmin(payload: AdminCreate) {
  return webAdminApi.adminsCreate({
    fullName: payload.fullName,
    email: payload.email,
    password: payload.password,
    assignedRole: payload.assignedRole,
    accountStatus: payload.accountStatus ?? "active",
  });
}

export async function changeAdminRole(payload: AdminChangeRole) {
  return webAdminApi.adminsUpdate({
    params: { id: payload.id },
    body: { adminRole: payload.assignedRole },
  });
}

export async function deleteAdmin(adminUserId: string) {
  return webAdminApi.adminsDelete({
    params: { id: adminUserId },
  });
}
