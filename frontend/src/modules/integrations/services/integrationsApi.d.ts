import type { ApiToken, ApiTokenCreated, CalendarFeed, CalendarFeedCreated, CalendarFeedScope, CalendarProviderInfo, CreateApiTokenPayload, CreateCalendarFeedPayload, CreateWebhookPayload, WebhookDelivery, WebhookEndpoint, WebhookEvent } from "@/modules/integrations/types/integrations.types";
export declare function getApiTokens(): Promise<ApiToken[]>;
export declare function createApiToken(payload: CreateApiTokenPayload): Promise<ApiTokenCreated>;
export declare function revokeApiToken(id: string): Promise<void>;
export declare function rotateApiToken(id: string): Promise<ApiTokenCreated>;
export declare function getWebhooks(): Promise<WebhookEndpoint[]>;
export declare function createWebhook(payload: CreateWebhookPayload): Promise<WebhookEndpoint>;
export declare function deleteWebhook(id: string): Promise<void>;
export declare function toggleWebhook(id: string): Promise<void>;
export declare function getWebhookDeliveries(id: string): Promise<WebhookDelivery[]>;
export declare function testWebhook(id: string): Promise<void>;
export declare function getWebhookEvents(): Promise<WebhookEvent[]>;
export declare function getCalendarFeeds(): Promise<CalendarFeed[]>;
export declare function createCalendarFeed(payload: CreateCalendarFeedPayload): Promise<CalendarFeedCreated>;
export declare function revokeCalendarFeed(id: string): Promise<void>;
export declare function getCalendarFeedScopes(): Promise<CalendarFeedScope[]>;
export declare function getCalendarProviders(): Promise<CalendarProviderInfo[]>;
export declare function getGoogleAuthorizationUrl(): Promise<{
    authorizationUrl: string;
}>;
export declare function getMicrosoftAuthorizationUrl(): Promise<{
    authorizationUrl: string;
}>;
