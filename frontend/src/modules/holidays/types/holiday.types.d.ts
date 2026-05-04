export type HolidayItem = {
    id: string;
    date: string;
    name: string;
    isRecurring: boolean;
    isActive: boolean;
};
export type CreateHolidayPayload = {
    date: string;
    name: string;
    isRecurring: boolean;
};
export type UpdateHolidayPayload = {
    date: string;
    name: string;
    isRecurring: boolean;
};
