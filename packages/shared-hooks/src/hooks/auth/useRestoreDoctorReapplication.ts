import { useCallback, useState } from "react";
import axios from "axios";
import {
  restoreDoctorReapplication,
  type RestoreDoctorReapplicationPayload,
  type RestoreDoctorReapplicationResponse,
} from "../../services/auth/signup.service";

export function useRestoreDoctorReapplication() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] =
    useState<RestoreDoctorReapplicationResponse | null>(null);

  const restoreApplication = useCallback(
    async (payload: RestoreDoctorReapplicationPayload) => {
      setIsLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await restoreDoctorReapplication(payload);
        setData(res);
        return res;
      } catch (err) {
        const raw = axios.isAxiosError(err)
          ? (err.response?.data as { message?: string | string[] })?.message
          : undefined;
        const message = Array.isArray(raw)
          ? raw.join(", ")
          : raw ||
            (err instanceof Error
              ? err.message
              : "Failed to restore doctor application.");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { restoreApplication, data, isLoading, error };
}

