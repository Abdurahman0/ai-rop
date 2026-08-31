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
} from "@/types/domain";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/backend-api";

export type Credentials = {
  username: string;
  password: string;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

export class ApiError extends Error {
  status: number;
  friendlyMessage: string;

  constructor(status: number, message: string, friendlyMessage = friendlyApiMessage(status)) {
    super(message);
    this.status = status;
    this.friendlyMessage = friendlyMessage;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function urlFor(path: string, query?: RequestOptions["query"]) {
  const base = API_URL.replace(/\/$/, "");
  const pathname = path.startsWith("/") ? path : `/${path}`;
  const target = path.startsWith("http")
    ? path
    : base.startsWith("http")
      ? `${base}${pathname}`
      : `${base}${pathname}`;
  const url = new URL(target, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return base.startsWith("http") || path.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  let response: Response;
  try {
    response = await fetch(urlFor(path, options.query), {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new ApiError(0, error instanceof Error ? error.message : "Network error", "Unable to reach the backend. Check the API connection and try again.");
  }

  if (!response.ok) {
    let message = "Something went wrong while talking to the backend.";
    try {
      const data = (await response.json()) as { detail?: string; message?: string };
      message = data.detail ?? data.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(response.status, message);
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
  login: (credentials: Credentials) => apiRequest<TokenPair>("/api/auth/token/", { method: "POST", body: credentials }),
  refresh: (refresh: string) => apiRequest<{ access: string }>("/api/auth/token/refresh/", { method: "POST", body: { refresh } }),
};

function resourceApi<T extends { id: ID }>(resource: ResourceName) {
  const base = `/api/${resource}/`;
  return {
    list: (token?: string | null, query?: RequestOptions["query"]) => apiRequest<ApiList<T>>(base, { token, query }).then((payload) => normalizePayload(resource, payload)),
    get: (id: ID, token?: string | null) => apiRequest<T>(`${base}${id}/`, { token }).then((payload) => normalizePayload(resource, payload)),
    create: (data: Partial<T>, token?: string | null) => apiRequest<T>(base, { method: "POST", body: data, token }).then((payload) => normalizePayload(resource, payload)),
    update: (id: ID, data: Partial<T>, token?: string | null) => apiRequest<T>(`${base}${id}/`, { method: "PUT", body: data, token }).then((payload) => normalizePayload(resource, payload)),
    patch: (id: ID, data: Partial<T>, token?: string | null) => apiRequest<T>(`${base}${id}/`, { method: "PATCH", body: data, token }).then((payload) => normalizePayload(resource, payload)),
    delete: (id: ID, token?: string | null) => apiRequest<void>(`${base}${id}/`, { method: "DELETE", token }),
  };
}

export const callsApi = resourceApi<Call>("calls");
export const analysesApi = resourceApi<Analysis>("analyses");
export const transcriptsApi = resourceApi<Transcript>("transcripts");
export const clientsApi = resourceApi<Client>("clients");
export const leadsApi = resourceApi<Lead>("leads");
export const leadStatusesApi = resourceApi<LeadStatus>("lead-statuses");
export const fieldDefinitionsApi = resourceApi<FieldDefinition>("field-definitions");
