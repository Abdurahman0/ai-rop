import type {
  Analysis,
  ApiList,
  Call,
  Client,
  FieldDefinition,
  ID,
  Lead,
  LeadStatus,
  ResourceName,
  Transcript,
  User,
} from "@/types/domain";
import { authBridge } from "./auth-bridge";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/backend-api";

/** The backend paginates every list endpoint at a fixed 50 items per page. */
export const PAGE_SIZE = 50;

export type Credentials = {
  username: string;
  password: string;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

/** Field-keyed validation errors, e.g. `{ "custom_data.narx": "raqam emas" }`. */
export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  status: number;
  friendlyMessage: string;
  fieldErrors: FieldErrors;

  constructor(status: number, message: string, friendlyMessage = friendlyApiMessage(status), fieldErrors: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.friendlyMessage = friendlyMessage;
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skips the Authorization header and the refresh-on-401 retry (auth endpoints). */
  skipAuth?: boolean;
};

function urlFor(path: string, query?: RequestOptions["query"]) {
  const base = API_URL.replace(/\/$/, "");
  const proxied = !base.startsWith("http");
  // Django needs the trailing slash, but Next redirects (308) any route that
  // carries one. The proxy re-adds it, so drop it before the local hop.
  const normalized = proxied ? path.replace(/\/$/, "") : path;
  const pathname = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const target = path.startsWith("http") ? path : `${base}${pathname}`;
  const url = new URL(target, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return base.startsWith("http") || path.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
}

function flattenMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.map(flattenMessage).filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  return null;
}

/**
 * DRF hands back either `{ detail }` or a field-keyed object. `custom_data`
 * errors are nested one level deeper (`{ custom_data: { key: message } }`).
 */
function parseErrorBody(data: unknown): { message: string | null; fieldErrors: FieldErrors } {
  const fieldErrors: FieldErrors = {};
  if (!data || typeof data !== "object") return { message: null, fieldErrors };

  const record = data as Record<string, unknown>;
  let message = flattenMessage(record.detail) ?? flattenMessage(record.message) ?? flattenMessage(record.non_field_errors);

  Object.entries(record).forEach(([key, value]) => {
    if (key === "detail" || key === "message" || key === "non_field_errors") return;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
        const nested = flattenMessage(nestedValue);
        if (nested) fieldErrors[`${key}.${nestedKey}`] = nested;
      });
      return;
    }
    const flat = flattenMessage(value);
    if (flat) fieldErrors[key] = flat;
  });

  if (!message) {
    const first = Object.values(fieldErrors)[0];
    if (first) message = first;
  }
  return { message, fieldErrors };
}

let refreshInFlight: Promise<string | null> | null = null;

/** Collapses parallel 401s into a single refresh call. */
function refreshOnce() {
  if (!refreshInFlight) {
    refreshInFlight = authBridge.refresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function send(path: string, options: RequestOptions, token: string | null) {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");

  return fetch(urlFor(path, options.query), {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function toApiError(response: Response) {
  let message = "Something went wrong while talking to the backend.";
  let fieldErrors: FieldErrors = {};
  try {
    const parsed = parseErrorBody(await response.json());
    message = parsed.message ?? message;
    fieldErrors = parsed.fieldErrors;
  } catch {
    message = response.statusText || message;
  }
  // 400 and 403 carry a specific, user-facing reason from the backend.
  const friendly = response.status === 400 || response.status === 403 ? message : friendlyApiMessage(response.status);
  return new ApiError(response.status, message, friendly, fieldErrors);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.skipAuth ? null : options.token ?? authBridge.getAccessToken();

  let response: Response;
  try {
    response = await send(path, options, token);
  } catch (error) {
    throw new ApiError(0, error instanceof Error ? error.message : "Network error", friendlyApiMessage(0));
  }

  // Access tokens live 30 minutes; refresh once and replay the request.
  if (response.status === 401 && !options.skipAuth) {
    const refreshed = await refreshOnce();
    if (!refreshed) {
      authBridge.onUnauthorized();
      throw await toApiError(response);
    }
    try {
      response = await send(path, options, refreshed);
    } catch (error) {
      throw new ApiError(0, error instanceof Error ? error.message : "Network error", friendlyApiMessage(0));
    }
    if (response.status === 401) authBridge.onUnauthorized();
  }

  if (!response.ok) {
    const error = await toApiError(response);
    const reading = !options.method || options.method === "GET" || options.method === "HEAD";
    if (error.status === 403 && reading) authBridge.onForbidden(error.friendlyMessage);
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeItem(resource: ResourceName, item: unknown): unknown {
  if (!item || typeof item !== "object") return item;
  const record = { ...(item as Record<string, unknown>) };
  if (resource === "calls") {
    record.duration = toNumber(record.duration_seconds ?? record.duration) ?? undefined;
  }
  if (resource === "analyses") {
    record.overall_score = toNumber(record.overall_score);
  }
  if (resource === "transcripts" && record.segments === null) {
    record.segments = [];
  }
  return record;
}

function normalizePayload<T>(resource: ResourceName, payload: T): T {
  if (Array.isArray(payload)) return payload.map((item) => normalizeItem(resource, item)) as T;
  if (payload && typeof payload === "object" && "results" in payload && Array.isArray((payload as { results?: unknown[] }).results)) {
    return { ...(payload as Record<string, unknown>), results: (payload as { results: unknown[] }).results.map((item) => normalizeItem(resource, item)) } as T;
  }
  return normalizeItem(resource, payload) as T;
}

export function friendlyApiMessage(status: number) {
  const messages: Record<number, string> = {
    0: "Unable to reach the backend. Check the API connection and try again.",
    400: "The request could not be completed. Please check the entered information.",
    401: "Your session has expired. Please sign in again.",
    403: "You do not have permission to perform this action.",
    404: "The requested record could not be found.",
    409: "This change conflicts with existing data.",
    422: "Some fields need attention before this can be saved.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "The backend ran into a problem. Please try again shortly.",
  };
  return messages[status] ?? "Something went wrong. Please try again.";
}

export const authApi = {
  login: (credentials: Credentials) => apiRequest<TokenPair>("/api/auth/token/", { method: "POST", body: credentials, skipAuth: true }),
  // Refresh tokens rotate: the response carries a new refresh token too.
  refresh: (refresh: string) => apiRequest<TokenPair>("/api/auth/token/refresh/", { method: "POST", body: { refresh }, skipAuth: true }),
};

type ListQuery = RequestOptions["query"];

function readResource<T extends { id: ID }>(resource: ResourceName) {
  const base = `/api/${resource}/`;
  return {
    list: (token?: string | null, query?: ListQuery) => apiRequest<ApiList<T>>(base, { token, query }).then((payload) => normalizePayload(resource, payload)),
    get: (id: ID, token?: string | null) => apiRequest<T>(`${base}${id}/`, { token }).then((payload) => normalizePayload(resource, payload)),
  };
}

function writeResource<T extends { id: ID }>(resource: ResourceName) {
  const base = `/api/${resource}/`;
  return {
    ...readResource<T>(resource),
    create: (data: Partial<T>, token?: string | null) => apiRequest<T>(base, { method: "POST", body: data, token }).then((payload) => normalizePayload(resource, payload)),
    patch: (id: ID, data: Partial<T>, token?: string | null) => apiRequest<T>(`${base}${id}/`, { method: "PATCH", body: data, token }).then((payload) => normalizePayload(resource, payload)),
    delete: (id: ID, token?: string | null) => apiRequest<void>(`${base}${id}/`, { method: "DELETE", token }),
  };
}

// Calls, transcripts and analyses are produced by the backend pipeline: read-only.
export const callsApi = readResource<Call>("calls");
export const analysesApi = readResource<Analysis>("analyses");
export const transcriptsApi = readResource<Transcript>("transcripts");

/**
 * Call recordings are private: they are fetched with the bearer token from
 * `/api/calls/{id}/audio/` and played as a blob, never as a plain `<audio src>`.
 */
export function callAudioPath(id: ID) {
  return `/api/calls/${id}/audio/`;
}

/** Company members, for assignment dropdowns and resolving operator ids. */
export const usersApi = {
  ...readResource<User>("users"),
  /** The signed-in user, including the role the whole UI is gated on. */
  me: (token?: string | null) => apiRequest<User>("/api/users/me/", { token }),
};

export const clientsApi = writeResource<Client>("clients");
export const leadsApi = writeResource<Lead>("leads");
export const leadStatusesApi = writeResource<LeadStatus>("lead-statuses");
/** DELETE on a field definition is a soft delete: it flips `is_active` to false. */
export const fieldDefinitionsApi = writeResource<FieldDefinition>("field-definitions");
