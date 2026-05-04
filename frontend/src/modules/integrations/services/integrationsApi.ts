import { httpClient } from "@/services/api/httpClient";
import type {
  ApiToken,
  ApiTokenCreated,
  CalendarFeed,
  CalendarFeedCreated,
  CalendarFeedScope,
  CalendarProviderInfo,
  CreateApiTokenPayload,
  CreateCalendarFeedPayload,
  CreateWebhookPayload,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEvent,
} from "@/modules/integrations/types/integrations.types";

const BASE = "/api/v1/integrations";

export async function getApiTokens(): Promise<ApiToken[]> {
  const { data } = await httpClient.get<ApiToken[]>(`${BASE}/tokens`);
  return data;
}

export async function createApiToken(payload: CreateApiTokenPayload): Promise<ApiTokenCreated> {
  const { data } = await httpClient.post<ApiTokenCreated>(`${BASE}/tokens`, payload);
  return data;
}

export async function revokeApiToken(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/tokens/${id}`);
}

export async function rotateApiToken(id: string): Promise<ApiTokenCreated> {
  const { data } = await httpClient.post<ApiTokenCreated>(`${BASE}/tokens/${id}/rotate`);
  return data;
}

export async function getWebhooks(): Promise<WebhookEndpoint[]> {
  const { data } = await httpClient.get<WebhookEndpoint[]>(`${BASE}/webhooks`);
  return data;
}

export async function createWebhook(payload: CreateWebhookPayload): Promise<WebhookEndpoint> {
  const { data } = await httpClient.post<WebhookEndpoint>(`${BASE}/webhooks`, payload);
  return data;
}

export async function deleteWebhook(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/webhooks/${id}`);
}

export async function toggleWebhook(id: string): Promise<void> {
  await httpClient.post(`${BASE}/webhooks/${id}/toggle`);
}

export async function getWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  const { data } = await httpClient.get<WebhookDelivery[]>(`${BASE}/webhooks/${id}/deliveries`);
  return data;
}

export async function testWebhook(id: string): Promise<void> {
  await httpClient.post(`${BASE}/webhooks/${id}/test`);
}

export async function getWebhookEvents(): Promise<WebhookEvent[]> {
  const { data } = await httpClient.get<WebhookEvent[]>(`${BASE}/webhooks/events`);
  return data;
}

export async function getCalendarFeeds(): Promise<CalendarFeed[]> {
  const { data } = await httpClient.get<CalendarFeed[]>(`${BASE}/calendar/feeds`);
  return data;
}

export async function createCalendarFeed(payload: CreateCalendarFeedPayload): Promise<CalendarFeedCreated> {
  const { data } = await httpClient.post<CalendarFeedCreated>(`${BASE}/calendar/feeds`, payload);
  return data;
}

export async function revokeCalendarFeed(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/calendar/feeds/${id}`);
}

export async function getCalendarFeedScopes(): Promise<CalendarFeedScope[]> {
  const { data } = await httpClient.get<CalendarFeedScope[]>(`${BASE}/calendar/feeds/scopes`);
  return data;
}

export async function getCalendarProviders(): Promise<CalendarProviderInfo[]> {
  const { data } = await httpClient.get<CalendarProviderInfo[]>(`${BASE}/calendar/providers`);
  return data;
}

export async function getGoogleAuthorizationUrl(): Promise<{ authorizationUrl: string }> {
  const { data } = await httpClient.get<{ authorizationUrl: string }>(`${BASE}/calendar/google/authorize`);
  return data;
}

export async function getMicrosoftAuthorizationUrl(): Promise<{ authorizationUrl: string }> {
  const { data } = await httpClient.get<{ authorizationUrl: string }>(`${BASE}/calendar/microsoft/authorize`);
  return data;
}
