export type ID = string | number;

export type Paginated<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

export type ApiList<T> = Paginated<T> | T[];

/** The backend pipeline state machine, in order. `failed` ends it early. */
export const CALL_STAGES = ["received", "audio_stored", "transcribing", "transcribed", "analyzing", "analyzed", "completed", "failed"] as const;
export const CALL_DIRECTIONS = ["inbound", "outbound", "unknown"] as const;

/** Why an analysis did not open a lead. `insufficient_data` carries a suffix. */
export const SKIP_REASONS = ["no_client_phone", "no_lead_intent", "insufficient_data", "no_default_status"] as const;

export type CallStage = (typeof CALL_STAGES)[number] | string;
export type CallDirection = (typeof CALL_DIRECTIONS)[number] | string;

export type Call = {
  id: ID;
  provider?: string;
  external_id?: string;
  direction?: CallDirection;
  client_phone?: string;
  operator?: ID | null;
  external_operator_id?: string;
  started_at?: string;
  duration_seconds?: number | null;
  duration?: number;
  stage?: CallStage;
  error?: string | null;
  created_at?: string;
};

export type Analysis = {
  id: ID;
  call?: ID | Call;
  summary?: string;
  overall_score?: number | string | null;
  evaluation?: unknown;
  extracted_fields?: unknown;
  lead_created?: boolean;
  skip_reason?: string | null;
  model_name?: string;
  created_at?: string;
};

export type TranscriptSegment = {
  id?: ID;
  speaker?: string;
  text?: string;
  start?: number;
  end?: number;
  timestamp?: string;
};

export type Transcript = {
  id: ID;
  call?: ID | Call;
  text?: string;
  segments?: TranscriptSegment[] | Record<string, unknown> | unknown[] | null;
  provider?: string;
  created_at?: string;
};

export type Client = {
  id: ID;
  phone?: string;
  name?: string;
  custom_data?: Record<string, unknown> | null;
  created_via?: string;
  created_at?: string;
  updated_at?: string;
};

export type Lead = {
  id: ID;
  client?: ID | Client;
  status?: ID | LeadStatus;
  title?: string;
  custom_data?: Record<string, unknown> | null;
  source_call?: ID | Call | null;
  assigned_to?: ID | null;
  created_via?: string;
  created_at?: string;
  updated_at?: string;
};

export type LeadStatus = {
  id: ID;
  name?: string;
  code?: string;
  order?: number;
  color?: string;
  is_default?: boolean;
  is_final?: boolean;
  created_at?: string;
};

export type FieldDefinition = {
  id: ID;
  entity_type?: string;
  key?: string;
  label?: string;
  field_type?: string;
  is_required?: boolean;
  ai_hint?: string;
  order?: number;
  is_active?: boolean;
  is_system?: boolean;
  created_at?: string;
};

export type ResourceName =
  | "analyses"
  | "calls"
  | "clients"
  | "field-definitions"
  | "lead-statuses"
  | "leads"
  | "transcripts";

export type ResourceMeta = {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  isDemo: boolean;
};
