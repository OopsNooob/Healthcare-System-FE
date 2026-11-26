import { api, mobileApi } from "../../api";
import type { FeTypes } from "@healthcare/api-client";

export type AuthSessionItem = FeTypes.AuthSessionItem;

export async function submitLogout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function submitLogoutAll(): Promise<FeTypes.AuthLogoutAllResponse> {
  return mobileApi.authLogoutAll();
}

export async function fetchAuthSessions(): Promise<AuthSessionItem[]> {
  return mobileApi.authListSessions();
}

export async function revokeAuthSession(
  sessionId: string,
): Promise<FeTypes.AuthRevokeSessionResponse> {
  return mobileApi.authRevokeSession({ sessionId });
}

export async function exchangeGoogleOAuthTicket(
  payload: FeTypes.ExchangeGoogleMobileOAuthRequest,
): Promise<FeTypes.AuthExchangeGoogleOAuthTicketResponse> {
  return mobileApi.authExchangeGoogleOAuthTicket(payload);
}
