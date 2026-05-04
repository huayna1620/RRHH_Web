import type { CreateHolidayPayload, HolidayItem, UpdateHolidayPayload } from "@/modules/holidays/types/holiday.types";
export declare function getHolidays(): Promise<HolidayItem[]>;
export declare function createHoliday(payload: CreateHolidayPayload): Promise<HolidayItem>;
export declare function updateHoliday(id: string, payload: UpdateHolidayPayload): Promise<HolidayItem>;
export declare function deleteHoliday(id: string): Promise<void>;
