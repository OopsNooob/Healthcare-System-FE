import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@repo/ui/store/useAuthStore";
import { connectNotificationsSocket, notificationsSocket } from "@/lib/api";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
  type NotificationType,
} from "../services/notifications.service";

export { useNotificationSync } from "./useNotificationSync";

type SocketNotificationPayload = {
  userId?: string;
  action?: "send" | "mark_read" | "mark_all_read" | "deleted";
  notification?: {
    id?: string;
    title?: string;
    message?: string;
    isRead?: boolean;
    createdAt?: string;
    type?: NotificationType;
  };
};

const SOCKET_NOTIFICATION_EVENT = "notifications";

function playNotificationSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Autoplay restrictions or audio disabled
  }
}

export async function unlockNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    }
  } catch {
    // ignore
  }
}

export type UseNotificationsOptions = {
  enabled?: boolean;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enabled = true } = options;
  const accessToken = useAuthStore((state) => state.token);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const items = await getNotifications();
      const sorted = items.sort(
        (a: NotificationItem, b: NotificationItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setNotifications(sorted);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    let isMounted = true;
    if (!enabled) return;

    void (async () => {
      try {
        const items = await getNotifications();
        if (!isMounted) return;
        const sorted = items.sort(
          (a: NotificationItem, b: NotificationItem) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setNotifications(sorted);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load notifications",
        );
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    const token = accessToken || localStorage.getItem("accessToken") || "";
    if (!token) return;

    if (!connectNotificationsSocket(token)) {
      return;
    }

    const handleNotificationEvent = (payload: SocketNotificationPayload) => {
      const action = payload.action;
      const notification = payload.notification;

      if (!action) return;

      if (action === "mark_all_read") {
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, isRead: true })),
        );
        return;
      }

      if (!notification?.id) {
        void fetchNotifications();
        return;
      }

      if (action === "send") {
        const nextItem: NotificationItem = {
          id: notification.id,
          title: notification.title || "Notification",
          message: notification.message || "",
          type: notification.type || "info",
          isRead: Boolean(notification.isRead),
          createdAt: notification.createdAt || new Date().toISOString(),
        };

        setNotifications((prev) => {
          const exists = prev.some((item) => item.id === nextItem.id);
          if (exists) {
            return prev;
          }
          playNotificationSound();
          return [nextItem, ...prev];
        });
        return;
      }

      if (action === "mark_read") {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, isRead: Boolean(notification.isRead) }
              : item,
          ),
        );
        return;
      }

      if (action === "deleted") {
        setNotifications((prev) =>
          prev.filter((item) => item.id !== notification.id),
        );
      }
    };

    notificationsSocket.on(SOCKET_NOTIFICATION_EVENT, handleNotificationEvent);

    return () => {
      notificationsSocket.off(
        SOCKET_NOTIFICATION_EVENT,
        handleNotificationEvent,
      );
    };
  }, [accessToken, currentUserId, enabled, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    setError(null);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark all as read",
      );
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    setError(null);
    try {
      const updated = await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, isRead: updated.isRead } : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark notification",
      );
    }
  }, []);

  const remove = useCallback(async (notificationId: string) => {
    setError(null);
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((item) => item.id !== notificationId),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete notification",
      );
    }
  }, []);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh: fetchNotifications,
    markAllAsRead,
    markAsRead,
    remove,
  };
}
