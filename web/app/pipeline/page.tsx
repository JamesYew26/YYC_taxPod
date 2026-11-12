import { Suspense } from "react";
import { GlassCard, Pill, cx } from "@/components/ui/glass";
import { listContactOptions, listOpportunities } from "@/lib/crm/queries";
import { OPEN_STAGES, STAGES, STAGE_META, formatRM } from "@/lib/crm/types";
import { NewOpportunityButton, OpportunityCard } from "./PipelineControls";

export const metadata = { title: "Pipeline · YYC taxPod" };

export default function PipelinePage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <Suspense fallback={<GlassCard className="h-[480px] animate-pulse">{null}</GlassCard>}>
        <Board />
      </Suspense>
    </div>
  );
}

async function Board() {
  const [opportunities, contacts] = await Promise.all([listOpportunities(), listContactOptions()]);
  const openValue = opportunities.filter((o) => OPEN_STAGES.includes(o.stage)).reduce((n, o) => n + o.value_rm, 0);

  return (
    <>
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-fg-muted">Pipeline</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="text-gradient">{formatRM(openValue)}</span> in open deals
          </h1>
        </div>
        <NewOpportunityButton contacts={contacts} />
      </section>

      {/* Kanban: one column per stage, horizontally scrollable on small screens. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        {/* Fixed-width columns (15rem) that scroll sideways, rather than squeezing six columns into the viewport. */}
        <div className="grid w-max auto-cols-[15rem] grid-flow-col gap-3 2xl:w-full 2xl:auto-cols-fr">
          {STAGES.map((stage) => {
            const items = opportunities.filter((o) => o.stage === stage);
            const total = items.reduce((n, o) => n + o.value_rm, 0);
            return (
              <section
                key={stage}
                aria-label={`${STAGE_META[stage].label} stage`}
                className={cx("glass flex min-h-[360px] flex-col rounded-2xl", stage === "lost" && "opacity-75")}
              >
                <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Pill tone={STAGE_META[stage].tone}>{STAGE_META[stage].label}</Pill>
                    <span className="text-xs text-fg-subtle">{items.length}</span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-fg-muted">{formatRM(total)}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {items.length === 0 ? (
                    <p className="p-3 text-center text-xs text-fg-subtle">No deals</p>
                  ) : (
                    items.map((o) => <OpportunityCard key={o.id} opportunity={o} contacts={contacts} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
