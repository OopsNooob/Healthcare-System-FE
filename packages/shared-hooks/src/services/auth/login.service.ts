import { api } from "../../api";
import { type AppRole } from "@repo/shared-types";

export interface Login {
  email: string;
  password: string;
}

type ApiUserAuthResponse = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  avatarUrl?: string;
};

export type ApiLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: ApiUserAuthResponse;
};

export async function submitLogin(payload: Login): Promise<ApiLoginResponse> {
  const res = await api.post("/auth/login", {
    email: payload.email,
    password: payload.password,
  });

  return res.data;
}
