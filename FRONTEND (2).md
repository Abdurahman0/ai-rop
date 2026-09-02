# AIROP — Frontend Integration Guide

Everything a frontend developer needs to talk to the AIROP API. The backend is
a multi-tenant CRM: calls are ingested and analyzed by AI, and become Clients
and Leads. The frontend consumes the REST API below.

> **Interactive docs (live):**
> [**`/api/docs/`**](https://api.rob.cognilabs.org/api/docs/) (Swagger UI) ·
> [`/api/redoc/`](https://api.rob.cognilabs.org/api/redoc/) (ReDoc) ·
> [`/api/schema/`](https://api.rob.cognilabs.org/api/schema/) (raw OpenAPI).
> The docs are open (no login needed) and always in sync with the code — treat
> them as the source of truth; this file is the orientation.

---

## 1. Base URL & environment

| Env | Base URL |
| --- | --- |
| **Production** | `https://api.rob.cognilabs.org` |
| Local dev | `http://localhost:8000` |

All API paths are under `/api/`. Responses are JSON.

**CORS** is already enabled for these origins (add yours to
`config/settings/base.py → CORS_ALLOWED_ORIGINS` if different):
`localhost:3000/3001/3002/3003/5173` and the same on `192.168.1.12`.

---

## 2. Authentication (JWT)

Auth is JWT via `djangorestframework-simplejwt`. **Every** endpoint below
requires a valid access token.

### Get a token
```http
POST /api/auth/token/
Content-Type: application/json

{ "username": "user@example.com", "password": "secret" }
```
```json
{ "access": "<access-jwt>", "refresh": "<refresh-jwt>" }
```

### Use it
Send the access token on every request:
```
Authorization: Bearer <access-jwt>
```

### Refresh it
Access tokens live **30 minutes**; refresh tokens **7 days** (and rotate).
```http
POST /api/auth/token/refresh/
{ "refresh": "<refresh-jwt>" }   →   { "access": "<new-access>", "refresh": "<new-refresh>" }
```

### Important tenancy rule
The token owner belongs to **one company**, and the API automatically scopes
**all** data to that company. There is no `company` field in any request — the
server derives it from the token. A user with no company (platform superadmin)
gets **`403`** on every endpoint here.

---

## 3. Endpoints

| Resource | Path | Methods | Notes |
| --- | --- | --- | --- |
| Field definitions | `/api/field-definitions/` | GET, POST, PATCH, **DELETE = soft** | The dynamic form schema. |
| Lead statuses | `/api/lead-statuses/` | GET, POST, PATCH, DELETE | Kanban columns. |
| Clients | `/api/clients/` | GET, POST, PATCH, DELETE | Deduped by phone. |
| Leads | `/api/leads/` | GET, POST, PATCH, DELETE | Has `custom_data`. |
| Calls | `/api/calls/` | **GET only** | Ingested by the backend. Audio at `/api/calls/{id}/audio/`. |
| Transcripts | `/api/transcripts/` | **GET only** | STT output. |
| Analyses | `/api/analyses/` | **GET only** | GPT output. |
| Users | `/api/users/` | **GET only** | Company members — for assignment dropdowns & name lookup. |

Standard REST: `GET /api/leads/` (list), `GET /api/leads/{id}/` (detail),
`POST` (create), `PATCH /api/leads/{id}/` (update), `DELETE /api/leads/{id}/`.

### Pagination
List endpoints are paginated, **50 per page**:
```json
{ "count": 123, "next": "http://.../api/leads/?page=2", "previous": null, "results": [ ... ] }
```
Use `?page=N`.

### Filtering, search & ordering
Filters are server-side (so they work across all pages, not just the current 50):

| Endpoint | Filters | `?search=` | `?ordering=` |
| --- | --- | --- | --- |
| `/api/leads/` | `status`, `client`, `assigned_to`, `created_via`, `source_call` (all by id) | `title` | `created_at`, `updated_at` |
| `/api/clients/` | `created_via` | `name`, `phone` | `created_at`, `name` |
| `/api/calls/` | `stage`, `direction`, `client_phone`, `started_after`, `started_before` | `client_phone`, `external_id` | `started_at`, `created_at`, `duration_seconds` |
| `/api/field-definitions/` | `entity_type`, `is_active` | — | — |

- Combine freely: `/api/leads/?status=3&assigned_to=7&ordering=-created_at&page=2`.
- `?ordering=` takes a field; prefix `-` for descending (`?ordering=-created_at`).
  Default order is **newest-first** (`-created_at`, or `-started_at` for calls) —
  stable across pages.
- Dates are ISO-8601: `?started_after=2026-09-01T00:00:00Z`.
- `?client_phone=` is normalized before matching, so `901112233` and
  `+998901112233` both work.
- The client detail page finds a client's calls with
  `/api/calls/?client_phone=<client.phone>` (calls carry a phone, not a client id).

---

## 4. The custom-fields system (read this — it drives your forms)

Leads and Clients have **company-defined custom fields**. The schema lives in
`/api/field-definitions/`; the values live in each Lead/Client's `custom_data`
object, keyed by the field's `key`.

**Build lead/client forms dynamically from the field definitions — do not
hardcode field names.** Each company has its own set.

### A field definition
```json
{
  "id": 1,
  "entity_type": "lead",          // "lead" | "client"
  "key": "mahsulot",              // immutable; the key inside custom_data
  "label": "Qiziqqan mahsulot",   // show this to the user
  "field_type": "text",           // "text" | "number" | "date" | "phone"
  "is_required": true,
  "ai_hint": "…",                 // internal (for GPT), you can ignore
  "order": 1,                     // render order
  "is_active": true,              // false = soft-deleted, hide it
  "is_system": true,              // seeded default; still editable label-wise
  "created_at": "…"
}
```
- Render inputs for `is_active: true` fields, sorted by `order`.
- Input type from `field_type`: `text`→text, `number`→number, `date`→date
  picker (send `YYYY-MM-DD`), `phone`→phone.
- `key` / `entity_type` / `field_type` are **immutable** after creation — only
  `label`, `is_required`, `ai_hint`, `order` can be PATCHed. Sending the frozen
  ones on update is ignored.
- **DELETE is a soft delete** (returns `204`; the field just becomes
  `is_active: false`). Old leads keep their stored values.

### Writing custom_data
```http
POST /api/leads/
{
  "client": 42,
  "status": 3,
  "title": "Xolodilnik so'radi",
  "custom_data": { "mahsulot": "xolodilnik", "izoh": "narx so'radi" }
}
```
- Values are **validated server-side** against the field definitions.
- Unknown keys are silently dropped.
- Invalid values return **`400`** with per-key errors:
```json
{ "custom_data": { "narx": "raqam emas", "sana": "sana formati noto'g'ri (YYYY-MM-DD kutiladi)" } }
```

---

## 5. Resource shapes

### Client
```json
{
  "id": 42, "phone": "+998901234567", "name": "Ali",
  "custom_data": { ... },
  "created_via": "call_ai",        // "manual" | "call_ai"
  "created_at": "…", "updated_at": "…"
}
```
- `phone` is normalized server-side (`901234567` → `+998901234567`). Unique per
  company — a duplicate returns `400` "Bu telefon raqamli mijoz allaqachon mavjud."

### Lead
```json
{
  "id": 7,
  "client": 42, "client_detail": { "id": 42, "phone": "+998901234567", "name": "Ali" },
  "status": 3,  "status_detail": { "id": 3, "name": "Yangi", "code": "new", "color": "#3B82F6", ... },
  "title": "…",
  "custom_data": { "mahsulot": "xolodilnik" },
  "source_call": 15,               // read-only; set when created from a call, else null
  "assigned_to": 7, "assigned_to_detail": { "id": 7, "username": "operator1@airop.uz", "name": "Bobur Aliyev" },
  "created_via": "call_ai",
  "created_at": "…", "updated_at": "…"
}
```
- `client` / `status` / `assigned_to` are the **writable** IDs (restricted to
  your own company). The `*_detail` objects are **read-only** expansions so you
  can render names without a second lookup — send only the ids on write.
- `assigned_to_detail.name` falls back to the username when the user has no full
  name. `null` when unassigned.
- `source_call` is read-only. Every qualifying call opens a **new** lead.

### Lead status
```json
{ "id": 3, "name": "Yangi", "code": "new", "order": 1, "color": "…",
  "is_default": true, "is_final": false, "created_at": "…" }
```

### Call (read-only)
```json
{
  "id": 15, "provider": "onlinepbx", "external_id": "…",
  "direction": "inbound",          // "inbound" | "outbound" | "unknown"
  "client_phone": "+998901234567",
  "operator": 7, "operator_detail": { "id": 7, "username": "operator1@airop.uz", "name": "Bobur Aliyev" },
  "external_operator_id": "",
  "started_at": "…", "duration_seconds": 62,
  "stage": "completed",            // pipeline state, see below
  "error": "",
  "has_audio": true,               // whether a recording exists — show a player if true
  "created_at": "…"
}
```

#### Playing the call recording
The audio is **not** a public URL (customer recordings are private). Fetch it
from **`GET /api/calls/{id}/audio/`** — company-scoped and JWT-authenticated
(another tenant's call is `404`; no recording is `404`). Because a browser can't
put a token on an `<audio src>`, fetch it with the header and play the blob:

```js
const res = await fetch(`${API}/api/calls/${id}/audio/`, {
  headers: { Authorization: `Bearer ${access}` },
});
if (res.ok) audioEl.src = URL.createObjectURL(await res.blob());  // audio/mpeg
```
Only call it when `call.has_audio` is `true`.
**`stage`** (the pipeline state machine — useful for a status badge):
`received → audio_stored → transcribing → transcribed → analyzing → analyzed →
completed`, or `failed` (then `error` explains why).

### Transcript (read-only)
```json
{
  "id": 9, "call": 15,
  "text": "Alo. Assalomu alaykum. …",   // clean flat text, safe to display
  "segments": [ { "id": 0, "speaker": "SPEAKER_00", "start": 6.1, "end": 6.4, "text": "Alo." } ],
  "provider": "aisha", "created_at": "…"
}
```
- `text` is human-readable flat text. `segments` (may be `[]`) are diarized
  turns with `start`/`end` in **seconds**. Speaker labels are unreliable (a
  2-person call can show 3–4 speakers) — don't map `SPEAKER_00` to a person.

### Analysis (read-only)
```json
{
  "id": 4, "call": 15,
  "summary": "Mijoz xolodilnik narxini so'radi…",
  "overall_score": null, "evaluation": {},        // salesperson scoring: not built yet
  "extracted_fields": { "has_lead_intent": true, "client_name": null, "mahsulot": "xolodilnik", "izoh": "…" },
  "lead_created": true,
  "skip_reason": "",                               // why no lead, when lead_created=false
  "model_name": "gpt-4o-…", "created_at": "…"
}
```
- When `lead_created` is `false`, `skip_reason` is one of:
  `no_client_phone`, `no_lead_intent`, `insufficient_data: <fields>`,
  `no_default_status`.

### User (read-only)
```json
{ "id": 7, "username": "operator1@airop.uz", "name": "Bobur Aliyev",
  "first_name": "Bobur", "last_name": "Aliyev", "email": "operator1@airop.uz" }
```
`GET /api/users/` lists your company's members only (for assignment dropdowns
and resolving `operator`/`assigned_to` ids). `name` falls back to `username`
when there is no full name.

---

## 6. Error shapes

| Status | When | Body |
| --- | --- | --- |
| `401` | missing/expired token | `{ "detail": "…" }` |
| `403` | user has no company | `{ "detail": "Foydalanuvchi hech qanday kompaniyaga biriktirilmagan." }` |
| `400` | validation | field-keyed errors, e.g. `{ "custom_data": { "mahsulot": "bo'sh matn" } }` |
| `404` | not found or not in your company | `{ "detail": "Not found." }` |

Cross-company access always looks like `404`, never a leak that the id exists.

---

## 7. What's new in this handoff

- **Interactive API docs** added: **`/api/docs/`** (Swagger UI), `/api/redoc/`
  (ReDoc) and `/api/schema/` (OpenAPI). Open, no login. Build against these.
- **CORS** enabled for the dev frontend origins listed in §1.
- **Transcript `text`** is now guaranteed clean flat text. (Previously a live
  provider quirk could return a raw JSON blob in this field — fixed backend-side,
  so you can safely render `transcript.text` directly.)
- **The SEED_DATA §9 gaps are closed** (all additive, nothing removed):
  - `GET /api/users/` — company members, so `operator`/`assigned_to` resolve to names.
  - **Nested `*_detail`** read expansions: `client_detail`, `status_detail`,
    `assigned_to_detail` on leads; `operator_detail` on calls. No more `#42`.
  - **Server-side filters, search & ordering** on leads/clients/calls/field-defs
    (see the Filtering table) — search now covers all pages, not just the first 50.
- **Call audio** is now fetchable: `GET /api/calls/{id}/audio/` (company-scoped,
  authenticated) plus a `has_audio` flag on each call. See "Playing the call
  recording".

No breaking changes to request/response shapes — every addition is a new field or
query param; existing ids and payloads are untouched.
