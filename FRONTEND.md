# AIROP — Frontend Integration Guide

Everything a frontend developer needs to talk to the AIROP API. The backend is
a multi-tenant CRM: calls are ingested and analyzed by AI, and become Clients
and Leads. The frontend consumes the REST API below.

> **Interactive docs:** run the server and open **`/docs/`** (Swagger UI). The
> raw OpenAPI schema is at **`/api/schema/`**. These are always in sync with the
> code — treat them as the source of truth; this file is the orientation.

---

## 1. Base URL & environment

| Env | Base URL |
| --- | --- |
| Local dev | `http://localhost:8000` (or `http://192.168.1.12:8000`) |

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
| Calls | `/api/calls/` | **GET only** | Ingested by the backend. |
| Transcripts | `/api/transcripts/` | **GET only** | STT output. |
| Analyses | `/api/analyses/` | **GET only** | GPT output. |

Standard REST: `GET /api/leads/` (list), `GET /api/leads/{id}/` (detail),
`POST` (create), `PATCH /api/leads/{id}/` (update), `DELETE /api/leads/{id}/`.

### Pagination
List endpoints are paginated, **50 per page**:
```json
{ "count": 123, "next": "http://.../api/leads/?page=2", "previous": null, "results": [ ... ] }
```
Use `?page=N`.

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
  "id": 7, "client": 42, "status": 3, "title": "…",
  "custom_data": { "mahsulot": "xolodilnik" },
  "source_call": 15,               // read-only; set when created from a call, else null
  "assigned_to": null,
  "created_via": "call_ai",
  "created_at": "…", "updated_at": "…"
}
```
- `client` and `status` are IDs, restricted to your own company.
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
  "client_phone": "+998901234567", "operator": null, "external_operator_id": "",
  "started_at": "…", "duration_seconds": 62,
  "stage": "completed",            // pipeline state, see below
  "error": "", "created_at": "…"
}
```
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

- **Interactive API docs** added: **`/docs/`** (Swagger UI) and `/api/schema/`
  (OpenAPI JSON). Build against these.
- **CORS** enabled for the dev frontend origins listed in §1.
- **Transcript `text`** is now guaranteed clean flat text. (Previously a live
  provider quirk could return a raw JSON blob in this field — fixed backend-side,
  so you can safely render `transcript.text` directly.)

No breaking changes to request/response shapes.
