"use client";

import { usersApi, leadsApi } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useApiResource } from "@/hooks/use-api-resource";
import { useSessionStore } from "@/stores/session-store";
import type { ID, User } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/shell/page-header";

const NO_USERS: User[] = [];

/** Leads currently assigned to one user, counted by the API rather than by us. */
function AssignedLeads({ userId }: { userId: ID }) {
  const leads = useApiResource(leadsApi.list, [], { assigned_to: userId });
  if (leads.loading) return <span className="text-muted-foreground">…</span>;
  if (leads.error) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{leads.count}</span>;
}

export function UsersPage() {
  const t = useT();
  const users = useApiResource(usersApi.list, NO_USERS);
  const me = useSessionStore((state) => state.user);

  return (
    <>
      <PageHeader title={t("users.title")} description={t("users.description")} />
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
            columns={[
              {
                header: t("users.user"),
                cell: (row) => (
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {(row.name || row.username || "?").slice(0, 2)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{row.name || row.username}</span>
                      {String(row.id) === String(me?.id) ? <span className="text-xs text-muted-foreground">{t("users.you")}</span> : null}
                    </span>
                  </span>
                ),
              },
              { header: t("users.email"), cell: (row) => row.email || row.username || "—" },
              {
                header: t("users.role"),
                cell: (row) => (
                  <Badge tone={row.role === "operator" ? "neutral" : "ai"}>{t(row.role === "operator" ? "roles.operator" : "roles.admin")}</Badge>
                ),
              },
              { header: t("users.leads"), cell: (row) => <AssignedLeads userId={row.id} /> },
            ]}
          />
        )}
        {!users.loading && !users.error && users.data.length > 0 ? (
          <Pagination page={users.meta.page} count={users.count} pageSize={users.meta.pageSize} onPageChange={users.setPage} />
        ) : null}
      </Card>
      {/* /api/users/ is read-only (POST and PATCH both 405): roles come from Django admin. */}
      <p className="mt-3 text-xs text-muted-foreground">{t("users.managed")}</p>
    </>
  );
}
