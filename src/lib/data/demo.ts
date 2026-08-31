import type { Analysis, Call, Client, FieldDefinition, Lead, LeadStatus, Transcript } from "@/types/domain";

export const demoStatuses: LeadStatus[] = [
  { id: 1, name: "Inbound", code: "inbound", order: 1, color: "#4f46e5", is_default: true, is_final: false },
  { id: 2, name: "In Conversation", code: "conversation", order: 2, color: "#f59e0b", is_default: false, is_final: false },
  { id: 3, name: "Won", code: "won", order: 3, color: "#10b981", is_default: false, is_final: true },
];

export const demoCalls: Call[] = [
  { id: 1284, client_phone: "+998 90 214 88 12", operator: "Bobur", direction: "outbound", duration: 426, stage: "DONE", started_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(), provider: "telephony" },
  { id: 1281, client_phone: "+998 93 771 10 44", operator: "Azizbek", direction: "inbound", duration: 612, stage: "DONE", started_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), provider: "telephony" },
  { id: 1277, client_phone: "+998 97 442 31 09", operator: "Dilshod", direction: "outbound", duration: 288, stage: "DONE", started_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(), provider: "telephony" },
  { id: 1272, client_phone: "+998 91 333 21 17", operator: "Sardor", direction: "inbound", duration: 742, stage: "DONE", started_at: new Date(Date.now() - 1000 * 60 * 260).toISOString(), provider: "telephony" },
  { id: 1268, client_phone: "+998 99 110 41 20", operator: "Malika", direction: "outbound", duration: 0, stage: "PROCESSING", started_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), provider: "telephony" },
];

export const demoAnalyses: Analysis[] = [
  { id: 1, call: 1284, summary: "Price objection was not handled effectively", overall_score: 61, evaluation: "The seller acknowledged the concern but did not reframe value or confirm next steps.", extracted_fields: { budget: "Price-sensitive", intent: "Medium", objection: "Monthly cost" }, lead_created: false, skip_reason: "No clear follow-up commitment", model_name: "gpt-sales-review", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 2, call: 1281, summary: "Seller talked significantly more than the customer", overall_score: 68, evaluation: "Discovery was shallow. The customer had interest but little room to explain timing.", extracted_fields: { need: "Automation", timeline: "This month" }, lead_created: true, model_name: "gpt-sales-review", created_at: new Date(Date.now() - 1000 * 60 * 86).toISOString() },
  { id: 3, call: 1277, summary: "Customer showed buying intent but no follow-up action was identified", overall_score: 72, evaluation: "Intent signals were present. The seller should have scheduled a concrete next touch.", extracted_fields: { intent: "High", next_step: "Undefined" }, lead_created: false, model_name: "gpt-sales-review", created_at: new Date(Date.now() - 1000 * 60 * 170).toISOString() },
  { id: 4, call: 1272, summary: "Excellent objection handling and strong closing", overall_score: 94, evaluation: "The seller clarified the objection, tied value to the customer's process, and confirmed follow-up.", extracted_fields: { intent: "High", next_step: "Demo scheduled" }, lead_created: true, model_name: "gpt-sales-review", created_at: new Date(Date.now() - 1000 * 60 * 250).toISOString() },
];

export const demoClients: Client[] = [
  { id: 1, name: "Akmal Rakhimov", phone: "+998 90 214 88 12", created_via: "AI", created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString(), custom_data: { company: "UzTrade" } },
  { id: 2, name: "Nodira Karimova", phone: "+998 93 771 10 44", created_via: "Manual", created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date().toISOString(), custom_data: { segment: "SMB" } },
];

export const demoLeads: Lead[] = [
  { id: 1, title: "ERP automation consultation", client: demoClients[0], status: demoStatuses[1], source_call: demoCalls[1], assigned_to: "Azizbek", created_via: "AI", created_at: new Date(Date.now() - 9000000).toISOString(), updated_at: new Date().toISOString(), custom_data: { expected_budget: "$3k" } },
  { id: 2, title: "Call review follow-up", client: demoClients[1], status: demoStatuses[0], source_call: demoCalls[3], assigned_to: "Sardor", created_via: "AI", created_at: new Date(Date.now() - 12000000).toISOString(), updated_at: new Date().toISOString(), custom_data: { priority: "High" } },
];

export const demoTranscripts: Transcript[] = [
  {
    id: 1,
    call: demoCalls[0],
    provider: "telephony",
    created_at: new Date().toISOString(),
    text: "Seller: Good afternoon, I wanted to understand what is blocking your decision. Customer: The price is higher than we expected. Seller: I understand. Customer: We need to see a clear return before moving.",
    segments: [
      { speaker: "Seller", text: "Good afternoon, I wanted to understand what is blocking your decision.", start: 0 },
      { speaker: "Customer", text: "The price is higher than we expected.", start: 8 },
      { speaker: "Seller", text: "I understand.", start: 14 },
      { speaker: "Customer", text: "We need to see a clear return before moving.", start: 18 },
    ],
  },
];

export const demoFields: FieldDefinition[] = [
  { id: 1, entity_type: "lead", key: "budget", label: "Budget", field_type: "text", is_required: false, ai_hint: "Extract the customer's expected budget or price sensitivity.", order: 1, is_active: true, is_system: false },
  { id: 2, entity_type: "client", key: "company", label: "Company", field_type: "text", is_required: false, ai_hint: "Company or organization mentioned by the customer.", order: 2, is_active: true, is_system: false },
];
