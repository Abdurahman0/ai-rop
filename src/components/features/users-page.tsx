"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError, leadsApi, statsApi, usersApi, type FieldErrors } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { useApiResource } from "@/hooks/use-api-resource";
import { useStats } from "@/hooks/use-stats";
import { useAuthStore } from "@/stores/auth-store";
import { useIsAdmin, useSessionStore } from "@/stores/session-store";
import { useUiStore } from "@/stores/ui-store";
import type { ID, OperatorStats, User } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { DistributionBar, ScoreMeter } from "@/components/ui/score-meter";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/shell/page-header";
import { TabChips } from "@/components/ui/tab-chips";

const NO_USERS: User[] = [];

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-2">{children}</div>
      {hint && !error ? <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-normal text-red-600">{error}</span> : null}
    </label>
  );
}

function Avatar({ user }: { user: { name?: string; username?: string } }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
      {(user.name || user.username || "?").slice(0, 2)}
    </span>
  );
}

/** Leads currently assigned to one user, counted by the API rather than by us. */
function AssignedLeads({ userId }: { userId: ID }) {
  const leads = useApiResource(leadsApi.list, [], { assigned_to: userId });
  if (leads.loading) return <span className="text-muted-foreground">…</span>;
  if (leads.error) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{leads.count}</span>;
}

export function UsersPage() {
  const router = useRouter();
  const t = useT();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "performance" ? "performance" : "team";
  const isAdmin = useIsAdmin();
  const me = useSessionStore((state) => state.user);
  const [createOpen, setCreateOpen] = useState(false);

  const users = useApiResource(usersApi.list, NO_USERS);

  return (
    <>
      <PageHeader
        title={t("users.title")}
        description={tab === "team" ? t("users.description") : t("users.performanceDescription")}
        actions={
          <>
            {!isAdmin && me ? (
              <Button icon={<ArrowRight className="h-4 w-4" />} onClick={() => router.push(`/users/${me.id}`)}>
                {t("users.myPerformance")}
              </Button>
            ) : null}
            {isAdmin && tab === "team" ? (
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                {t("users.addUser")}
              </Button>
            ) : null}
          </>
        }
      />

      <TabChips
        active={tab}
        onChange={(next) => router.replace(next === "performance" ? "/users?tab=performance" : "/users", { scroll: false })}
        tabs={[
          { key: "team", label: t("users.team"), count: users.count || undefined },
          ...(isAdmin ? [{ key: "performance", label: t("users.performance") }] : []),
        ]}
      />

      {tab === "performance" && isAdmin ? <PerformanceSection /> : <TeamSection users={users} createOpen={createOpen} onCreateOpenChange={setCreateOpen} canEdit={isAdmin} meId={me?.id} />}
    </>
  );
}

function TeamSection({
  users,
  createOpen,
  onCreateOpenChange,
  canEdit,
  meId,
}: {
  users: ReturnType<typeof useApiResource<User>>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  canEdit: boolean;
  meId?: ID;
}) {
  const router = useRouter();
  const t = useT();
  const { accessToken } = useAuthStore();
  const { toast } = useUiStore();
  const [editing, setEditing] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<User | null>(null);
  // More than one company in the list means a superadmin is looking.
  const companies = new Set(users.data.map((user) => user.company?.id).filter(Boolean));

  async function patch(user: User, body: Partial<User>, message: string) {
    try {
      await usersApi.patch(user.id, body, accessToken);
      toast({ title: message, tone: "success" });
      await users.reload();
    } catch (error) {
      toast({ title: error instanceof ApiError ? error.friendlyMessage : t("users.saveError"), tone: "danger" });
    }
  }

  return (
    <>
      <Card>
        {users.loading ? (
          <TableSkeleton />
        ) : users.error ? (
          <ErrorState title={t("users.loadError")} description={users.error} onRetry={users.reload} />
        ) : users.data.length === 0 ? (
          <EmptyState title={t("users.empty")} description={t("users.emptyDescription")} />
        ) : (
          <DataTable
            data={users.data}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/users/${row.id}`)}
            columns={[
              {
                header: t("users.user"),
                cell: (row) => (
                  <span className="flex items-center gap-3">
                    <Avatar user={row} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{row.name || row.username}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.email || row.username}
                        {String(row.id) === String(meId) ? ` · ${t("users.you")}` : ""}
                      </span>
                    </span>
                  </span>
                ),
              },
              ...(companies.size > 1 ? [{ header: t("users.company"), cell: (row: User) => row.company?.name ?? "—" }] : []),
              {
                header: t("users.role"),
                cell: (row) =>
                  canEdit && String(row.id) !== String(meId) ? (
                    <span onClick={(event) => event.stopPropagation()}>
                      <Select
                        label={t("users.role")}
                        hideLabel
                        value={String(row.role ?? "admin")}
                        onChange={(role) => void patch(row, { role }, t("users.updated"))}
                        options={[
                          { label: t("roles.admin"), value: "admin" },
                          { label: t("roles.operator"), value: "operator" },
                        ]}
                      />
                    </span>
                  ) : (
                    <Badge tone={row.role === "operator" ? "neutral" : "ai"}>{t(row.role === "operator" ? "roles.operator" : "roles.admin")}</Badge>
                  ),
              },
              {
                header: t("users.status"),
                cell: (row) =>
                  canEdit && String(row.id) !== String(meId) ? (
                    <span onClick={(event) => event.stopPropagation()} className="flex items-center gap-2">
                      <Switch
                        label={t("users.status")}
                        checked={row.is_active !== false}
                        onCheckedChange={(checked) => void patch(row, { is_active: checked }, t(checked ? "users.activated" : "users.deactivated"))}
                      />
                      <span className="text-xs text-muted-foreground">{t(row.is_active === false ? "users.inactive" : "users.active")}</span>
                    </span>
                  ) : (
                    <Badge tone={row.is_active === false ? "danger" : "success"}>{t(row.is_active === false ? "users.inactive" : "users.active")}</Badge>
                  ),
              },
              { header: t("users.leads"), cell: (row) => <AssignedLeads userId={row.id} /> },
              ...(canEdit
                ? [
                    {
                      header: t("common.actions"),
                      cell: (row: User) => (
                        <span className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                          <button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setEditing(row)} aria-label={t("users.editUser")}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-500/10"
                            disabled={String(row.id) === String(meId)}
                            onClick={() => setConfirm(row)}
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
        {!users.loading && !users.error && users.data.length > 0 ? (
          <Pagination page={users.meta.page} count={users.count} pageSize={users.meta.pageSize} onPageChange={users.setPage} />
        ) : null}
      </Card>

      <UserModal
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onSave={async (payload) => {
          await usersApi.create(payload, accessToken);
          toast({ title: t("users.created"), tone: "success" });
          await users.reload();
        }}
      />
      <UserModal
        open={!!editing}
        initial={editing ?? undefined}
        onOpenChange={(next) => !next && setEditing(null)}
        onSave={async (payload) => {
          if (!editing) return;
          await usersApi.patch(editing.id, payload, accessToken);
          toast({ title: t("users.updated"), tone: "success" });
          await users.reload();
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={() => setConfirm(null)}
        title={t("users.deleteTitle")}
        description={t("users.deleteDescription")}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (confirm) {
            try {
              await usersApi.delete(confirm.id, accessToken);
              toast({ title: t("users.updated"), tone: "success" });
              await users.reload();
            } catch (error) {
              toast({ title: error instanceof ApiError ? error.friendlyMessage : t("users.saveError"), tone: "danger" });
            }
          }
          setConfirm(null);
        }}
      />
    </>
  );
}

function UserModal({
  open,
  onOpenChange,
  onSave,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: Partial<User> & { password?: string }) => Promise<void>;
  initial?: User;
}) {
  const t = useT();
  const isEdit = !!initial;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("operator");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setUsername(initial?.username ?? "");
      setEmail(initial?.email ?? "");
      setFirstName(initial?.first_name ?? "");
      setLastName(initial?.last_name ?? "");
      setRole(String(initial?.role ?? "operator"));
      setPassword("");
      setErrors({});
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const payload: Partial<User> & { password?: string } = isEdit
      ? { email, first_name: firstName, last_name: lastName, role }
      : { username, email: email || username, first_name: firstName, last_name: lastName, role, password };
    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setError(err.friendlyMessage);
      } else {
        setError(err instanceof Error ? err.message : t("users.saveError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEdit ? t("users.editUser") : t("users.addUser")}>
      <form className="space-y-4 p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("users.firstName")} error={errors.first_name}>
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </Field>
          <Field label={t("users.lastName")} error={errors.last_name}>
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </Field>
        </div>
        <Field label={t("users.email")} error={errors.username ?? errors.email}>
          <Input
            required
            type="email"
            value={isEdit ? email : username}
            onChange={(event) => (isEdit ? setEmail(event.target.value) : setUsername(event.target.value))}
            placeholder="operator@company.uz"
          />
        </Field>
        <Field label={t("users.role")} error={errors.role}>
          <Select
            label={t("users.role")}
            value={role}
            onChange={setRole}
            options={[
              { label: t("roles.operator"), value: "operator" },
              { label: t("roles.admin"), value: "admin" },
            ]}
          />
        </Field>
        {!isEdit ? (
          <Field label={t("users.password")} error={errors.password} hint={t("users.passwordHint")}>
            <Input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
          </Field>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button variant="primary" type="submit" loading={saving}>{isEdit ? t("common.saveChanges") : t("users.addUser")}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PerformanceSection() {
  const router = useRouter();
  const t = useT();
  const { formatDuration } = useFormatters();
  const stats = useStats(statsApi.operators);
  const rows = stats.data?.results ?? [];

  if (stats.forbidden) return <EmptyState title={t("users.statsForbidden")} description={t("users.emptyDescription")} />;
  if (stats.loading) return <Card><TableSkeleton /></Card>;
  if (stats.error) return <ErrorState title={t("users.loadError")} description={stats.error} onRetry={stats.reload} />;
  if (rows.length === 0) return <EmptyState title={t("users.noStats")} description={t("users.emptyDescription")} />;

  return (
    <Card>
      <DataTable
        data={rows}
        rowKey={(row: OperatorStats) => String(row.operator.id)}
        onRowClick={(row) => router.push(`/users/${row.operator.id}`)}
        columns={[
          {
            header: t("users.user"),
            cell: (row) => (
              <span className="flex items-center gap-3">
                <Avatar user={row.operator} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{row.operator.name || row.operator.username}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.operator.username}</span>
                </span>
              </span>
            ),
          },
          {
            header: t("users.score"),
            cell: (row) => (
              <span className="flex items-center gap-2">
                <span className="w-24"><ScoreMeter score={row.overall_score} size="sm" /></span>
                {row.score_trend !== null && row.score_trend !== undefined ? (
                  <span className={`text-xs ${row.score_trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {row.score_trend >= 0 ? "+" : ""}
                    {row.score_trend.toFixed(1)}
                  </span>
                ) : null}
              </span>
            ),
          },
          { header: t("users.calls"), cell: (row) => <span className="tabular-nums">{row.calls}</span> },
          { header: t("users.talkTime"), cell: (row) => formatDuration(row.talk_time_seconds ?? null) },
          { header: t("users.leadsCreated"), cell: (row) => <span className="tabular-nums">{row.leads_created ?? 0}</span> },
          {
            header: t("users.conversion"),
            cell: (row) => (row.conversion_rate === undefined ? "—" : <span className="tabular-nums">{Math.round(row.conversion_rate * 100)}%</span>),
          },
          { header: t("users.distribution"), cell: (row) => <DistributionBar distribution={row.score_distribution} /> },
        ]}
      />
    </Card>
  );
}
