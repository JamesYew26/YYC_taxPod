import Link from "next/link";
import { Suspense } from "react";
import { NewContactButton } from "@/app/contacts/ContactControls";
import { ActivityItem } from "@/components/crm/ActivityItem";
import { CardHeader, GlassCard, Icon, IconTile, Pill, type PillTone } from "@/components/ui/glass";
import { getDashboardStats, listActivities } from "@/lib/crm/queries";
import { STAGE_META, formatRM, type Stage } from "@/lib/crm/types";
import { SUGGESTED_QUESTIONS } from "@/lib/rag/suggestions";

const STAGE_BAR: Partial<Record<Stage, string>> = {
  won: "bg-gradient-to-r from-teal to-teal-soft",
  lost: "bg-white/15",
};

export default function Dashboard() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 lg:p-6">
      {/* Greeting */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-fg-muted">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Your <span className="text-gradient">client pipeline</span> at a glance
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ask"
            className="glass flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-white/10"
          >
            <Icon name="auto_awesome" className="text-[18px] text-violet-soft" /> Ask Tax AI
          </Link>
          <NewContactButton />
        </div>
      </section>

      {/* Live CRM numbers: read from Supabase at request time, so inside Suspense (cacheComponents). */}
      <Suspense fallback={<DashboardSkeleton />}>
        <LiveDashboard />
      </Suspense>

      {/* Ask Tax AI */}
      <GlassCard className="relative overflow-hidden p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet/30 blur-3xl"
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <IconTile name="auto_awesome" tone="violet" />
            <div>
              <h2 className="text-lg font-semibold">Ask Tax AI</h2>
              <p className="text-sm text-fg-muted">
                Answers come only from LHDN rulings and JKDM guides, with the page each fact came from.
              </p>
            </div>
          </div>

          <form action="/ask" className="glass-strong flex items-center gap-2 rounded-2xl p-1.5 pl-4 focus-within:ring-1 focus-within:ring-violet/50">
            <Icon name="search" className="text-[20px] text-fg-muted" />
            <input
              name="q"
              type="text"
              aria-label="Ask a tax question"
              placeholder="Ask about Malaysian tax law…"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <button className="btn-glow flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-white">
              Ask <Icon name="arrow_upward" className="text-[18px]" />
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <Link
                key={q}
                href={`/ask?q=${encodeURIComponent(q)}`}
                className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-fg-muted ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-fg"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

async function LiveDashboard() {
  const [stats, activities] = await Promise.all([getDashboardStats(), listActivities(6)]);
  const maxValue = Math.max(1, ...stats.byStage.map((s) => s.value));
  const totalDeals = stats.byStage.reduce((n, s) => n + s.count, 0);

  const kpis: { label: string; value: string; badge: string; note: string; icon: string; tone: "teal" | "violet"; href: string }[] = [
    {
      label: "Total contacts",
      value: stats.totalContacts.toLocaleString("en-MY"),
      badge: `+${stats.newContacts30d}`,
      note: "added in last 30 days",
      icon: "group",
      tone: "violet",
      href: "/contacts",
    },
    {
      label: "Open opportunities",
      value: stats.openOpportunities.toLocaleString("en-MY"),
      badge: `${totalDeals} total`,
      note: "New → Proposal",
      icon: "work",
      tone: "teal",
      href: "/pipeline",
    },
    {
      label: "Open pipeline value",
      value: formatRM(stats.openValue),
      badge: "open",
      note: "not yet won or lost",
      icon: "trending_up",
      tone: "violet",
      href: "/pipeline",
    },
    {
      label: "Total opportunities value",
      value: formatRM(stats.totalValue),
      badge: `${formatRM(stats.wonValue)} won`,
      note: "all stages",
      icon: "payments",
      tone: "teal",
      href: "/pipeline",
    },
  ];

  return (
    <>
      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="glass rounded-2xl p-5 transition-colors hover:bg-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-fg-muted">{k.label}</span>
              <IconTile name={k.icon} tone={k.tone} />
            </div>
            <div className="mt-3 font-mono text-2xl font-medium tabular-nums tracking-tight">{k.value}</div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Pill tone={k.tone as PillTone}>{k.badge}</Pill>
              <span className="text-fg-subtle">{k.note}</span>
            </div>
          </Link>
        ))}
      </section>

      {/* Pipeline + activity */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <GlassCard className="lg:col-span-7">
          <CardHeader
            title="Pipeline by stage"
            subtitle={`${totalDeals} deals · value in RM`}
            right={
              <Link href="/pipeline" className="text-xs font-medium text-teal-soft hover:underline">
                View board →
              </Link>
            }
          />
          <ul className="flex flex-col gap-4 p-5">
            {stats.byStage.map((s) => (
              <li key={s.stage}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className={s.stage === "lost" ? "text-fg-subtle" : "text-fg"}>
                    {STAGE_META[s.stage].label}
                    <span className="ml-2 text-xs text-fg-subtle">
                      {s.count} deal{s.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-fg-muted">{formatRM(s.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={"h-full rounded-full " + (STAGE_BAR[s.stage] ?? "bg-gradient-to-r from-violet to-teal")}
                    style={{ width: `${(s.value / maxValue) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="lg:col-span-5">
          <CardHeader
            title="Recent activity"
            subtitle="Calls, emails, meetings and stage changes"
            right={
              <Link href="/activities" className="text-xs font-medium text-teal-soft hover:underline">
                All →
              </Link>
            }
          />
          {activities.length === 0 ? (
            <p className="p-5 text-sm text-fg-muted">No activity yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 p-3">
              {activities.map((a) => (
                <ActivityItem key={a.id} activity={a} />
              ))}
            </ul>
          )}
        </GlassCard>
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass h-[132px] animate-pulse rounded-2xl" />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="glass h-80 animate-pulse rounded-2xl lg:col-span-7" />
        <div className="glass h-80 animate-pulse rounded-2xl lg:col-span-5" />
      </section>
    </>
  );
}
