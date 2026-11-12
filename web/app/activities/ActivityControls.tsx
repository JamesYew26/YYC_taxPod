"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { FormFooter, Field, IconButton, Modal, inputClass } from "@/components/crm/form";
import { Icon } from "@/components/ui/glass";
import { createActivity, deleteActivity } from "@/lib/crm/actions";
import { ACTIVITY_META, ACTIVITY_TYPES, type ContactOption, type FormState } from "@/lib/crm/types";

const INITIAL: FormState = { ok: false };

type OpportunityOption = { id: number; title: string; contact_id: number };

/** A date formatted for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(iso: string | Date) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
const nowLocal = () => toLocalInput(new Date());

function ActivityForm({
  contacts,
  opportunities,
  onDone,
}: {
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  onDone: () => void;
}) {
  const [contactId, setContactId] = useState("");
  const [state, action] = useActionState(async (prev: FormState, fd: FormData) => {
    // datetime-local has no timezone: convert to ISO in the browser so the server stores the right instant.
    const local = String(fd.get("occurred_at") ?? "");
    if (local) fd.set("occurred_at", new Date(local).toISOString());
    const result = await createActivity(prev, fd);
    if (result.ok) onDone();
    return result;
  }, INITIAL);
  const e = state.errors ?? {};
  const v = state.values ?? {}; // re-fill after a failed submit (React resets the form)

  // Narrow the opportunity list to the chosen contact.
  const opps = useMemo(
    () => (contactId ? opportunities.filter((o) => o.contact_id === Number(contactId)) : opportunities),
    [contactId, opportunities],
  );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type *" error={e.type}>
          <select name="type" defaultValue={v.type ?? "call"} className={inputClass}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t} className="bg-ink-800">
                {ACTIVITY_META[t].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date & time *" error={e.occurred_at}>
          <input name="occurred_at" type="datetime-local" defaultValue={v.occurred_at ? toLocalInput(v.occurred_at) : nowLocal()} className={inputClass} />
        </Field>
      </div>
      <Field label="Contact" error={e.contact_id} hint="Link to a contact, an opportunity, or both">
        <select name="contact_id" value={contactId} onChange={(ev) => setContactId(ev.target.value)} className={inputClass}>
          <option value="" className="bg-ink-800">—</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink-800">
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Opportunity">
        <select name="opportunity_id" defaultValue={v.opportunity_id ?? ""} className={inputClass} key={contactId}>
          <option value="" className="bg-ink-800">—</option>
          {opps.map((o) => (
            <option key={o.id} value={o.id} className="bg-ink-800">
              {o.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description *" error={e.description}>
        <textarea name="description" rows={3} defaultValue={v.description} className={inputClass} placeholder="What happened? Next steps?" />
      </Field>
      <FormFooter onCancel={onDone} submitLabel="Log activity" message={!state.ok ? state.message : undefined} />
    </form>
  );
}

export function LogActivityButton({
  contacts,
  opportunities,
}: {
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-glow flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
        <Icon name="add" className="text-[18px]" /> Log activity
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log activity">
        <ActivityForm contacts={contacts} opportunities={opportunities} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function DeleteActivityButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <IconButton
      icon="delete"
      label="Delete activity"
      danger
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this activity?")) return;
        startTransition(async () => {
          const r = await deleteActivity(id);
          if (!r.ok) alert(r.message);
        });
      }}
    />
  );
}
