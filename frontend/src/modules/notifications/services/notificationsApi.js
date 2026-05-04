import { httpClient } from "@/services/api/httpClient";
export async function getRecentNotifications(limit = 20) {
    const { data } = await httpClient.get(`/api/v1/notifications?limit=${limit}`);
    return data;
}
export async function getUnreadCount() {
    const { data } = await httpClient.get("/api/v1/notifications/unread-count");
    return data.count;
}
export async function markNotificationAsRead(id) {
    await httpClient.post(`/api/v1/notifications/${id}/read`);
}
export async function markAllNotificationsAsRead() {
    await httpClient.post("/api/v1/notifications/read-all");
}
