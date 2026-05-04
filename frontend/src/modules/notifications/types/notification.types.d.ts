export type AppNotification = {
    id: string;
    title: string;
    message: string;
    category: string | null;
    isRead: boolean;
    readAtUtc: string | null;
    createdAtUtc: string;
};
