# AIROP — Request: user management, role hierarchy, operator statistics

**From:** frontend. **Against:** `https://api.rob.cognilabs.org`, checked
2026-09-03 with `admin@gmail.com` and `operator@cognilabs.uz`.

Companion to `FRONTEND.md` (shapes), `ROLES.md` (current RBAC) and
`SEED_DATA.md` (test data). Everything below is either **blocked** by a missing
endpoint or **wrong** in a way I verified with curl — no guesses.

> **First, thank you for the scoring.** `overall_score` and `evaluation` are now
> populated (`"60.00"`, `{need_identified, next_step_clear, operator_politeness,
> comment}`) and the frontend already renders all of it: average score, the
> strong/attention/critical buckets, the per-criterion bars and the written
> comment. This document is about what sits *on top* of that.

---

## 1. What we want, in one paragraph

Three tiers instead of two. A **superadmin** who works across companies; an
**admin** who runs one company and is responsible for a set of **operators**;
operators who only ever see their own work. On top of that, a real
**operator-performance view**: for each operator, how every conversation scored,
their average across a period, and how it moves over time.

---

## 2. Role hierarchy

Today `ROLES.md` defines two roles per company, and a company-less superadmin
gets `403` on **every** endpoint — so a platform owner literally cannot read
`/api/users/`. We need:

| Role | Sees | Writes |
| --- | --- | --- |
| **superadmin** | every company, every user, all data | manage companies + users everywhere |
| **admin** | their own company | company data + the users in it |
| **operator** | own leads / own calls (unchanged) | own leads (unchanged) |

Concretely:

1. **Give superadmin API access.** Right now "no company" means 403 everywhere.
   A superadmin should instead bypass company scoping, and be able to filter:
   `GET /api/companies/`, `GET /api/users/?company=<id>`, `GET /api/leads/?company=<id>`.
2. **`company` on the user shape** (`{"id": 3, "name": "Demo LLC"}`), so the UI can
   group and label. Today `/api/users/me/` returns no company at all.
3. **Decide what "an admin's own operators" means.** Two options — please pick:
   - **(a) whole company** — every operator in the company belongs to that admin.
     Nothing new needed beyond the company field. *We assume this unless told
     otherwise.*
   - **(b) explicit ownership** — an operator is attached to one manager
     (`manager: 7` on the user), an admin sees only their own. Needed only if a
     company will have several admins splitting a team.

---

## 3. User management — currently impossible

Verified: `POST /api/users/` → **405**, `PATCH /api/users/13/` → **405**,
`Allow: GET, HEAD, OPTIONS`. So the app can list people and nothing else. The
Users page ships read-only for that reason.

Please add, scoped so an admin acts inside their company and a superadmin
anywhere:

```http
POST /api/users/
{ "username": "op3@airop.uz", "email": "op3@airop.uz", "first_name": "Aziz",
  "last_name": "Karimov", "role": "operator", "password": "<initial>" }
→ 201 { "id": 21, ... , "role": "operator" }
```

```http
PATCH /api/users/{id}/     { "role": "admin" }        // promote / demote
PATCH /api/users/{id}/     { "is_active": false }     // deactivate, keep history
DELETE /api/users/{id}/                               // only if you prefer hard delete
```

- **`is_active` on the user shape**, please — deactivating must not orphan the
  leads and calls already attached to that person.
- An admin must not be able to create a **superadmin**, nor edit users outside
  their company → `403`.
- A user must not be able to demote themselves out of their last admin seat →
  `400` with a clear `detail`.
- If you'd rather do invitations than passwords, `POST /api/users/invite/` with
  `{email, role}` works for us just as well — say which and we'll build to it.

---

## 4. Operator statistics — the main ask

The per-call score exists. What's missing is **aggregation**: nothing can answer
"how is Sardor doing this month" without pulling every analysis and computing it
in the browser, which breaks past the 50-row page.

### 4.1 The blocker: `?operator=` on calls is ignored

```
GET /api/calls/?operator=13  → count 4
GET /api/calls/?operator=1   → count 4      # same total, different user
```

Both return everything, so we cannot even count calls per operator honestly —
that's why the Users page shows no calls column today. Please make `operator` a
real filter on `/api/calls/`, and add the same to `/api/analyses/` (by the call's
operator) and `/api/transcripts/`.

### 4.2 Leaderboard: every operator, one period

```http
GET /api/stats/operators/?started_after=2026-08-01T00:00:00Z&started_before=2026-08-31T23:59:59Z
```
```json
{
  "period": { "from": "2026-08-01", "to": "2026-08-31" },
  "results": [
    {
      "operator": { "id": 13, "name": "Sardor Operator", "username": "operator@cognilabs.uz" },
      "calls": 42,
      "analyzed": 40,
      "overall_score": 68.4,                  // mean of the analyses in the period
      "score_trend": 4.2,                     // vs. the previous period of equal length
      "criteria": {                           // mean per evaluation key, same 0-5 scale
        "need_identified": 3.4,
        "operator_politeness": 4.1,
        "next_step_clear": 0.55                // booleans as a 0-1 rate
      },
      "talk_time_seconds": 15320,
      "avg_call_seconds": 365,
      "leads_created": 12,
      "conversion_rate": 0.29,                // leads_created / analyzed
      "score_distribution": { "strong": 8, "attention": 26, "critical": 6 }
    }
  ]
}
```

`strong / attention / critical` should use the same cuts the UI already draws:
**≥85 / 70–84 / <70**. If you prefer different bands, tell us and we'll follow
yours — but they must come from one place, not be duplicated in both codebases.

### 4.3 One operator, in detail — including per-client scores

This is the "each client talk score" part:

```http
GET /api/stats/operators/13/?started_after=…&started_before=…
```
```json
{
  "operator": { "id": 13, "name": "Sardor Operator" },
  "overall_score": 68.4,
  "criteria": { "need_identified": 3.4, "operator_politeness": 4.1, "next_step_clear": 0.55 },
  "timeline": [ { "date": "2026-08-01", "calls": 3, "score": 72.0 }, … ],
  "by_client": [
    {
      "client": { "id": 42, "name": "Usmon aka", "phone": "+998508508040" },
      "calls": 3,
      "overall_score": 66.7,
      "last_call_at": "2026-08-31T14:22:00Z",
      "worst_call": { "id": 37, "score": 60.0 }
    }
  ],
  "recent_calls": [
    { "id": 37, "started_at": "…", "duration_seconds": 89,
      "client": { "id": 42, "name": "Usmon aka" },
      "overall_score": 60.0, "summary": "…" }
  ]
}
```

- `timeline` is what the dashboard chart wants — **daily buckets computed
  server-side**. Today we bucket client-side over one page, which is wrong the
  moment a company passes 50 calls in the window.
- `by_client` is the table we want on the operator's page: which customers this
  operator handles worst.
- An **operator calling this for themselves must get a `200`** (their own stats);
  another operator's id → `403` or `404`, your call. Admin: anyone in the
  company. Superadmin: anyone.

### 4.4 Company overview (optional but wanted)

```http
GET /api/stats/overview/?started_after=…&started_before=…
→ { "calls": 128, "analyzed": 120, "leads": 44, "overall_score": 71.2,
    "timeline": [ { "date": "…", "calls": 12, "analyzed": 11, "score": 70.5 } ] }
```

Same reason: the dashboard KPIs and chart should read one aggregate, not count
rows from page one.

---

## 5. Two data gaps that make the stats meaningless

1. **`duration_seconds` is `0` on every call** — checked all four: `(37, 0), (36, 0),
   (35, 0), (34, 0)` — while the actual recordings are 60–120 s (the player reads
   the real length off the MP3). Talk-time and average-duration stats cannot be
   built until ingestion fills this.
2. **`direction` is `"unknown"` on every call**, so inbound/outbound cannot be
   split in any statistic.

---

## 6. Permissions for everything above

| Endpoint | superadmin | admin | operator |
| --- | --- | --- | --- |
| `GET /api/companies/` | ✅ all | own only | — |
| `GET /api/users/` | ✅ all (`?company=`) | own company | own company (read) |
| `POST /api/users/`, `PATCH /api/users/{id}/` | ✅ anywhere | own company, cannot create superadmin | `403` |
| `GET /api/stats/operators/` | ✅ any company | own company | `403` |
| `GET /api/stats/operators/{id}/` | ✅ | anyone in company | **self only** |
| `GET /api/stats/overview/` | ✅ | own company | own numbers only, or `403` |

Keep the existing convention: out-of-scope objects `404`, refused writes `403`
with a readable `detail` (the current
`"Bu amal uchun administrator huquqi kerak."` is exactly right).

---

## 7. Priority

1. **`?operator=` filter on calls/analyses** — small, unblocks per-user numbers today.
2. **`duration_seconds`** from ingestion — without it half the stats are zeros.
3. **`GET /api/stats/operators/`** (leaderboard) and **`/{id}/`** (detail + `by_client`).
4. **User write endpoints** (create, role change, deactivate) + `is_active`.
5. **Superadmin scope** + `company` on the user shape + `/api/companies/`.
6. `GET /api/stats/overview/` for the dashboard.

Ship them one at a time — each lands in the UI on its own, and we'll wire each
as it appears. Anything you'd rather shape differently, say so and we'll build to
your version; the shapes above are a proposal, not a demand.
