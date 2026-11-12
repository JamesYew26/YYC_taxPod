// Server-side reads for the CRM. Uncached on purpose (fresh on every request);
// pages call these inside <Suspense> as required by cacheComponents.
// Each starts with `await connection()`: it marks the read as request-time, so values like
// Date.now() (dashboard, "time ago" labels) are never baked into a prerender.

import { connection } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  OPEN_STAGES,
  STAGES,
  type Activity,
  type ContactOption,
  type ContactRow,
  type ContactStatus,
  type Opportunity,
  type Stage,
} from "./types";

function fail(what: string, error: { message: string }): never {
  throw new Error(`Failed to load ${what}: ${error.message}`);
}

/** PostgREST `or()` filters use , ( ) as syntax — strip them (and LIKE wildcards) from user input. */
function sanitiseSearch(q: string): string {
  return q.replace(/[,()%_*\\]/g, " ").trim().slice(0, 100);
}

export async function listContacts(filters: { q?: string; status?: ContactStatus }): Promise<ContactRow[]> {
  await connection();
  let query = supabaseServer()
    .from("contacts")
    .select("*, opportunities(count)")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  const q = filters.q ? sanitiseSearch(filters.q) : "";
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) fail("contacts", error);
  return (data ?? []).map(({ opportunities, ...c }) => ({
    ...c,
    opportunity_count: (opportunities as { count: number }[])?.[0]?.count ?? 0,
  })) as ContactRow[];
}

export async function listContactOptions(): Promise<ContactOption[]> {
  await connection();
  const { data, error } = await supabaseServer().from("contacts").select("id, name, company").order("name");
  if (error) fail("contact options", error);
  return data ?? [];
}

export async function listOpportunities(): Promise<Opportunity[]> {
  await connection();
  const { data, error } = await supabaseServer()
    .from("opportunities")
    .select("*, contact:contacts(id, name, company)")
    .order("updated_at", { ascending: false });
  if (error) fail("opportunities", error);
  // numeric comes back as a string from PostgREST — normalise to number.
  return (data ?? []).map((o) => ({ ...o, value_rm: Number(o.value_rm) })) as Opportunity[];
}

export async function listActivities(limit = 50): Promise<Activity[]> {
  await connection();
  const { data, error } = await supabaseServer()
    .from("activities")
    .select("*, contact:contacts(name, company), opportunity:opportunities(title)")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) fail("activities", error);
  return (data ?? []) as Activity[];
}

export type DashboardStats = {
  totalContacts: number;
  newContacts30d: number;
  openOpportunities: number;
  openValue: number;
  totalValue: number;
  wonValue: number;
  byStage: { stage: Stage; count: number; value: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await connection();
  const sb = supabaseServer();
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [all, recent, opps] = await Promise.all([
    sb.from("contacts").select("*", { count: "exact", head: true }),
    sb.from("contacts").select("*", { count: "exact", head: true }).gte("created_at", since),
    sb.from("opportunities").select("stage, value_rm"),
  ]);
  if (all.error) fail("contact count", all.error);
  if (recent.error) fail("recent contacts", recent.error);
  if (opps.error) fail("opportunity totals", opps.error);

  // Small table: aggregate in JS. At scale this would be a SQL view / GROUP BY.
  const byStage = STAGES.map((stage) => ({ stage, count: 0, value: 0 }));
  for (const o of opps.data ?? []) {
    const row = byStage.find((s) => s.stage === o.stage);
    if (row) {
      row.count += 1;
      row.value += Number(o.value_rm);
    }
  }
  const open = byStage.filter((s) => OPEN_STAGES.includes(s.stage));
  return {
    totalContacts: all.count ?? 0,
    newContacts30d: recent.count ?? 0,
    openOpportunities: open.reduce((n, s) => n + s.count, 0),
    openValue: open.reduce((n, s) => n + s.value, 0),
    totalValue: byStage.reduce((n, s) => n + s.value, 0),
    wonValue: byStage.find((s) => s.stage === "won")!.value,
    byStage,
  };
}
