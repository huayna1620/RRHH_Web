import type { AppNotification } from "@/modules/notifications/types/notification.types";
export declare function getRecentNotifications(limit: number): Promise<AppNotification[]>;
export declare function getUnreadCount(): Promise<number>;
export declare function markNotificationAsRead(id: string): Promise<void>;
export declare function markAllNotificationsAsRead(): Promise<void>;
