# AIROP — Roles & Permissions (for the frontend)

Simple 2-role RBAC. Every user in a company is either an **admin** or an
**operator**. This document is the full contract the frontend builds against.

> All rules below apply **inside one company** — tenant isolation still comes
> first (a user never sees another company's data, whatever their role).

---

## 1. The two roles

| Role | Who | In one sentence |
| --- | --- | --- |
| **admin** | managers / owners | Full access to everything in their company. |
| **operator** | salespeople | Only their **own** leads and the calls they **handled**; can't edit shared settings. |

- Every user has a `role` field: `"admin"` or `"operator"`.
- **Default is `admin`** — existing users and any new user without an explicit
  role are admins, so nothing breaks.
- Roles are assigned by a platform admin in Django admin (`/admin/`) — there is
  no role-change API endpoint (yet). A user's role does not change during a session.

### Read the current user's role
```http
GET /api/users/me/
```
```json
{ "id": 7, "username": "op1@airop.uz", "name": "Bobur Aliyev", "role": "operator",
  "first_name": "Bobur", "last_name": "Aliyev", "email": "op1@airop.uz" }
```
**Call this right after login and gate the whole UI on `role`.** `role` is also
present on every `/api/users/` row.

---

## 2. Capability matrix

**R** = read (GET list/detail) · **W** = create/update/delete · **—** = no access

| Resource | admin | operator |
| --- | --- | --- |
| `/api/leads/` | **R + W** — all company leads | **R + W**, but **only leads assigned to them** |
| `/api/calls/` | **R** — all company calls | **R** — only calls they handled (`operator = them`) |
| `/api/calls/{id}/audio/` | any company call | only their own calls' audio |
| `/api/transcripts/` | **R** — all | **R** — only their own calls' |
| `/api/analyses/` | **R** — all | **R** — only their own calls' |
| `/api/clients/` | **R + W** | **R only** (write → 403) |
| `/api/field-definitions/` | **R + W** | **R only** (write → 403) |
| `/api/lead-statuses/` | **R + W** | **R only** (write → 403) |
| `/api/users/` , `/api/users/me/` | **R** | **R** |

Everything not listed as writable for operator returns **`403`** on a write and
is simply **absent from their lists** on a read.

---

## 3. What an operator can do (in detail)

**Leads — their own only.**
- `GET /api/leads/` returns only leads where `assigned_to` is the operator. Other
  operators' leads are **not in the list** and their detail is **`404`**.
- `POST /api/leads/` works, but `assigned_to` is **forced to the operator** —
  whatever you send is ignored; the new lead belongs to them.
- `PATCH` / `DELETE` work only on their own leads (others → `404`). They **cannot
  reassign** a lead to someone else (`assigned_to` stays themselves).
- All the lead filters/search still work, scoped to their own set.

**Calls, transcripts, analyses, audio — only what they handled.**
- `GET /api/calls/` returns only calls whose `operator` is them. Same scoping on
  `/api/transcripts/`, `/api/analyses/`, and `/api/calls/{id}/audio/` — a call
  they didn't handle is `404` everywhere, audio included.

**Shared config — read-only.**
- They can **read** clients, field-definitions and lead-statuses (needed to
  render lead forms and the board), but any create/update/delete returns
  **`403`** with `{"detail": "Bu amal uchun administrator huquqi kerak."}`.

**An admin can do all of the above with no scoping** — sees every lead, every
call, every client, and can edit the templates, statuses and clients.

---

## 4. Error shapes to handle

| Status | When | Body |
| --- | --- | --- |
| `403` | operator attempts a write on clients / field-definitions / lead-statuses | `{ "detail": "Bu amal uchun administrator huquqi kerak." }` |
| `404` | operator opens a lead/call/transcript/analysis/audio that isn't theirs | `{ "detail": "Not found." }` |

`404` (not `403`) for out-of-scope objects is intentional — an operator must not
even learn that another operator's lead id exists.

---

## 5. Frontend checklist

- After login, `GET /api/users/me/`; store `role`.
- **operator UI**: hide the settings/custom-fields and statuses editors (show
  read-only), hide client create/edit, hide the "assign to" picker on leads
  (their leads are always theirs), and label the leads/calls views as "mine".
- **admin UI**: full app, including the settings screens and the assignee picker.
- Don't rely on hiding alone — the API enforces all of this, so a `403`/`404`
  from a stray call is expected; handle it quietly.
- The assignee/operator names come from the `*_detail` objects and `/api/users/`
  (see `FRONTEND.md`).

---

## 6. Notes / current limits

- Two roles only, per company. No finer-grained permissions yet.
- Operators read **all** of the company's clients (a shared address book), but
  only their own leads/calls. If you need clients scoped per operator too, that's
  a small follow-up — ask.
- Role assignment is via Django `/admin/` for now (no self-serve role API).
