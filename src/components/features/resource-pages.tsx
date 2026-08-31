"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { clientsApi, fieldDefinitionsApi, leadsApi, leadStatusesApi } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { demoClients, demoFields, demoLeads, demoStatuses } from "@/lib/data/demo";
import { displayPerson, objectId, parseJsonObject, titleCase } from "@/lib/utils/format";
import { useApiItem } from "@/hooks/use-api-item";
import { useApiResource } from "@/hooks/use-api-resource";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import type { Client, FieldDefinition, Lead, LeadStatus } from "@/types/domain";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SearchInput, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { StructuredDataValue } from "@/components/ui/structured-ai-data";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/shell/page-header";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-2">{children}</div>
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
        <div className="flex flex-wrap gap-2 border-b border-border p-4"><SearchInput value={search} onChange={(event) => setSearch(event.target.value)} /><Select label={t("resources.status")} value={statusFilter} onChange={setStatusFilter} options={[{ label: t("common.all"), value: "" }, ...statuses.data.map((s) => ({ label: s.name ?? String(s.id), value: String(s.id) }))]} /></div>
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
          <CardContent><div className="grid gap-3 md:grid-cols-3">{statuses.data.map((status) => <div key={status.id} className="rounded-lg border border-border bg-background/60 p-3"><div className="mb-3 flex items-center justify-between"><StatusBadge value={status.name} color={status.color} /><span className="text-xs text-muted-foreground">{t("resources.noDragPersistence")}</span></div><div className="space-y-2">{filtered.filter((lead) => objectId(lead.status) === status.id).map((lead) => <button key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="w-full rounded-md border border-border bg-card p-3 text-left text-sm hover:bg-muted"><div className="flex items-start justify-between gap-2"><p className="font-medium">{lead.title}</p>{lead.created_via?.toLowerCase().includes("ai") ? <Badge tone="ai">AI</Badge> : null}</div><p className="mt-1 text-muted-foreground">{typeof lead.client === "object" ? lead.client.name ?? lead.client.phone : `#${lead.client}`}</p><p className="mt-2 text-xs text-muted-foreground">{displayPerson(lead.assigned_to)} · {formatDate(lead.created_at)}</p></button>)}</div></div>)}</div></CardContent>
        )}
        {!leads.loading && !leads.error && filtered.length > 0 ? <Pagination page={leads.meta.page} count={leads.count} pageSize={leads.meta.pageSize} onPageChange={leads.setPage} /> : null}
      </Card>
      <LeadModal open={open} clients={clients.data} statuses={statuses.data} onOpenChange={setOpen} onSave={async (payload) => { await leadsApi.create(payload, accessToken); toast({ title: t("resources.leadCreated"), tone: "success" }); await leads.reload(); }} />
      <LeadModal open={!!editing} clients={clients.data} statuses={statuses.data} initial={editing ?? undefined} onOpenChange={(next) => !next && setEditing(null)} onSave={async (payload) => { if (!editing) return; await leadsApi.patch(editing.id, payload, accessToken); toast({ title: t("resources.leadUpdated"), tone: "success" }); await leads.reload(); setEditing(null); }} />
      <ConfirmDialog open={!!confirm} onOpenChange={() => setConfirm(null)} title={t("resources.deleteLeadTitle")} description={t("resources.deleteLeadDescription")} confirmLabel={t("resources.deleteLead")} onConfirm={async () => { if (confirm) { await leadsApi.delete(confirm.id, accessToken); toast({ title: t("resources.leadDeleted"), tone: "success" }); await leads.reload(); } setConfirm(null); }} />
    </>
  );
}

function LeadModal({ open, onOpenChange, onSave, initial, clients, statuses }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: Partial<Lead>) => Promise<void>; initial?: Lead; clients: Client[]; statuses: LeadStatus[] }) {
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [clientId, setClientId] = useState(objectId(initial?.client)?.toString() ?? "");
  const [statusId, setStatusId] = useState(objectId(initial?.status)?.toString() ?? "");
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to ?? "");
  const [customData, setCustomData] = useState(initial?.custom_data ? JSON.stringify(initial.custom_data, null, 2) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setTitle(initial?.title ?? "");
      setClientId(objectId(initial?.client)?.toString() ?? "");
      setStatusId(objectId(initial?.status)?.toString() ?? "");
      setAssignedTo(initial?.assigned_to ?? "");
      setCustomData(initial?.custom_data ? JSON.stringify(initial.custom_data, null, 2) : "");
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, open]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? t("resources.editLead") : t("resources.createLead")} description={t("resources.modalLeadDescription")}>
      <form className="space-y-4 p-5" onSubmit={async (event) => { event.preventDefault(); setError(null); const parsed = parseJsonObject(customData); if (!parsed) { setError(t("resources.customJsonError")); return; } if (!clientId || !statusId) { setError(t("resources.clientStatusRequired")); return; } const assigned = assignedTo === "" || assignedTo === null ? null : Number(assignedTo); if (assignedTo !== "" && assignedTo !== null && !Number.isFinite(assigned)) { setError(t("resources.assignedNumericError")); return; } setSaving(true); try { await onSave({ title, client: Number(clientId), status: Number(statusId), assigned_to: assigned, custom_data: parsed }); onOpenChange(false); } catch (err) { setError(err instanceof Error ? err.message : t("resources.saveLeadError")); } finally { setSaving(false); } }}>
        <Field label={t("resources.title")}><Input required value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("resources.client")}><Select label={t("resources.client")} value={clientId} onChange={setClientId} options={[{ label: t("common.select"), value: "" }, ...clients.map((client) => ({ label: client.name ?? client.phone ?? `#${client.id}`, value: String(client.id) }))]} /></Field>
          <Field label={t("resources.status")}><Select label={t("resources.status")} value={statusId} onChange={setStatusId} options={[{ label: t("common.select"), value: "" }, ...statuses.map((status) => ({ label: status.name ?? status.code ?? `#${status.id}`, value: String(status.id) }))]} /></Field>
        </div>
        <Field label={t("resources.assignedOperatorId")}><Input inputMode="numeric" value={assignedTo ?? ""} onChange={(event) => setAssignedTo(event.target.value)} /></Field>
        <Field label={t("resources.customData")}><Textarea value={customData} onChange={(event) => setCustomData(event.target.value)} /></Field>
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
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [customData, setCustomData] = useState(initial?.custom_data ? JSON.stringify(initial.custom_data, null, 2) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setName(initial?.name ?? "");
      setPhone(initial?.phone ?? "");
      setCustomData(initial?.custom_data ? JSON.stringify(initial.custom_data, null, 2) : "");
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, open]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? t("resources.editClient") : t("resources.createClient")}>
      <form className="space-y-4 p-5" onSubmit={async (event) => { event.preventDefault(); setError(null); const parsed = parseJsonObject(customData); if (!parsed) { setError(t("resources.customJsonError")); return; } setSaving(true); try { await onSave({ name, phone, custom_data: parsed }); onOpenChange(false); } catch (err) { setError(err instanceof Error ? err.message : t("resources.saveClientError")); } finally { setSaving(false); } }}>
        <Field label={t("resources.name")}><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label={t("resources.phone")}><Input required value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
        <Field label={t("resources.customData")}><Textarea value={customData} onChange={(event) => setCustomData(event.target.value)} /></Field>
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
        {fields.loading ? <TableSkeleton /> : fields.error ? <ErrorState title={t("resources.loadFieldsError")} onRetry={fields.reload} /> : fields.data.length === 0 ? <EmptyState title={t("resources.emptyFieldsTitle")} description={t("resources.emptyFieldsDescription")} /> : <DataTable
          data={fields.data}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: t("resources.entity"), cell: (row) => titleCase(row.entity_type) },
            { header: t("resources.label"), cell: (row) => row.label },
            { header: t("resources.key"), cell: (row) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.key}</code> },
            { header: t("resources.type"), cell: (row) => row.field_type },
            { header: t("resources.required"), cell: (row) => <Switch label={t("resources.requiredField")} checked={!!row.is_required} disabled={!!row.is_system} onCheckedChange={async (checked) => { await fieldDefinitionsApi.patch(row.id, { is_required: checked }, accessToken); await fields.reload(); }} /> },
            { header: t("resources.active"), cell: (row) => <Switch label={t("resources.activeField")} checked={!!row.is_active} disabled={!!row.is_system} onCheckedChange={async (checked) => { await fieldDefinitionsApi.patch(row.id, { is_active: checked }, accessToken); await fields.reload(); }} /> },
            { header: t("resources.aiHint"), cell: (row) => <span className="text-muted-foreground">{row.ai_hint ?? t("common.none")}</span> },
            { header: t("common.actions"), cell: (row) => <div className="flex items-center gap-1"><button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40" disabled={!!row.is_system} onClick={() => setEditing(row)} aria-label={t("resources.editField")}><Pencil className="h-4 w-4" /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-500/10" disabled={!!row.is_system} onClick={() => setConfirm(row)} aria-label={t("resources.deleteField")}><Trash2 className="h-4 w-4" /></button></div> },
          ]}
        />}
        {!fields.loading && !fields.error && fields.data.length > 0 ? <Pagination page={fields.meta.page} count={fields.count} pageSize={fields.meta.pageSize} onPageChange={fields.setPage} /> : null}
      </Card>
      <FieldModal open={open} onOpenChange={setOpen} onSave={async (payload) => { await fieldDefinitionsApi.create(payload, accessToken); toast({ title: t("resources.fieldCreated"), tone: "success" }); await fields.reload(); }} />
      <FieldModal open={!!editing} initial={editing ?? undefined} onOpenChange={(next) => !next && setEditing(null)} onSave={async (payload) => { if (!editing) return; await fieldDefinitionsApi.patch(editing.id, payload, accessToken); toast({ title: t("resources.fieldUpdated"), tone: "success" }); await fields.reload(); setEditing(null); }} />
      <ConfirmDialog open={!!confirm} onOpenChange={() => setConfirm(null)} title={t("resources.deleteFieldTitle")} description={t("resources.deleteFieldDescription")} confirmLabel={t("resources.deleteField")} onConfirm={async () => { if (confirm && !confirm.is_system) { await fieldDefinitionsApi.delete(confirm.id, accessToken); toast({ title: t("resources.fieldDeleted"), tone: "success" }); await fields.reload(); } setConfirm(null); }} />
    </>
  );
}

function FieldModal({ open, onOpenChange, onSave, initial }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: Partial<FieldDefinition>) => Promise<void>; initial?: FieldDefinition }) {
  const t = useT();
  const [entityType, setEntityType] = useState(initial?.entity_type ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [key, setKey] = useState(initial?.key ?? "");
  const [fieldType, setFieldType] = useState(initial?.field_type ?? "text");
  const [aiHint, setAiHint] = useState(initial?.ai_hint ?? "");
  const [required, setRequired] = useState(!!initial?.is_required);
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setEntityType(initial?.entity_type ?? "");
      setLabel(initial?.label ?? "");
      setKey(initial?.key ?? "");
      setFieldType(initial?.field_type ?? "text");
      setAiHint(initial?.ai_hint ?? "");
      setRequired(!!initial?.is_required);
      setActive(initial?.is_active ?? true);
      setError(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, open]);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? t("resources.editField") : t("resources.createField")}>
      <form className="space-y-4 p-5" onSubmit={async (event: FormEvent) => { event.preventDefault(); setError(null); setSaving(true); try { await onSave({ entity_type: entityType, label, key, field_type: fieldType, ai_hint: aiHint, is_required: required, is_active: active }); onOpenChange(false); } catch (err) { setError(err instanceof Error ? err.message : t("resources.saveFieldError")); } finally { setSaving(false); } }}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("resources.entityType")}><Select label={t("resources.entity")} value={entityType} onChange={setEntityType} options={[{ label: t("resources.lead"), value: "lead" }, { label: t("resources.client"), value: "client" }]} /></Field>
          <Field label={t("resources.label")}><Input required value={label} onChange={(event) => setLabel(event.target.value)} /></Field>
          <Field label={t("resources.key")}><Input required value={key} onChange={(event) => setKey(event.target.value)} /></Field>
          <Field label={t("resources.fieldType")}><Select label={t("resources.type")} value={fieldType} onChange={setFieldType} options={[{ label: t("resources.text"), value: "text" }, { label: t("resources.number"), value: "number" }, { label: t("resources.date"), value: "date" }, { label: t("resources.phone"), value: "phone" }]} /></Field>
        </div>
        <Field label={t("resources.aiHint")}><Textarea placeholder={t("resources.aiHintPlaceholder")} value={aiHint} onChange={(event) => setAiHint(event.target.value)} /></Field>
        <div className="flex gap-6"><span className="flex items-center gap-2 text-sm"><Switch label={t("resources.required")} checked={required} onCheckedChange={setRequired} /> {t("resources.required")}</span><span className="flex items-center gap-2 text-sm"><Switch label={t("resources.active")} checked={active} onCheckedChange={setActive} /> {t("resources.active")}</span></div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button variant="primary" type="submit" loading={saving}>{initial ? t("common.saveChanges") : t("resources.createField")}</Button></div>
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
