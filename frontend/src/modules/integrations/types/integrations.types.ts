export interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAtUtc: string | null;
  lastUsedAtUtc: string | null;
  description: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

export interface ApiTokenCreated {
  id: string;
  name: string;
  token: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAtUtc: string | null;
  description: string | null;
}

export interface CreateApiTokenPayload {
  name: string;
  scopes: string[];
  expirationDays: number | null;
  description: string;
}

export type WebhookPayloadFormat = "raw" | "slack" | "teams";

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secretMasked: string;
  isActive: boolean;
  failureCount: number;
  lastDeliveryAtUtc: string | null;
  lastDeliverySuccess: boolean | null;
  description: string | null;
  createdAtUtc: string;
  format: WebhookPayloadFormat;
}

export interface CreateWebhookPayload {
  name: string;
  url: string;
  events: string[];
  description: string;
  format: WebhookPayloadFormat;
}

export const WEBHOOK_PAYLOAD_FORMATS: { value: WebhookPayloadFormat; label: string; hint: string }[] = [
  { value: "raw",   label: "Genérico (JSON HRMS)", hint: "JSON estándar con firma HMAC. Úsalo para sistemas propios o integraciones custom." },
  { value: "slack", label: "Slack (Block Kit)",    hint: "Transforma el payload a Slack Block Kit con emoji, título y campos." },
  { value: "teams", label: "Microsoft Teams",       hint: "Transforma el payload a MessageCard de Teams con sección y facts." },
];

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  payload: string;
  responseStatusCode: number | null;
  responseBody: string | null;
  success: boolean;
  attemptNumber: number;
  deliveredAtUtc: string;
  errorMessage: string | null;
}

export interface WebhookEvent {
  eventType: string;
  description: string;
  payloadExample: string;
}

// ── Calendar Feeds (iCal) ──────────────────────────────────────────
export interface CalendarFeed {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  lastAccessedAtUtc: string | null;
  accessCount: number;
  isRevoked: boolean;
  createdAtUtc: string;
}

export interface CalendarFeedCreated {
  id: string;
  name: string;
  feedUrl: string;
  scopes: string[];
  createdAtUtc: string;
}

export interface CreateCalendarFeedPayload {
  name: string;
  scopes: string[];
}

export interface CalendarFeedScope {
  code: string;
  label: string;
  description: string;
  requiresAdminRole: boolean;
}

// ── Calendar OAuth Connections (Google push) ───────────────────────
export interface CalendarConnection {
  id: string;
  provider: string;
  providerAccountEmail: string;
  calendarId: string;
  status: "active" | "unauthorized" | "error" | string;
  lastSyncAtUtc: string | null;
  lastSyncError: string | null;
  createdAtUtc: string;
}

export interface OAuthAuthorizeResult {
  authorizationUrl: string;
}

export interface CalendarProviderInfo {
  provider: string;
  displayName: string;
  enabled: boolean;
}

export const AVAILABLE_SCOPES = [
  { value: "employees:read",   label: "Empleados — Lectura" },
  { value: "employees:write",  label: "Empleados — Escritura" },
  { value: "payroll:read",     label: "Planilla — Lectura" },
  { value: "attendance:read",  label: "Asistencia — Lectura" },
  { value: "reports:read",     label: "Reportes — Lectura" },
  { value: "analytics:read",   label: "Analytics — Lectura" },
];
