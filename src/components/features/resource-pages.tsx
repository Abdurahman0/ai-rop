"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError, clientsApi, fieldDefinitionsApi, leadsApi, leadStatusesApi, type FieldErrors } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { demoClients, demoFields, demoLeads, demoStatuses } from "@/lib/data/demo";
import { displayPerson, objectId, titleCase } from "@/lib/utils/format";
import { useApiItem } from "@/hooks/use-api-item";
import { useApiResource } from "@/hooks/use-api-resource";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import type { Client, FieldDefinition, ID, Lead, LeadStatus } from "@/types/domain";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SearchInput, Textarea } from "@/components/ui/input";
import {
  buildCustomData,
  CustomFieldInputs,
  initialCustomValues,
  useCustomFields,
  validateCustomValues,
  type CustomValues,
} from "@/components/ui/custom-fields";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { StructuredDataValue } from "@/components/ui/structured-ai-data";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/shell/page-header";

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

export function LeadsPage() {
  const router = useRouter();
  const t = useT();
  const { formatDate } = useFormatters();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [confirm, setConfirm] = useState<Lead | null>(null);
  const leads = useApiResource(leadsApi.list, demoLeads);
  const statuses = useApiResource(leadStatusesApi.list, demoStatuses);
  const clients = useApiResource(clientsApi.list, demoClients);
  const { accessToken } = useAuthStore();
  const { toast } = useUiStore();
  const filtered = useMemo(() => leads.data.filter((lead) => `${lead.title ?? ""} ${lead.assigned_to ?? ""}`.toLowerCase().includes(search.toLowerCase()) && (!statusFilter || String(objectId(lead.status)) === statusFilter)), [leads.data, search, statusFilter]);

  return (
    <>
      <PageHeader title={t("resources.leadsTitle")} description={t("resources.leadsDescription")} actions={<><Button onClick={() => setView(view === "table" ? "kanban" : "table")}>{view === "table" ? t("resources.kanbanView") : t("resources.tableView")}</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t("resources.createLead")}</Button></>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4"><SearchInput value={search} onChange={(event) => setSearch(event.target.value)} /><Select label={t("resources.status")} value={statusFilter} onChange={setStatusFilter} options={[{ label: t("common.all"), value: "" }, ...statuses.data.map((s) => ({ label: s.name ?? String(s.id), value: String(s.id) }))]} />{view === "kanban" ? <span className="text-xs text-muted-foreground">{t("resources.dragHint")}</span> : null}</div>
        {leads.loading ? <TableSkeleton /> : leads.error ? <ErrorState title={t("resources.loadLeadsError")} onRetry={leads.reload} /> : filtered.length === 0 ? <EmptyState title={t("resources.emptyLeadsTitle")} description={t("resources.emptyLeadsDescription")} /> : view === "table" ? (
          <DataTable
            data={filtered}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/leads/${row.id}`)}
            columns={[
              { header: t("resources.title"), cell: (row) => row.title ?? t("resources.untitledLead") },
              { header: t("resources.client"), cell: (row) => typeof row.client === "object" ? row.client.name ?? row.client.phone : `#${row.client}` },
              { header: t("resources.status"), cell: (row) => <StatusBadge value={typeof row.status === "object" ? row.status.name : `#${row.status}`} color={typeof row.status === "object" ? row.status.color : undefined} /> },
              { header: t("resources.assigned"), cell: (row) => displayPerson(row.assigned_to) },
              { header: t("resources.createdVia"), cell: (row) => row.created_via?.toLowerCase().includes("ai") ? <Badge tone="ai">{t("common.aiCreated")}</Badge> : row.created_via ?? t("common.manual") },
              { header: t("resources.created"), cell: (row) => formatDate(row.created_at) },
              { header: t("common.actions"), cell: (row) => <div className="flex items-center gap-1"><button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={(event) => { event.stopPropagation(); setEditing(row); }} aria-label={t("resources.editLead")}><Pencil className="h-4 w-4" /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={(event) => { event.stopPropagation(); setConfirm(row); }} aria-label={t("resources.deleteLead")}><Trash2 className="h-4 w-4" /></button></div> },
            ]}
          />
        ) : (
          <CardContent>
            <LeadKanban
              leads={filtered}
              statuses={statuses.data}
              onOpen={(id) => router.push(`/leads/${id}`)}
              onMove={async (lead, status) => {
                try {
                  await leadsApi.patch(lead.id, { status: Number(status.id) }, accessToken);
                  toast({ title: t("resources.leadMoved", { status: status.name ?? String(status.id) }), tone: "success" });
                  await leads.reload();
                } catch (err) {
                  toast({ title: err instanceof ApiError ? err.friendlyMessage : t("resources.moveLeadError"), tone: "danger" });
                }
              }}
            />
          </CardContent>
        )}
        {!leads.loading && !leads.error && filtered.length > 0 ? <Pagination page={leads.meta.page} count={leads.count} pageSize={leads.meta.pageSize} onPageChange={leads.setPage} /> : null}
      </Card>
      <LeadModal open={open} clients={clients.data} statuses={statuses.data} onOpenChange={setOpen} onSave={async (payload) => { await leadsApi.create(payload, accessToken); toast({ title: t("resources.leadCreated"), tone: "success" }); await leads.reload(); }} />
      <LeadModal open={!!editing} clients={clients.data} statuses={statuses.data} initial={editing ?? undefined} onOpenChange={(next) => !next && setEditing(null)} onSave={async (payload) => { if (!editing) return; await leadsApi.patch(editing.id, payload, accessToken); toast({ title: t("resources.leadUpdated"), tone: "success" }); await leads.reload(); setEditing(null); }} />
      <ConfirmDialog open={!!confirm} onOpenChange={() => setConfirm(null)} title={t("resources.deleteLeadTitle")} description={t("resources.deleteLeadDescription")} confirmLabel={t("resources.deleteLead")} onConfirm={async () => { if (confirm) { await leadsApi.delete(confirm.id, accessToken); toast({ title: t("resources.leadDeleted"), tone: "success" }); await leads.reload(); } setConfirm(null); }} />
    </>
  );
}

/** Kanban board over the company's lead statuses. Dropping a card PATCHes it. */
function LeadKanban({ leads, statuses, onOpen, onMove }: { leads: Lead[]; statuses: LeadStatus[]; onOpen: (id: ID) => void; onMove: (lead: Lead, status: LeadStatus) => Promise<void> }) {
  const t = useT();
  const { formatDate } = useFormatters();
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  async function drop(status: LeadStatus) {
    setOver(null);
    const lead = dragging;
    setDragging(null);
    if (!lead || String(objectId(lead.status)) === String(status.id)) return;
    setMoving(String(lead.id));
    try {
      await onMove(lead, status);
    } finally {
      setMoving(null);
    }
  }

  if (statuses.length === 0) return <EmptyState title={t("resources.emptyStatusesTitle")} description={t("resources.emptyStatusesDescription")} />;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {statuses.map((status) => {
        const column = leads.filter((lead) => String(objectId(lead.status)) === String(status.id));
        return (
          <div
            key={status.id}
            onDragOver={(event) => {
              event.preventDefault();
              setOver(String(status.id));
            }}
            onDragLeave={() => setOver((current) => (current === String(status.id) ? null : current))}
            onDrop={() => void drop(status)}
            className={`rounded-lg border p-3 transition duration-[var(--motion-fast)] ${over === String(status.id) ? "border-primary bg-primary/5" : "border-border bg-background/60"}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <StatusBadge value={status.name} color={status.color} />
              <span className="text-xs text-muted-foreground">{column.length}</span>
            </div>
            <div className="space-y-2">
              {column.map((lead) => (
                <div
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={() => setDragging(lead)}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => onOpen(lead.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(lead.id);
                    }
                  }}
                  className={`w-full cursor-grab rounded-md border border-border bg-card p-3 text-left text-sm transition duration-[var(--motion-fast)] hover:bg-muted active:cursor-grabbing ${moving === String(lead.id) ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{lead.title ?? t("resources.untitledLead")}</p>
                    {lead.created_via?.toLowerCase().includes("ai") ? <Badge tone="ai">AI</Badge> : null}
                  </div>
                  <p className="mt-1 text-muted-foreground">{typeof lead.client === "object" ? lead.client.name ?? lead.client.phone : `#${lead.client}`}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{displayPerson(lead.assigned_to)} · {formatDate(lead.created_at)}</p>
                </div>
              ))}
              {column.length === 0 ? <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">{t("resources.dropHere")}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadModal({ open, onOpenChange, onSave, initial, clients, statuses }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: Partial<Lead>) => Promise<void>; initial?: Lead; clients: Client[]; statuses: LeadStatus[] }) {
  const t = useT();
  const { fields, loading: fieldsLoading } = useCustomFields("lead");
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [values, setValues] = useState<CustomValues>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setTitle(initial?.title ?? "");
      setClientId(objectId(initial?.client)?.toString() ?? "");
      setStatusId(objectId(initial?.status)?.toString() ?? "");
      setAssignedTo(initial?.assigned_to === null || initial?.assigned_to === undefined ? "" : String(initial.assigned_to));
      setValues(initialCustomValues(fields, initial?.custom_data));
      setErrors({});
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [fields, initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    // Everything is validated in one pass so the form reports every problem at once.
    const validation = validateCustomValues(fields, values, t);
    const assigned = assignedTo.trim() === "" ? null : Number(assignedTo);
    if (assigned !== null && !Number.isFinite(assigned)) validation.assigned_to = t("resources.assignedNumericError");
    if (!clientId) validation.client = t("fields.requiredError");
    if (!statusId) validation.status = t("fields.requiredError");
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setError(!clientId || !statusId ? t("resources.clientStatusRequired") : null);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title,
        client: Number(clientId),
        status: Number(statusId),
        assigned_to: assigned,
        custom_data: buildCustomData(fields, values, initial?.custom_data),
      });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setError(err.friendlyMessage);
      } else {
        setError(err instanceof Error ? err.message : t("resources.saveLeadError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? t("resources.editLead") : t("resources.createLead")} description={t("resources.modalLeadDescription")}>
      <form className="space-y-4 p-5" onSubmit={submit}>
        <Field label={t("resources.title")} error={errors.title}><Input required value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("resources.client")} error={errors.client}><Select label={t("resources.client")} value={clientId} onChange={setClientId} options={[{ label: t("common.select"), value: "" }, ...clients.map((client) => ({ label: client.name ?? client.phone ?? `#${client.id}`, value: String(client.id) }))]} /></Field>
          <Field label={t("resources.status")} error={errors.status}><Select label={t("resources.status")} value={statusId} onChange={setStatusId} options={[{ label: t("common.select"), value: "" }, ...statuses.map((status) => ({ label: status.name ?? status.code ?? `#${status.id}`, value: String(status.id) }))]} /></Field>
        </div>
        <Field label={t("resources.assignedOperatorId")} error={errors.assigned_to}><Input inputMode="numeric" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} /></Field>
        <div>
          <p className="text-sm font-medium">{t("fields.customFields")}</p>
          <p className="mb-3 text-xs text-muted-foreground">{t("fields.customFieldsHint")}</p>
          <CustomFieldInputs fields={fields} values={values} errors={errors} loading={fieldsLoading} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button variant="primary" type="submit" loading={saving}>{initial ? t("common.saveChanges") : t("resources.createLead")}</Button></div>
      </form>
    </Modal>
  );
}

export function ClientsPage() {
  const router = useRouter();
  const t = useT();
  const { formatDate } = useFormatters();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirm, setConfirm] = useState<Client | null>(null);
  const clients = useApiResource(clientsApi.list, demoClients);
  const { accessToken } = useAuthStore();
  const { toast } = useUiStore();
  const filtered = clients.data.filter((client) => `${client.name ?? ""} ${client.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader title={t("resources.clientsTitle")} description={t("resources.clientsDescription")} actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t("resources.createClient")}</Button>} />
      <Card>
        <div className="border-b border-border p-4"><SearchInput value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        {clients.loading ? <TableSkeleton /> : clients.error ? <ErrorState title={t("resources.loadClientsError")} onRetry={clients.reload} /> : filtered.length === 0 ? <EmptyState title={t("resources.emptyClientsTitle")} description={t("resources.emptyClientsDescription")} /> : (
          <DataTable
            data={filtered}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/clients/${row.id}`)}
            columns={[
              { header: t("resources.name"), cell: (row) => row.name ?? t("resources.unnamed") },
              { header: t("resources.phone"), cell: (row) => row.phone ?? t("resources.noPhone") },
              { header: t("resources.createdVia"), cell: (row) => row.created_via ?? t("common.manual") },
              { header: t("resources.createdAt"), cell: (row) => formatDate(row.created_at) },
              { header: t("resources.updatedAt"), cell: (row) => formatDate(row.updated_at) },
              { header: t("common.actions"), cell: (row) => <div className="flex items-center gap-1"><button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={(event) => { event.stopPropagation(); setEditing(row); }} aria-label={t("resources.editClient")}><Pencil className="h-4 w-4" /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={(event) => { event.stopPropagation(); setConfirm(row); }} aria-label={t("resources.deleteClient")}><Trash2 className="h-4 w-4" /></button></div> },
            ]}
          />
        )}
        {!clients.loading && !clients.error && filtered.length > 0 ? <Pagination page={clients.meta.page} count={clients.count} pageSize={clients.meta.pageSize} onPageChange={clients.setPage} /> : null}
      </Card>
      <ClientModal open={open} onOpenChange={setOpen} onSave={async (payload) => { await clientsApi.create(payload, accessToken); toast({ title: t("resources.clientCreated"), tone: "success" }); await clients.reload(); }} />
      <ClientModal open={!!editing} initial={editing ?? undefined} onOpenChange={(next) => !next && setEditing(null)} onSave={async (payload) => { if (!editing) return; await clientsApi.patch(editing.id, payload, accessToken); toast({ title: t("resources.clientUpdated"), tone: "success" }); await clients.reload(); setEditing(null); }} />
      <ConfirmDialog open={!!confirm} onOpenChange={() => setConfirm(null)} title={t("resources.deleteClientTitle")} description={t("resources.deleteLeadDescription")} confirmLabel={t("resources.deleteClient")} onConfirm={async () => { if (confirm) { await clientsApi.delete(confirm.id, accessToken); toast({ title: t("resources.clientDeleted"), tone: "success" }); await clients.reload(); } setConfirm(null); }} />
    </>
  );
}

function ClientModal({ open, onOpenChange, onSave, initial }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: Partial<Client>) => Promise<void>; initial?: Client }) {
  const t = useT();
  const { fields, loading: fieldsLoading } = useCustomFields("client");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [values, setValues] = useState<CustomValues>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setName(initial?.name ?? "");
      setPhone(initial?.phone ?? "");
      setValues(initialCustomValues(fields, initial?.custom_data));
      setErrors({});
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [fields, initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validation = validateCustomValues(fields, values, t);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSave({ name, phone, custom_data: buildCustomData(fields, values, initial?.custom_data) });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setError(err.friendlyMessage);
      } else {
        setError(err instanceof Error ? err.message : t("resources.saveClientError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? t("resources.editClient") : t("resources.createClient")}>
      <form className="space-y-4 p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("resources.name")} error={errors.name}><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label={t("resources.phone")} error={errors.phone} hint={t("resources.phoneHint")}><Input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
        </div>
        <div>
          <p className="text-sm font-medium">{t("fields.customFields")}</p>
          <p className="mb-3 text-xs text-muted-foreground">{t("fields.customFieldsHint")}</p>
          <CustomFieldInputs fields={fields} values={values} errors={errors} loading={fieldsLoading} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button variant="primary" type="submit" loading={saving}>{initial ? t("common.saveChanges") : t("resources.createClient")}</Button></div>
      </form>
    </Modal>
  );
}

export function StatusSettingsPage() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeadStatus | null>(null);
  const [confirm, setConfirm] = useState<LeadStatus | null>(null);
  const statuses = useApiResource(leadStatusesApi.list, demoStatuses);
  const { accessToken } = useAuthStore();
  const { toast } = useUiStore();
  return (
    <>
      <PageHeader title={t("resources.statusesTitle")} description={t("resources.statusesDescription")} actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t("resources.createStatus")}</Button>} />
      <Card>
        {statuses.loading ? <TableSkeleton /> : statuses.error ? <ErrorState title={t("resources.loadStatusesError")} onRetry={statuses.reload} /> : statuses.data.length === 0 ? <EmptyState title={t("resources.emptyStatusesTitle")} description={t("resources.emptyStatusesDescription")} /> : <DataTable
          data={statuses.data}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: t("resources.name"), cell: (row) => <StatusBadge value={row.name} color={row.color} /> },
            { header: t("resources.code"), cell: (row) => row.code },
            { header: t("resources.order"), cell: (row) => row.order ?? "-" },
            { header: t("resources.default"), cell: (row) => <Switch label={t("resources.defaultStatus")} checked={!!row.is_default} onCheckedChange={async (checked) => { await leadStatusesApi.patch(row.id, { is_default: checked }, accessToken); await statuses.reload(); }} /> },
            { header: t("resources.final"), cell: (row) => <Switch label={t("resources.finalStatus")} checked={!!row.is_final} onCheckedChange={async (checked) => { await leadStatusesApi.patch(row.id, { is_final: checked }, accessToken); await statuses.reload(); }} /> },
            { header: t("common.actions"), cell: (row) => <div className="flex items-center gap-1"><button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setEditing(row)} aria-label={t("resources.editStatus")}><Pencil className="h-4 w-4" /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => setConfirm(row)} aria-label={t("resources.deleteStatus")}><Trash2 className="h-4 w-4" /></button></div> },
          ]}
        />}
        {!statuses.loading && !statuses.error && statuses.data.length > 0 ? <Pagination page={statuses.meta.page} count={statuses.count} pageSize={statuses.meta.pageSize} onPageChange={statuses.setPage} /> : null}
      </Card>
      <StatusModal open={open} onOpenChange={setOpen} onSave={async (payload) => { await leadStatusesApi.create(payload, accessToken); toast({ title: t("resources.statusCreated"), tone: "success" }); await statuses.reload(); }} />
      <StatusModal open={!!editing} initial={editing ?? undefined} onOpenChange={(next) => !next && setEditing(null)} onSave={async (payload) => { if (!editing) return; await leadStatusesApi.patch(editing.id, payload, accessToken); toast({ title: t("resources.statusUpdated"), tone: "success" }); await statuses.reload(); setEditing(null); }} />
      <ConfirmDialog open={!!confirm} onOpenChange={() => setConfirm(null)} title={t("resources.deleteStatusTitle")} description={t("resources.deleteStatusDescription")} confirmLabel={t("resources.deleteStatus")} onConfirm={async () => { if (confirm) { await leadStatusesApi.delete(confirm.id, accessToken); toast({ title: t("resources.statusDeleted"), tone: "success" }); await statuses.reload(); } setConfirm(null); }} />
    </>
  );
}

function StatusModal({ open, onOpenChange, onSave, initial }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: Partial<LeadStatus>) => Promise<void>; initial?: LeadStatus }) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [order, setOrder] = useState(initial?.order?.toString() ?? "");
  const [color, setColor] = useState(initial?.color ?? "#4f46e5");
  const [isDefault, setDefault] = useState(!!initial?.is_default);
  const [isFinal, setFinal] = useState(!!initial?.is_final);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setName(initial?.name ?? "");
      setCode(initial?.code ?? "");
      setOrder(initial?.order?.toString() ?? "");
      setColor(initial?.color ?? "#4f46e5");
      setDefault(!!initial?.is_default);
      setFinal(!!initial?.is_final);
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, open]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? t("resources.editStatus") : t("resources.createStatus")}>
      <form className="space-y-4 p-5" onSubmit={async (event) => { event.preventDefault(); setError(null); setSaving(true); try { await onSave({ name, code, order: order ? Number(order) : undefined, color, is_default: isDefault, is_final: isFinal }); onOpenChange(false); } catch (err) { setError(err instanceof Error ? err.message : t("resources.saveStatusError")); } finally { setSaving(false); } }}>
        <div className="grid gap-4 md:grid-cols-2"><Field label={t("resources.name")}><Input required value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label={t("resources.code")}><Input required value={code} onChange={(event) => setCode(event.target.value)} /></Field><Field label={t("resources.order")}><Input type="number" value={order} onChange={(event) => setOrder(event.target.value)} /></Field><Field label={t("resources.color")}><Input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></Field></div>
        <div className="flex gap-6"><span className="flex items-center gap-2 text-sm"><Switch label={t("resources.default")} checked={isDefault} onCheckedChange={setDefault} /> {t("resources.default")}</span><span className="flex items-center gap-2 text-sm"><Switch label={t("resources.final")} checked={isFinal} onCheckedChange={setFinal} /> {t("resources.final")}</span></div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button variant="primary" type="submit" loading={saving}>{initial ? t("common.saveChanges") : t("resources.createStatus")}</Button></div>
      </form>
    </Modal>
  );
}

export function FieldsSettingsPage() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FieldDefinition | null>(null);
  const [confirm, setConfirm] = useState<FieldDefinition | null>(null);
  const fields = useApiResource(fieldDefinitionsApi.list, demoFields);
  const { accessToken } = useAuthStore();
  const { toast } = useUiStore();
  return (
    <>
      <PageHeader title={t("resources.fieldsTitle")} description={t("resources.fieldsDescription")} actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t("resources.createField")}</Button>} />
      <Card>
        {fields.loading ? <TableSkeleton /> : fields.error ? <ErrorState title={t("resources.loadFieldsError")} description={fields.error} onRetry={fields.reload} /> : fields.data.length === 0 ? <EmptyState title={t("resources.emptyFieldsTitle")} description={t("resources.emptyFieldsDescription")} /> : <DataTable
          data={fields.data}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: t("resources.entity"), cell: (row) => titleCase(row.entity_type) },
            { header: t("resources.label"), cell: (row) => <span className="flex items-center gap-2">{row.label}{row.is_system ? <Badge>{t("resources.system")}</Badge> : null}</span> },
            { header: t("resources.key"), cell: (row) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.key}</code> },
            { header: t("resources.type"), cell: (row) => row.field_type },
            { header: t("resources.order"), cell: (row) => row.order ?? "-" },
            { header: t("resources.required"), cell: (row) => <Switch label={t("resources.requiredField")} checked={!!row.is_required} onCheckedChange={async (checked) => { await fieldDefinitionsApi.patch(row.id, { is_required: checked }, accessToken); await fields.reload(); }} /> },
            { header: t("resources.active"), cell: (row) => row.is_active === false ? <Badge>{t("resources.inactive")}</Badge> : <Badge tone="success">{t("resources.active")}</Badge> },
            { header: t("resources.aiHint"), cell: (row) => <span className="text-muted-foreground">{row.ai_hint || t("common.none")}</span> },
            { header: t("common.actions"), cell: (row) => <div className="flex items-center gap-1"><button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setEditing(row)} aria-label={t("resources.editField")}><Pencil className="h-4 w-4" /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-500/10" disabled={row.is_active === false} onClick={() => setConfirm(row)} aria-label={t("resources.deleteField")}><Trash2 className="h-4 w-4" /></button></div> },
          ]}
        />}
        {!fields.loading && !fields.error && fields.data.length > 0 ? <Pagination page={fields.meta.page} count={fields.count} pageSize={fields.meta.pageSize} onPageChange={fields.setPage} /> : null}
      </Card>
      <FieldModal open={open} onOpenChange={setOpen} onSave={async (payload) => { await fieldDefinitionsApi.create(payload, accessToken); toast({ title: t("resources.fieldCreated"), tone: "success" }); await fields.reload(); }} />
      <FieldModal open={!!editing} initial={editing ?? undefined} onOpenChange={(next) => !next && setEditing(null)} onSave={async (payload) => { if (!editing) return; await fieldDefinitionsApi.patch(editing.id, payload, accessToken); toast({ title: t("resources.fieldUpdated"), tone: "success" }); await fields.reload(); setEditing(null); }} />
      <ConfirmDialog open={!!confirm} onOpenChange={() => setConfirm(null)} title={t("resources.deleteFieldTitle")} description={t("resources.deleteFieldDescription")} confirmLabel={t("resources.deleteField")} onConfirm={async () => { if (confirm) { await fieldDefinitionsApi.delete(confirm.id, accessToken); toast({ title: t("resources.fieldDeactivated"), tone: "success" }); await fields.reload(); } setConfirm(null); }} />
    </>
  );
}

function FieldModal({ open, onOpenChange, onSave, initial }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: Partial<FieldDefinition>) => Promise<void>; initial?: FieldDefinition }) {
  const t = useT();
  const isEdit = !!initial;
  const [entityType, setEntityType] = useState("lead");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [aiHint, setAiHint] = useState("");
  const [order, setOrder] = useState("");
  const [required, setRequired] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setEntityType(initial?.entity_type ?? "lead");
      setLabel(initial?.label ?? "");
      setKey(initial?.key ?? "");
      setFieldType(initial?.field_type ?? "text");
      setAiHint(initial?.ai_hint ?? "");
      setOrder(initial?.order?.toString() ?? "");
      setRequired(!!initial?.is_required);
      setErrors({});
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    // key, entity_type and field_type are immutable once created.
    const payload: Partial<FieldDefinition> = isEdit
      ? { label, ai_hint: aiHint, is_required: required, order: order ? Number(order) : undefined }
      : { entity_type: entityType, key, field_type: fieldType, label, ai_hint: aiHint, is_required: required, order: order ? Number(order) : undefined };
    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setError(err.friendlyMessage);
      } else {
        setError(err instanceof Error ? err.message : t("resources.saveFieldError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEdit ? t("resources.editField") : t("resources.createField")} description={isEdit ? t("resources.fieldImmutableHint") : undefined}>
      <form className="space-y-4 p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("resources.entityType")} error={errors.entity_type}>
            {isEdit ? <Input value={titleCase(entityType)} disabled readOnly /> : <Select label={t("resources.entity")} value={entityType} onChange={setEntityType} options={[{ label: t("resources.lead"), value: "lead" }, { label: t("resources.client"), value: "client" }]} />}
          </Field>
          <Field label={t("resources.label")} error={errors.label}><Input required value={label} onChange={(event) => setLabel(event.target.value)} /></Field>
          <Field label={t("resources.key")} error={errors.key} hint={isEdit ? undefined : t("resources.keyHint")}>
            <Input required value={key} disabled={isEdit} readOnly={isEdit} onChange={(event) => setKey(event.target.value)} />
          </Field>
          <Field label={t("resources.fieldType")} error={errors.field_type}>
            {isEdit ? <Input value={fieldType} disabled readOnly /> : <Select label={t("resources.type")} value={fieldType} onChange={setFieldType} options={[{ label: t("resources.text"), value: "text" }, { label: t("resources.number"), value: "number" }, { label: t("resources.date"), value: "date" }, { label: t("resources.phone"), value: "phone" }]} />}
          </Field>
        </div>
        <Field label={t("resources.order")} error={errors.order}><Input type="number" value={order} onChange={(event) => setOrder(event.target.value)} /></Field>
        <Field label={t("resources.aiHint")} error={errors.ai_hint}><Textarea placeholder={t("resources.aiHintPlaceholder")} value={aiHint} onChange={(event) => setAiHint(event.target.value)} /></Field>
        <span className="flex items-center gap-2 text-sm"><Switch label={t("resources.required")} checked={required} onCheckedChange={setRequired} /> {t("resources.required")}</span>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button variant="primary" type="submit" loading={saving}>{isEdit ? t("common.saveChanges") : t("resources.createField")}</Button></div>
      </form>
    </Modal>
  );
}

export function LeadDetail({ id }: { id: string }) {
  const t = useT();
  const { formatDate } = useFormatters();
  const leadItem = useApiItem(leadsApi.get, id, demoLeads.find((item) => String(item.id) === id));
  const lead = leadItem.data;
  if (leadItem.loading) return <TableSkeleton />;
  if (leadItem.error) return <ErrorState title={t("resources.loadLeadError")} description={leadItem.error} onRetry={leadItem.reload} />;
  if (!lead) return <EmptyState title={t("resources.leadNotFound")} description={t("resources.leadNotFoundDescription")} />;
  return <DetailLayout title={lead?.title ?? t("resources.lead")} sections={[[t("resources.client"), typeof lead?.client === "object" ? lead.client.name ?? lead.client.phone : `#${lead?.client}`], [t("resources.status"), typeof lead?.status === "object" ? lead.status.name : `#${lead?.status}`], [t("resources.assignedOperator"), displayPerson(lead?.assigned_to)], [t("resources.sourceCall"), objectId(lead?.source_call) ? t("dashboard.callNumber", { id: objectId(lead?.source_call) ?? "" }) : t("common.none")], [t("resources.created"), formatDate(lead?.created_at)], [t("resources.updated"), formatDate(lead?.updated_at)], [t("resources.customFields"), <StructuredDataValue key="lead-custom-data" value={lead?.custom_data ?? {}} />]]} />;
}

export function ClientDetail({ id }: { id: string }) {
  const t = useT();
  const { formatDate } = useFormatters();
  const clientItem = useApiItem(clientsApi.get, id, demoClients.find((item) => String(item.id) === id));
  const client = clientItem.data;
  if (clientItem.loading) return <TableSkeleton />;
  if (clientItem.error) return <ErrorState title={t("resources.loadClientError")} description={clientItem.error} onRetry={clientItem.reload} />;
  if (!client) return <EmptyState title={t("resources.clientNotFound")} description={t("resources.clientNotFoundDescription")} />;
  return <DetailLayout title={client?.name ?? client?.phone ?? t("resources.client")} sections={[[t("resources.phone"), client?.phone], [t("resources.createdVia"), client?.created_via], [t("resources.created"), formatDate(client?.created_at)], [t("resources.updated"), formatDate(client?.updated_at)], [t("resources.customData"), <StructuredDataValue key="client-custom-data" value={client?.custom_data ?? {}} />], [t("resources.relatedLeads"), t("resources.relationshipHint")], [t("resources.relatedCalls"), t("resources.matchingCallsHint")]]} />;
}

function DetailLayout({ title, sections }: { title: string; sections: [string, React.ReactNode][] }) {
  const t = useT();
  return (
    <>
      <PageHeader title={title} description={t("resources.detailDescription")} />
      <Card><CardContent className="grid gap-3 md:grid-cols-2">{sections.map(([label, value]) => <div key={label} className="rounded-md border border-border bg-background/60 p-4"><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p><div className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{value ?? t("common.notRecorded")}</div></div>)}</CardContent></Card>
    </>
  );
}
