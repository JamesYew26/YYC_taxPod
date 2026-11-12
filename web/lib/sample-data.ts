/**
 * Placeholder dashboard data until the CRM tables (contacts, opportunities,
 * activities) exist in Supabase. All names are fictional.
 */

export const kpis = [
  { label: "Pipeline value", value: "RM 1,284,500", delta: "+18.4%", note: "vs last quarter", icon: "trending_up", tone: "teal" as const },
  { label: "Open deals", value: "42", delta: "+6", note: "this month", icon: "work", tone: "violet" as const },
  { label: "Won this month", value: "RM 392,000", delta: "8 deals", note: "signed", icon: "verified", tone: "teal" as const },
  { label: "New contacts", value: "19", delta: "+4", note: "last 30 days", icon: "person_add", tone: "violet" as const },
];

export type Stage = {
  name: string;
  value: number; // RM
  count: number;
};

export const stages: Stage[] = [
  { name: "Lead", value: 180_000, count: 8 },
  { name: "Qualified", value: 310_000, count: 11 },
  { name: "Proposal", value: 420_000, count: 9 },
  { name: "Negotiation", value: 654_500, count: 7 },
  { name: "Won", value: 392_000, count: 5 },
  { name: "Lost", value: 72_000, count: 2 },
];

export const activities = [
  {
    time: "10:42",
    type: "Tax query",
    tone: "violet" as const,
    icon: "auto_awesome",
    who: "Aisyah Rahman",
    company: "Kenanga Bina Sdn Bhd",
    detail: "Asked about deductibility of secretarial and tax filing fees.",
  },
  {
    time: "09:15",
    type: "Proposal",
    tone: "teal" as const,
    icon: "description",
    who: "Daniel Lim",
    company: "Lim & Partners Trading",
    detail: "Annual corporate tax compliance proposal sent for YA 2026.",
  },
  {
    time: "Yesterday",
    type: "Meeting",
    tone: "amber" as const,
    icon: "event",
    who: "Priya Nair",
    company: "Seri Harapan Foods",
    detail: "Discussed SST registration threshold and e-Invoicing rollout.",
  },
  {
    time: "Yesterday",
    type: "Call",
    tone: "neutral" as const,
    icon: "call",
    who: "Wong Kar Meng",
    company: "Individual",
    detail: "Personal income tax relief review: EPF, lifestyle, medical.",
  },
];

export const suggestedQuestions = [
  "What is the tax relief for EPF contributions?",
  "Are secretarial fees tax deductible?",
  "Who must register for SST?",
];
