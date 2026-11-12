"use server";

// Server Actions for CRM writes. Each validates its input on the server (never trust the form),
// writes with the server-only Supabase client, then calls refresh() so the current page re-renders.

import { refresh } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ACTIVITY_TYPES,
  CONTACT_STATUSES,
  STAGES,
  STAGE_META,
  type ActivityType,
  type ContactStatus,
  type FormState,
  type Stage,
} from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optional = (fd: FormData, key: string) => text(fd, key) || null;
/** Plain-string copy of the submitted form, returned on validation errors (see FormState.values). */
const echo = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, v as string]));
const optionalId = (fd: FormData, key: string) => {
  const v = Number(text(fd, key));
  return Number.isInteger(v) && v > 0 ? v : null;
};

function dbError(message: string): FormState {
  console.error("[crm]", message);
  return { ok: false, message: "Couldn't save. Please try again." };
}

// ---------------------------------------------------------------- contacts

function parseContact(fd: FormData) {
  const values = {
    name: text(fd, "name"),
    email: optional(fd, "email"),
    phone: optional(fd, "phone"),
    company: optional(fd, "company"),
    status: text(fd, "status") as ContactStatus,
  };
  const errors: FormState["errors"] = {};
  if (!values.name) errors.name = "Name is required";
  if (values.name.length > 120) errors.name = "Name is too long";
  if (values.email && !EMAIL_RE.test(values.email)) errors.email = "Enter a valid email";
  if (values.phone && !/^[+\d][\d\s-]{5,19}$/.test(values.phone)) errors.phone = "Enter a valid phone number";
  if (!CONTACT_STATUSES.includes(values.status)) errors.status = "Choose a status";
  return { values, errors };
}

export async function saveContact(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optionalId(fd, "id");
  const { values, errors } = parseContact(fd);
  if (Object.keys(errors!).length) return { ok: false, errors, values: echo(fd) };

  const sb = supabaseServer();
  const { error } = id
    ? await sb.from("contacts").update(values).eq("id", id)
    : await sb.from("contacts").insert(values);
  if (error) return dbError(error.message);

  refresh();
  return { ok: true, message: id ? "Contact updated" : "Contact created" };
}

export async function deleteContact(id: number): Promise<FormState> {
  // Cascades to the contact's opportunities and activities (ON DELETE CASCADE).
  const { error } = await supabaseServer().from("contacts").delete().eq("id", id);
  if (error) return dbError(error.message);
  refresh();
  return { ok: true, message: "Contact deleted" };
}

// ----------------------------------------------------------- opportunities

export async function saveOpportunity(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = optionalId(fd, "id");
  const values = {
    title: text(fd, "title"),
    contact_id: optionalId(fd, "contact_id"),
    value_rm: Number(text(fd, "value_rm").replace(/[,\s]/g, "")),
    stage: text(fd, "stage") as Stage,
  };
  const errors: FormState["errors"] = {};
  if (!values.title) errors.title = "Title is required";
  if (!values.contact_id) errors.contact_id = "Choose a contact";
  if (!Number.isFinite(values.value_rm) || values.value_rm < 0) errors.value_rm = "Enter a value of 0 or more";
  if (!STAGES.includes(values.stage)) errors.stage = "Choose a stage";
  if (Object.keys(errors).length) return { ok: false, errors, values: echo(fd) };

  const sb = supabaseServer();
  if (id) {
    const { data: before } = await sb.from("opportunities").select("stage").eq("id", id).single();
    const { error } = await sb.from("opportunities").update(values).eq("id", id);
    if (error) return dbError(error.message);
    if (before && before.stage !== values.stage) await logStageChange(id, values.contact_id!, before.stage, values.stage);
  } else {
    const { error } = await sb.from("opportunities").insert(values);
    if (error) return dbError(error.message);
  }
  refresh();
  return { ok: true, message: id ? "Opportunity updated" : "Opportunity created" };
}

/** Quick stage change from the pipeline board. */
export async function moveOpportunity(id: number, stage: Stage): Promise<FormState> {
  if (!STAGES.includes(stage)) return { ok: false, message: "Unknown stage" };
  const sb = supabaseServer();
  const { data: before, error: readError } = await sb
    .from("opportunities")
    .select("stage, contact_id")
    .eq("id", id)
    .single();
  if (readError) return dbError(readError.message);
  if (before.stage === stage) return { ok: true };

  const { error } = await sb.from("opportunities").update({ stage }).eq("id", id);
  if (error) return dbError(error.message);
  await logStageChange(id, before.contact_id, before.stage, stage);
  refresh();
  return { ok: true, message: `Moved to ${STAGE_META[stage].label}` };
}

export async function deleteOpportunity(id: number): Promise<FormState> {
  const { error } = await supabaseServer().from("opportunities").delete().eq("id", id);
  if (error) return dbError(error.message);
  refresh();
  return { ok: true, message: "Opportunity deleted" };
}

/** Stage changes are written to the activity log so the dashboard feed shows pipeline movement. */
async function logStageChange(opportunityId: number, contactId: number, from: Stage, to: Stage) {
  const { error } = await supabaseServer().from("activities").insert({
    opportunity_id: opportunityId,
    contact_id: contactId,
    type: "note",
    description: `Stage changed: ${STAGE_META[from].label} → ${STAGE_META[to].label}`,
  });
  if (error) console.error("[crm] stage-change log failed:", error.message); // non-fatal
}

// -------------------------------------------------------------- activities

export async function createActivity(_prev: FormState, fd: FormData): Promise<FormState> {
  const occurred = text(fd, "occurred_at");
  const values = {
    type: text(fd, "type") as ActivityType,
    description: text(fd, "description"),
    contact_id: optionalId(fd, "contact_id"),
    opportunity_id: optionalId(fd, "opportunity_id"),
    occurred_at: occurred ? new Date(occurred).toISOString() : new Date().toISOString(),
  };
  const errors: FormState["errors"] = {};
  if (!ACTIVITY_TYPES.includes(values.type)) errors.type = "Choose a type";
  if (!values.description) errors.description = "Add a short description";
  if (!values.contact_id && !values.opportunity_id) errors.contact_id = "Link it to a contact or an opportunity";
  if (occurred && Number.isNaN(new Date(occurred).getTime())) errors.occurred_at = "Enter a valid date";
  if (Object.keys(errors).length) return { ok: false, errors, values: echo(fd) };

  // If only an opportunity was chosen, attach its contact too so the feed can show who it was with.
  if (!values.contact_id && values.opportunity_id) {
    const { data } = await supabaseServer()
      .from("opportunities")
      .select("contact_id")
      .eq("id", values.opportunity_id)
      .single();
    values.contact_id = data?.contact_id ?? null;
  }

  const { error } = await supabaseServer().from("activities").insert(values);
  if (error) return dbError(error.message);
  refresh();
  return { ok: true, message: "Activity logged" };
}

export async function deleteActivity(id: number): Promise<FormState> {
  const { error } = await supabaseServer().from("activities").delete().eq("id", id);
  if (error) return dbError(error.message);
  refresh();
  return { ok: true, message: "Activity deleted" };
}
