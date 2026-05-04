import { httpClient } from "@/services/api/httpClient";
import type { AppNotification } from "@/modules/notifications/types/notification.types";

export async function getRecentNotifications(limit = 20): Promise<AppNotification[]> {
  const { data } = await httpClient.get<AppNotification[]>(`/api/v1/notifications?limit=${limit}`);
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await httpClient.get<{ count: number }>("/api/v1/notifications/unread-count");
  return data.count;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await httpClient.post(`/api/v1/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await httpClient.post("/api/v1/notifications/read-all");
}
