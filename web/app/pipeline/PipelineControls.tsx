"use client";

import { useActionState, useState, useTransition } from "react";
import { FormFooter, Field, IconButton, Modal, inputClass } from "@/components/crm/form";
import { Icon, cx } from "@/components/ui/glass";
import { deleteOpportunity, moveOpportunity, saveOpportunity } from "@/lib/crm/actions";
import {
  STAGES,
  STAGE_META,
  formatRM,
  type ContactOption,
  type FormState,
  type Opportunity,
  type Stage,
} from "@/lib/crm/types";

const INITIAL: FormState = { ok: false };

function OpportunityForm({
  opportunity,
  contacts,
  defaultStage = "new",
  onDone,
}: {
  opportunity?: Opportunity;
  contacts: ContactOption[];
  defaultStage?: Stage;
  onDone: () => void;
}) {
  const [state, action] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await saveOpportunity(prev, fd);
    if (result.ok) onDone();
    return result;
  }, INITIAL);
  const e = state.errors ?? {};
  const v = state.values ?? {}; // re-fill after a failed submit (React resets the form)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {opportunity && <input type="hidden" name="id" value={opportunity.id} />}
      <Field label="Title *" error={e.title}>
        <input name="title" defaultValue={v.title ?? opportunity?.title} autoFocus className={inputClass} placeholder="e.g. YA 2026 tax compliance" />
      </Field>
      <Field label="Contact *" error={e.contact_id}>
        <select name="contact_id" defaultValue={v.contact_id ?? opportunity?.contact_id ?? ""} className={inputClass}>
          <option value="" className="bg-ink-800">Choose a contact…</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink-800">
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Value (RM) *" error={e.value_rm}>
          <input name="value_rm" inputMode="decimal" defaultValue={v.value_rm ?? opportunity?.value_rm ?? ""} className={inputClass} placeholder="25000" />
        </Field>
        <Field label="Stage" error={e.stage}>
          <select name="stage" defaultValue={v.stage ?? opportunity?.stage ?? defaultStage} className={inputClass}>
            {STAGES.map((s) => (
              <option key={s} value={s} className="bg-ink-800">
                {STAGE_META[s].label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormFooter onCancel={onDone} submitLabel={opportunity ? "Save changes" : "Create opportunity"} message={!state.ok ? state.message : undefined} />
    </form>
  );
}

export function NewOpportunityButton({ contacts }: { contacts: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={contacts.length === 0}
        title={contacts.length === 0 ? "Create a contact first" : undefined}
        className="btn-glow flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Icon name="add" className="text-[18px]" /> New opportunity
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New opportunity">
        <OpportunityForm contacts={contacts} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function OpportunityCard({ opportunity: o, contacts }: { opportunity: Opportunity; contacts: ContactOption[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function move(stage: Stage) {
    startTransition(async () => {
      const r = await moveOpportunity(o.id, stage);
      if (!r.ok) alert(r.message);
    });
  }

  function remove() {
    if (!confirm(`Delete “${o.title}”? This can't be undone.`)) return;
    startTransition(async () => {
      const r = await deleteOpportunity(o.id);
      if (!r.ok) alert(r.message);
    });
  }

  return (
    <article
      className={cx(
        "group rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.07]",
        pending && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug text-fg">{o.title}</h3>
        <div className="-mr-1 -mt-1 flex opacity-60 transition-opacity group-hover:opacity-100">
          <IconButton icon="edit" label={`Edit ${o.title}`} onClick={() => setEditing(true)} />
          <IconButton icon="delete" label={`Delete ${o.title}`} onClick={remove} danger disabled={pending} />
        </div>
      </div>
      <p className="mt-1 truncate text-xs text-fg-muted">
        {o.contact?.name}
        {o.contact?.company ? ` · ${o.contact.company}` : ""}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-sm tabular-nums text-fg">{formatRM(o.value_rm)}</span>
        <select
          value={o.stage}
          onChange={(e) => move(e.target.value as Stage)}
          disabled={pending}
          aria-label={`Move ${o.title} to stage`}
          className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-fg-muted ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-teal/50"
        >
          {STAGES.map((s) => (
            <option key={s} value={s} className="bg-ink-800">
              {STAGE_META[s].label}
            </option>
          ))}
        </select>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit opportunity">
        <OpportunityForm opportunity={o} contacts={contacts} onDone={() => setEditing(false)} />
      </Modal>
    </article>
  );
}
