import { httpClient } from "@/services/api/httpClient";
import type { CreateHolidayPayload, HolidayItem, UpdateHolidayPayload } from "@/modules/holidays/types/holiday.types";

export async function getHolidays(): Promise<HolidayItem[]> {
  const { data } = await httpClient.get<HolidayItem[]>("/api/v1/holidays");
  return data;
}

export async function createHoliday(payload: CreateHolidayPayload): Promise<HolidayItem> {
  const { data } = await httpClient.post<HolidayItem>("/api/v1/holidays", payload);
  return data;
}

export async function updateHoliday(id: string, payload: UpdateHolidayPayload): Promise<HolidayItem> {
  const { data } = await httpClient.put<HolidayItem>(`/api/v1/holidays/${id}`, payload);
  return data;
}

export async function deleteHoliday(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/holidays/${id}`);
}
