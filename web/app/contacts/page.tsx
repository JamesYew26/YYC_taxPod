import Link from "next/link";
import { Suspense } from "react";
import { GlassCard, Icon, Pill, cx } from "@/components/ui/glass";
import { listContacts } from "@/lib/crm/queries";
import { CONTACT_STATUSES, STATUS_META, timeAgo, type ContactStatus } from "@/lib/crm/types";
import { ContactRowActions, NewContactButton } from "./ContactControls";

export const metadata = { title: "Contacts · YYC taxPod" };

export default function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 lg:p-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-fg-muted">Contacts</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Leads, prospects <span className="text-gradient">&amp; customers</span>
          </h1>
        </div>
        <NewContactButton />
      </section>

      {/* Reads search params + the database at request time → must sit inside Suspense (cacheComponents). */}
      <Suspense fallback={<GlassCard className="h-96 animate-pulse">{null}</GlassCard>}>
        <ContactsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ContactsList({ searchParams }: { searchParams: PageProps<"/contacts">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = CONTACT_STATUSES.includes(sp.status as ContactStatus) ? (sp.status as ContactStatus) : undefined;
  const contacts = await listContacts({ q, status });

  const href = (s?: ContactStatus) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("status", s);
    const qs = p.toString();
    return qs ? `/contacts?${qs}` : "/contacts";
  };

  return (
    <GlassCard>
      {/* Filters: plain GET form + links, so they work without JavaScript and are shareable URLs. */}
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
        <form action="/contacts" className="flex flex-1 items-center gap-2 md:max-w-sm">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-inset ring-white/10 focus-within:ring-teal/50">
            <Icon name="search" className="text-[18px] text-fg-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, email, company, phone"
              aria-label="Search contacts"
              className="w-full bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
        </form>
        <nav className="flex flex-wrap gap-1.5" aria-label="Filter by status">
          {[undefined, ...CONTACT_STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={href(s)}
              aria-current={status === s ? "page" : undefined}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                status === s
                  ? "bg-teal/15 text-teal-soft ring-teal/40"
                  : "bg-white/5 text-fg-muted ring-white/10 hover:bg-white/10 hover:text-fg",
              )}
            >
              {s ? STATUS_META[s].label : "All"}
            </Link>
          ))}
        </nav>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-12 text-center">
          <Icon name="person_search" className="text-[32px] text-fg-subtle" />
          <p className="text-sm text-fg-muted">
            {q || status ? "No contacts match these filters." : "No contacts yet. Create your first one."}
          </p>
          {(q || status) && (
            <Link href="/contacts" className="text-xs font-medium text-teal-soft hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Email / phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Deals</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-fg">{c.name}</td>
                  <td className="px-4 py-3 text-fg-muted">{c.company ?? <span className="text-fg-subtle">Individual</span>}</td>
                  <td className="px-4 py-3">
                    <div className="text-fg-muted">{c.email ?? "—"}</div>
                    <div className="font-mono text-xs text-fg-subtle">{c.phone ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={STATUS_META[c.status].tone}>{STATUS_META[c.status].label}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-fg-muted">{c.opportunity_count}</td>
                  <td className="px-4 py-3 text-xs text-fg-subtle">{timeAgo(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <ContactRowActions contact={c} opportunityCount={c.opportunity_count} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-white/10 px-4 py-3 text-xs text-fg-subtle">
        {contacts.length} contact{contacts.length === 1 ? "" : "s"}
        {q && <> matching “{q}”</>}
        {status && <> · {STATUS_META[status].label}</>}
      </p>
    </GlassCard>
  );
}
