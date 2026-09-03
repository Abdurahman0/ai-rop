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
  /** Read-only expansion of `operator`; null when unassigned. */
  operator_detail?: User | null;
  external_operator_id?: string;
  started_at?: string;
  duration_seconds?: number | null;
  duration?: number;
  stage?: CallStage;
  error?: string | null;
  created_at?: string;
  /** True when a recording exists at `/api/calls/{id}/audio/`. */
  has_audio?: boolean;
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
  /** Writable ids. The `*_detail` twins are read-only expansions. */
  client?: ID | Client;
  client_detail?: Client | null;
  status?: ID | LeadStatus;
  status_detail?: LeadStatus | null;
  title?: string;
  custom_data?: Record<string, unknown> | null;
  source_call?: ID | Call | null;
  assigned_to?: ID | null;
  assigned_to_detail?: User | null;
  created_via?: string;
  created_at?: string;
  updated_at?: string;
};

/** Company member. `name` falls back to the username when there is no full name. */
export type UserRole = "admin" | "operator" | "superadmin";

export type Company = {
  id: ID;
  name?: string;
  slug?: string;
  is_active?: boolean;
  created_at?: string;
};

export type User = {
  id: ID;
  /** Defaults to admin server-side when unset. */
  role?: UserRole | string;
  is_active?: boolean;
  company?: Company | null;
  username?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
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

/** Counts of calls per score band, using the 85 / 70 cuts the UI draws. */
export type ScoreDistribution = { strong: number; attention: number; critical: number };

/** Mean per evaluation criterion. 0-5 scales, or a 0-1 rate for booleans. */
export type OperatorCriteria = Record<string, number>;

export type OperatorStats = {
  operator: User;
  calls: number;
  analyzed: number;
  overall_score: number | null;
  criteria?: OperatorCriteria;
  talk_time_seconds?: number;
  avg_call_seconds?: number;
  leads_created?: number;
  conversion_rate?: number;
  score_distribution?: ScoreDistribution;
  /** Change against the previous period of equal length; null when unknown. */
  score_trend?: number | null;
};

export type StatsPeriod = { from: string | null; to: string | null };

export type OperatorStatsList = { period?: StatsPeriod; results?: OperatorStats[] };

export type TimelinePoint = { date: string; calls?: number; analyzed?: number; score?: number | null };

export type OperatorClientStat = {
  client: { id: ID; name?: string; phone?: string };
  calls: number;
  overall_score: number | null;
  last_call_at?: string;
  worst_call?: { id: ID; score: number | null } | null;
};

export type OperatorScoredCall = {
  id: ID;
  started_at?: string;
  duration_seconds?: number | null;
  client?: { id: ID; name?: string; phone?: string };
  overall_score: number | null;
  summary?: string;
};

export type OperatorStatsDetail = OperatorStats & {
  timeline?: TimelinePoint[];
  by_client?: OperatorClientStat[];
  recent_calls?: OperatorScoredCall[];
};

export type StatsOverview = {
  calls: number;
  analyzed: number;
  leads: number;
  overall_score: number | null;
  timeline?: TimelinePoint[];
};

export type ResourceName =
  | "analyses"
  | "companies"
  | "users"
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
