import { Suspense } from "react";
import { ActivityItem } from "@/components/crm/ActivityItem";
import { GlassCard, Icon } from "@/components/ui/glass";
import { listActivities, listContactOptions, listOpportunities } from "@/lib/crm/queries";
import { DeleteActivityButton, LogActivityButton } from "./ActivityControls";

export const metadata = { title: "Activities · YYC taxPod" };

export default function ActivitiesPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 lg:p-6">
      <Suspense fallback={<GlassCard className="h-96 animate-pulse">{null}</GlassCard>}>
        <ActivityLog />
      </Suspense>
    </div>
  );
}

async function ActivityLog() {
  const [activities, contacts, opportunities] = await Promise.all([
    listActivities(100),
    listContactOptions(),
    listOpportunities(),
  ]);
  const oppOptions = opportunities.map((o) => ({ id: o.id, title: o.title, contact_id: o.contact_id }));

  return (
    <>
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-fg-muted">Activities</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Calls, emails <span className="text-gradient">&amp; meetings</span>
          </h1>
          <p className="mt-2 text-sm text-fg-muted">Stage changes on the pipeline are logged here automatically as notes.</p>
        </div>
        <LogActivityButton contacts={contacts} opportunities={oppOptions} />
      </section>

      <GlassCard>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Icon name="history" className="text-[32px] text-fg-subtle" />
            <p className="text-sm text-fg-muted">No activities yet. Log your first call or meeting.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1 p-3">
            {activities.map((a) => (
              <ActivityItem key={a.id} activity={a} actions={<DeleteActivityButton id={a.id} />} />
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
