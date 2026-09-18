import { api } from "../../api";

export async function submitLogout(): Promise<void> {
  await api.post("/auth/logout");
}
