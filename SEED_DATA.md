# AIROP — Seed Data Request for the Backend

**Audience:** backend dev. **Goal:** put enough data behind one demo company that
every screen in the frontend can be exercised for real.

This is not a wishlist — each item below is tied to a specific UI element that is
currently blank, flat, or unverifiable without it. The frontend is already wired
to `FRONTEND.md` (JWT + rotation, tenancy, pagination at 50, dynamic
`custom_data`, the 8-stage pipeline). What it lacks is data with enough shape.

---

## 0. TL;DR — minimum viable seed

| Endpoint | Rows | Must include |
| --- | --- | --- |
| `/api/field-definitions/` | **8** | both `entity_type`s · all 4 `field_type`s · 1 required · 1 `is_system` · 1 soft-deleted |
| `/api/lead-statuses/` | **4** | exactly 1 `is_default` · 1 `is_final` · distinct `color` · `order` 1..4 |
| `/api/clients/` | **8** | 1 without `name` · 1 with empty `custom_data` · 1 with every custom key filled |
| `/api/leads/` | **14** | spread across all statuses · mix of `created_via` · some `assigned_to` · some `source_call` |
| `/api/calls/` | **12** | **all 8 `stage` values** · all 3 directions · `failed` with a real `error` · spread over the last 7 days |
| `/api/transcripts/` | **6** | 1 with `segments: []` · 1 with 30+ segments · 1 with 3–4 speaker labels |
| `/api/analyses/` | **10** | `lead_created` both ways · **all 4 `skip_reason` codes** · rich `extracted_fields` |

Plus **one resource with 60+ rows** (leads is easiest) so pagination is real, and
**a second company** so tenant isolation is provable.

---

## 1. Accounts to create

| User | Company | Proves |
| --- | --- | --- |
| `demo@airop.uz` / known password | Demo LLC | the happy path |
| `demo2@airop.uz` | Second LLC | tenancy — its data must be invisible to user 1 |
| `orphan@airop.uz` | **no company** | the documented `403` + its Uzbek `detail` string |

The frontend renders the backend's own `403` sentence on the login screen, so
`"Foydalanuvchi hech qanday kompaniyaga biriktirilmagan."` is what the user sees.
Please keep that message intact.

Also useful: a way to get an **already-expired access token** (or a short-lived
one) on demand. The refresh-and-replay path is implemented and tested, and a
short TTL in staging is the cheapest way to keep it honest.

---

## 2. `/api/field-definitions/` — drives every lead & client form

Forms are generated from this endpoint. Nothing about custom fields is hardcoded
in the frontend, so **this table is the schema for two of the app's four forms**.

Seed 8 definitions:

| entity_type | key | field_type | is_required | is_active | is_system | order |
| --- | --- | --- | --- | --- | --- | --- |
| lead | `mahsulot` | text | ✅ | ✅ | ✅ | 1 |
| lead | `byudjet` | number | — | ✅ | — | 2 |
| lead | `muddat` | date | — | ✅ | — | 3 |
| lead | `izoh` | text | — | ✅ | — | 4 |
| lead | `eski_maydon` | text | — | **false** | — | 9 |
| client | `kompaniya` | text | — | ✅ | — | 1 |
| client | `qoshimcha_tel` | phone | — | ✅ | — | 2 |
| client | `manzil` | text | — | ✅ | — | 3 |

What each one proves:

- **All four `field_type`s** — the form picks the input from the type: `number`
  → numeric input, `date` → a date picker sending `YYYY-MM-DD`, `phone` → tel.
  Without a `date` and a `number` definition, two of four branches are untested.
- **`is_required: true`** — the form blocks submit with a per-field message.
- **`is_active: false`** — must be hidden in the form but its stored values kept
  (see §5). This is the soft-delete behaviour from `FRONTEND.md` §4.
- **`is_system: true`** — rendered with a "System" tag; label/order/required stay
  editable, `key`/`entity_type`/`field_type` are locked in the edit form.
- **Non-contiguous `order`** (the 9) — proves sorting is by `order`, not by id.

> Please confirm: is `is_active` PATCH-able, or is `DELETE` (soft) the only way
> to deactivate? The guide lists only `label`, `is_required`, `ai_hint`, `order`
> as patchable, so the UI currently offers **delete = deactivate** and shows
> `is_active` read-only. Happy to add a toggle if PATCH accepts it.

Keys marked with a ★ get a friendly label and an icon in the AI panels:
`izoh`, `manzil`, `muddat`, `byudjet`/`budget`, `mahsulot`/`product`. Reusing
these key names in the seed makes the "Extracted Data" card look right.

---

## 3. `/api/lead-statuses/` — kanban columns

Seed 4, e.g. `Yangi` (default) → `Aloqada` → `Taklif yuborildi` → `Yopildi`
(final).

- **Exactly one `is_default: true`** — analyses fail with `no_default_status`
  without it, and new leads need a landing column.
- **`color` set on each, visibly different** — status badges are tinted from
  this hex; identical colors make the board unreadable.
- **`order` 1..4** — column order comes from here.
- **`is_final: true` on the last one** — currently only displayed; tell us if it
  should also lock editing, and we will wire that.

The board supports **drag-and-drop between columns**, which issues
`PATCH /api/leads/{id}/ {"status": <id>}`. Please make sure that PATCH is allowed
for the demo user and that moving into an `is_final` column is not rejected
silently.

---

## 4. `/api/clients/` — 8 rows

```json
{
  "phone": "+998901234567",
  "name": "Ali Karimov",
  "custom_data": { "kompaniya": "UzTrade", "manzil": "Toshkent, Chilonzor", "qoshimcha_tel": "+998935550101" },
  "created_via": "call_ai"
}
```

Include, across the 8:

- **1 with `name: ""` or null** — the UI must fall back to the phone. Very common
  for AI-created clients, so it needs to look intentional.
- **1 with `custom_data: {}`** — proves the empty state, not a crash.
- **1 with every client key filled** — makes the detail page's "Custom data"
  block worth looking at.
- **A mix of `created_via`** — `call_ai` vs `manual` are shown as different
  badges; if everything is `call_ai` the distinction is untested.
- **At least 4 clients that own leads**, so the leads table shows real names.

**Please also confirm the duplicate-phone response shape.** The UI puts field
errors under the matching input, and expects:

```json
{ "phone": ["Bu telefon raqamli mijoz allaqachon mavjud."] }
```

A bare `{"detail": "..."}` also renders, but as a form-level error rather than
on the phone field.

---

## 5. `/api/leads/` — 14 rows (+ a bulk batch)

```json
{
  "client": 42,
  "status": 3,
  "title": "Xolodilnik so'radi",
  "custom_data": { "mahsulot": "xolodilnik", "byudjet": 4500000, "muddat": "2026-09-30", "izoh": "narx so'radi" },
  "source_call": 15,
  "assigned_to": 7,
  "created_via": "call_ai"
}
```

Spread the 14 so that:

- **Every status has at least 2 leads** — an empty kanban column is fine to see
  once, but all-in-one-column proves nothing.
- **At least 4 have `source_call` set** — the detail page links back to the call;
  a null `source_call` is the manual-entry path.
- **At least 3 have `assigned_to` set** (see the open question in §9 — today we
  can only render `User #7`).
- **One lead carries a value under the deactivated key** (`eski_maydon`) plus a
  key that has no definition at all. The frontend preserves both on edit and does
  not send them back as new values; that behaviour is only observable if such a
  lead exists.
- **One with `custom_data: {}`** and one with only the required key filled.
- **Titles in Uzbek/Russian with apostrophes** (`so'radi`) — encoding check.

**Then bulk-create ~60 more leads** (any shape) so `count` exceeds one page.
Pagination is fixed at 50 and the UI's page counter is derived from `count`; with
14 rows the Next button can never be tested.

---

## 6. `/api/calls/` — 12 rows, this is the most under-covered screen

```json
{
  "provider": "onlinepbx",
  "external_id": "abc-123",
  "direction": "inbound",
  "client_phone": "+998901234567",
  "operator": 7,
  "external_operator_id": "104",
  "started_at": "2026-09-01T14:22:00Z",
  "duration_seconds": 412,
  "stage": "completed",
  "error": ""
}
```

Required coverage:

- **One call per `stage`** — all eight: `received`, `audio_stored`,
  `transcribing`, `transcribed`, `analyzing`, `analyzed`, `completed`, `failed`.
  Each renders a differently-toned badge and the in-progress ones are how an
  operator knows the pipeline is alive. Right now only 2–3 stages ever appear.
- **`failed` with a real `error` string** (e.g. `"STT provider timed out"`) —
  shown on the detail page and as the badge tooltip. An empty `error` on a failed
  call leaves a dead end in the UI.
- **All three `direction` values, including `unknown`.**
- **`started_at` spread across the last 7 days, including today.** The dashboard
  chart buckets calls by day over a rolling 7-day window — if every call shares
  one timestamp the chart is a flat line. Please make the seed dates *relative to
  now*, not fixed, so the demo does not age out.
- **Duration variety**: one `0` (unanswered), a few ~60s, one 20+ minutes.
- **`operator` populated on most**, null on one or two.

---

## 7. `/api/transcripts/` — 6 rows

```json
{
  "call": 15,
  "text": "Alo. Assalomu alaykum. Xolodilnik narxi qancha?",
  "segments": [ { "id": 0, "speaker": "SPEAKER_00", "start": 6.1, "end": 6.4, "text": "Alo." } ],
  "provider": "aisha"
}
```

- **1 with `segments: []` but a full `text`** — the UI falls back to flat text.
- **1 with 30+ segments** — the transcript panel is a scrolling conversation
  view; with 2 segments it looks broken. This is the single best item for
  showing the product off.
- **1 with 3–4 distinct speaker labels on a 2-person call** — the known
  diarization quirk from `FRONTEND.md` §5. The UI deliberately renders these as
  neutral "Speaker 1/2/3" instead of guessing roles, and we would like to confirm
  that against real output.
- **`start`/`end` in seconds on every segment** — segment timestamps are shown.
- Confirm that `text` is now always flat text after the §7 fix — the frontend
  renders it directly with no JSON-blob guard.

---

## 8. `/api/analyses/` — 10 rows

```json
{
  "call": 15,
  "summary": "Mijoz xolodilnik narxini so'radi, byudjeti 4.5 mln so'm.",
  "overall_score": null,
  "evaluation": {},
  "extracted_fields": { "has_lead_intent": true, "client_name": "Ali", "mahsulot": "xolodilnik", "byudjet": 4500000, "izoh": "narx so'radi" },
  "lead_created": true,
  "skip_reason": "",
  "model_name": "gpt-4o-mini"
}
```

- **All four `skip_reason` codes**, one row each: `no_client_phone`,
  `no_lead_intent`, `insufficient_data: mahsulot, byudjet`, `no_default_status`.
  The UI translates the code and appends the detail after the colon, so please
  keep the `code: detail` format for `insufficient_data`.
- **`lead_created: true` on ~half**, and each of those should point at a lead
  that actually exists.
- **Rich `extracted_fields`** using the ★ keys from §2 plus `has_lead_intent`
  (bool) and `client_name` (sometimes null). Booleans, numbers, nulls and nested
  objects all render differently — variety here is what makes the "Extracted
  Data" card look like a product.
- **`model_name` populated** — shown on the review row and the call detail.

### When scoring ships

`overall_score` and `evaluation` are documented as *not built yet*, and the UI
handles that honestly today: unscored reviews are excluded from the score
buckets and the dashboard says so, rather than counting them as zero.

Once scoring exists, the seed needs scores **spread across the three bands** the
UI uses — `< 70` critical, `70–84` needs attention, `≥ 85` strong — otherwise the
performance card and the score filter cannot be verified.

For `evaluation`, these keys already render as scored progress bars out of 5:
`need_identified`, `operator_politeness`; `next_step_clear` renders as a labelled
yes/no. Other keys still display, just generically — tell us the final key set
and we will label them properly in all three languages.

---

## 9. Open questions — these block UI we cannot build

1. **Operator names.** `call.operator` and `lead.assigned_to` are user IDs, and
   there is no users endpoint in the guide. Every screen therefore shows
   "Unassigned" or `User #7`. Could we get either a nested
   `{"id": 7, "name": "Bobur"}` on read, or a `GET /api/users/` scoped to the
   company? This is the most visible gap in the app right now.
2. **Nested reads.** `lead.client` and `lead.status` come back as bare IDs. The
   frontend resolves them against the lists it already loaded, which works but
   **only within the first page of 50**. Past that, a lead whose client sits on
   page 2 shows `#42`. A nested read serializer (or a `?client=` filter) removes
   the problem.
3. **Filtering and search.** The guide documents only `?page=`. Search, the
   direction/stage filters, the status filter and the score filter are all
   client-side over the current page — so on a 60-lead company they silently only
   search 50 rows. Which of these can become query params:
   `?search=`, `?stage=`, `?direction=`, `?status=`, `?call=`, `?started_after=`?
4. **Calls ↔ clients.** Calls carry `client_phone` but no client FK, so the
   client page matches related calls by exact normalized phone. Is that safe, or
   should we not show that section?
5. **Ordering.** Is list order stable (`-created_at`)? "Recent calls" and
   "Recently created leads" assume newest-first from the API.

---

## 10. How to verify once seeded

Point the frontend at the backend and walk these:

```bash
# .env.local — origin only, any path is ignored
AI_ROP_BACKEND_URL=http://192.168.1.12:8000
NEXT_PUBLIC_API_URL=/backend-api
```

| Screen | What good seed data looks like |
| --- | --- |
| `/dashboard` | 4 KPIs non-zero · chart varies day to day · pipeline columns all populated |
| `/calls` | all 8 stage badges visible · a Failed row with a tooltip reason |
| `/calls/{id}` | summary + extracted fields + a long transcript + lead result |
| `/transcripts/{id}` | a scrolling multi-speaker conversation |
| `/ai-reviews` | both lead-created states · a humanized skip reason with detail |
| `/leads` | client and status names (not `#42`) · kanban drag persists |
| `/clients/{id}` | related leads and related calls both non-empty |
| `/settings/custom-fields` | System tag · one Inactive row · all four types |
| — | pagination: page 2 reachable on leads |
| — | log in as the second company: none of the above data is visible |
| — | log in as the company-less user: the Uzbek 403 message appears |

