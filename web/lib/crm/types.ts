// CRM domain types and display metadata, shared by server queries, actions and UI.
// Values mirror the CHECK constraints in supabase/migrations/002_crm.sql.

import type { PillTone } from "@/components/ui/glass";

export const CONTACT_STATUSES = ["lead", "prospect", "customer"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];
export const OPEN_STAGES: Stage[] = ["new", "contacted", "qualified", "proposal"];

export const ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
};

export type ContactRow = Contact & { opportunity_count: number };

export type ContactOption = Pick<Contact, "id" | "name" | "company">;

export type Opportunity = {
  id: number;
  contact_id: number;
  title: string;
  value_rm: number;
  stage: Stage;
  created_at: string;
  updated_at: string;
  contact: { id: number; name: string; company: string | null } | null;
};

export type Activity = {
  id: number;
  contact_id: number | null;
  opportunity_id: number | null;
  type: ActivityType;
  occurred_at: string;
  description: string;
  contact: { name: string; company: string | null } | null;
  opportunity: { title: string } | null;
};

/** Result shape for form Server Actions used with useActionState. */
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<string, string>>;
  /** Submitted values, echoed back on validation errors: React 19 resets the form after an action,
   *  so forms use these as defaultValue to avoid wiping what the user typed. */
  values?: Record<string, string>;
};

export const STATUS_META: Record<ContactStatus, { label: string; tone: PillTone }> = {
  lead: { label: "Lead", tone: "neutral" },
  prospect: { label: "Prospect", tone: "violet" },
  customer: { label: "Customer", tone: "teal" },
};

export const STAGE_META: Record<Stage, { label: string; tone: PillTone }> = {
  new: { label: "New", tone: "neutral" },
  contacted: { label: "Contacted", tone: "neutral" },
  qualified: { label: "Qualified", tone: "violet" },
  proposal: { label: "Proposal", tone: "amber" },
  won: { label: "Won", tone: "teal" },
  lost: { label: "Lost", tone: "rose" },
};

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: string; tone: PillTone }> = {
  call: { label: "Call", icon: "call", tone: "neutral" },
  email: { label: "Email", icon: "mail", tone: "violet" },
  meeting: { label: "Meeting", icon: "event", tone: "amber" },
  note: { label: "Note", icon: "sticky_note_2", tone: "teal" },
};

export const formatRM = (n: number) =>
  "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** "2 h ago", "Yesterday", "3 Nov" — compact relative time for feeds. */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = (now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 172800) return "Yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}
