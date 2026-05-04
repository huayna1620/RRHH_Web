import { httpClient } from "@/services/api/httpClient";
const BASE = "/api/v1/integrations";
export async function getApiTokens() {
    const { data } = await httpClient.get(`${BASE}/tokens`);
    return data;
}
export async function createApiToken(payload) {
    const { data } = await httpClient.post(`${BASE}/tokens`, payload);
    return data;
}
export async function revokeApiToken(id) {
    await httpClient.delete(`${BASE}/tokens/${id}`);
}
export async function rotateApiToken(id) {
    const { data } = await httpClient.post(`${BASE}/tokens/${id}/rotate`);
    return data;
}
export async function getWebhooks() {
    const { data } = await httpClient.get(`${BASE}/webhooks`);
    return data;
}
export async function createWebhook(payload) {
    const { data } = await httpClient.post(`${BASE}/webhooks`, payload);
    return data;
}
export async function deleteWebhook(id) {
    await httpClient.delete(`${BASE}/webhooks/${id}`);
}
export async function toggleWebhook(id) {
    await httpClient.post(`${BASE}/webhooks/${id}/toggle`);
}
export async function getWebhookDeliveries(id) {
    const { data } = await httpClient.get(`${BASE}/webhooks/${id}/deliveries`);
    return data;
}
export async function testWebhook(id) {
    await httpClient.post(`${BASE}/webhooks/${id}/test`);
}
export async function getWebhookEvents() {
    const { data } = await httpClient.get(`${BASE}/webhooks/events`);
    return data;
}
export async function getCalendarFeeds() {
    const { data } = await httpClient.get(`${BASE}/calendar/feeds`);
    return data;
}
export async function createCalendarFeed(payload) {
    const { data } = await httpClient.post(`${BASE}/calendar/feeds`, payload);
    return data;
}
export async function revokeCalendarFeed(id) {
    await httpClient.delete(`${BASE}/calendar/feeds/${id}`);
}
export async function getCalendarFeedScopes() {
    const { data } = await httpClient.get(`${BASE}/calendar/feeds/scopes`);
    return data;
}
export async function getCalendarProviders() {
    const { data } = await httpClient.get(`${BASE}/calendar/providers`);
    return data;
}
export async function getGoogleAuthorizationUrl() {
    const { data } = await httpClient.get(`${BASE}/calendar/google/authorize`);
    return data;
}
export async function getMicrosoftAuthorizationUrl() {
    const { data } = await httpClient.get(`${BASE}/calendar/microsoft/authorize`);
    return data;
}
