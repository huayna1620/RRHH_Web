import { httpClient } from "@/services/api/httpClient";
export async function getMyProfile() {
    const { data } = await httpClient.get("/api/v1/account/me");
    return data;
}
export async function updateMyProfile(payload) {
    const { data } = await httpClient.put("/api/v1/account/me", payload);
    return data;
}
export async function getEmployeeDashboard() {
    try {
        const { data } = await httpClient.get("/api/v1/account/my-dashboard");
        return data;
    }
    catch (error) {
        const status = error.response.status;
        if (status === 404) {
            return null;
        }
        throw error;
    }
}
export async function getCalendarEvents(year, month) {
    const { data } = await httpClient.get(`/api/v1/account/calendar?year=${year}&month=${month}`);
    return data;
}
