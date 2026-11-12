import type { ReactNode } from "react";
import { Icon, Pill } from "@/components/ui/glass";
import { ACTIVITY_META, timeAgo, type Activity } from "@/lib/crm/types";

/** One row of an activity feed (used on the dashboard and the Activities page). */
export function ActivityItem({ activity: a, actions }: { activity: Activity; actions?: ReactNode }) {
  const meta = ACTIVITY_META[a.type];
  return (
    <li className="flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-inset ring-white/10">
        <Icon name={meta.icon} className="text-[18px] text-fg-muted" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{a.contact?.name ?? a.opportunity?.title ?? "—"}</span>
          <span className="flex shrink-0 items-center gap-1">
            <time dateTime={a.occurred_at} title={new Date(a.occurred_at).toLocaleString("en-MY")} className="text-xs text-fg-subtle">
              {timeAgo(a.occurred_at)}
            </time>
            {actions}
          </span>
        </div>
        <div className="truncate text-xs text-fg-subtle">
          {[a.contact?.company, a.opportunity?.title].filter(Boolean).join(" · ") || "Individual"}
        </div>
        <p className="mt-1 text-sm text-fg-muted">{a.description}</p>
        <div className="mt-1.5">
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </div>
      </div>
    </li>
  );
}
