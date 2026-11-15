import {
  normalizeCursorList,
  webAdminApi,
  type CursorPaginatedResult,
  type NotificationsCreateRequest,
} from "@/lib/api";

export type NotificationType = "critical" | "warning" | "info" | "success";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
};

type ApiNotificationItem = {
  _id?: string;
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
};

function mapNotification(item: ApiNotificationItem): NotificationItem {
  return {
    id: item._id ?? item.id ?? "",
    title: item.title,
    message: item.message,
    type: item.type,
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt,
    readAt: item.readAt,
  };
}

export async function getNotifications(query?: {
  page?: number;
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  type?: string;
}): Promise<NotificationItem[]> {
  const res = await webAdminApi.notificationsFindAll(
    { query: query ?? {} },
  );
  const normalized = normalizeCursorList<ApiNotificationItem>(res);
  return normalized.items.map(mapNotification);
}

export async function getNotificationsPage(query?: {
  page?: number;
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  type?: string;
}): Promise<CursorPaginatedResult<NotificationItem>> {
  const res = await webAdminApi.notificationsFindAll(
    { query: query ?? {} },
  );
  const normalized = normalizeCursorList<ApiNotificationItem>(res);
  return {
    ...normalized,
    items: normalized.items.map(mapNotification),
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await webAdminApi.notificationsCountUnread();
  return res.data?.unreadCount ?? 0;
}

export async function getNotificationById(
  notificationId: string,
): Promise<NotificationItem> {
  const res = await webAdminApi.notificationsFindOne({
    params: { id: notificationId },
  });
  return mapNotification(res.data as ApiNotificationItem);
}

export async function createNotification(
  payload: NotificationsCreateRequest,
): Promise<NotificationItem> {
  const res = await webAdminApi.notificationsCreate(payload);
  return mapNotification(res.data as ApiNotificationItem);
}

export async function markAllNotificationsAsRead(): Promise<{
  modifiedCount: number;
}> {
  const res = await webAdminApi.notificationsMarkAllAsRead();
  return res.data;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<NotificationItem> {
  const res = await webAdminApi.notificationsUpdate({
    params: { id: notificationId },
    body: { read: true },
  });
  return mapNotification(res.data as ApiNotificationItem);
}

export async function deleteNotification(
  notificationId: string,
): Promise<{ statusCode: number; message: string }> {
  return webAdminApi.notificationsDelete({
    params: { id: notificationId },
  });
}
