"use client";

import { useActionState, useState, useTransition } from "react";
import { FormFooter, Field, IconButton, Modal, inputClass } from "@/components/crm/form";
import { Icon } from "@/components/ui/glass";
import { deleteContact, saveContact } from "@/lib/crm/actions";
import { CONTACT_STATUSES, STATUS_META, type Contact, type FormState } from "@/lib/crm/types";

const INITIAL: FormState = { ok: false };

function ContactForm({ contact, onDone }: { contact?: Contact; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await saveContact(prev, fd);
    if (result.ok) onDone();
    return result;
  }, INITIAL);
  const e = state.errors ?? {};
  const v = state.values ?? {}; // re-fill after a failed submit (React resets the form)

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <Field label="Name *" error={e.name}>
        <input name="name" defaultValue={v.name ?? contact?.name} autoFocus required className={inputClass} placeholder="e.g. Aisyah Rahman" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email" error={e.email}>
          <input name="email" type="email" defaultValue={v.email ?? contact?.email ?? ""} className={inputClass} placeholder="name@company.my" />
        </Field>
        <Field label="Phone" error={e.phone}>
          <input name="phone" type="tel" defaultValue={v.phone ?? contact?.phone ?? ""} className={inputClass} placeholder="+60 12-345 6789" />
        </Field>
      </div>
      <Field label="Company" error={e.company}>
        <input name="company" defaultValue={v.company ?? contact?.company ?? ""} className={inputClass} placeholder="Leave blank for individuals" />
      </Field>
      <Field label="Status" error={e.status}>
        <select name="status" defaultValue={v.status ?? contact?.status ?? "lead"} className={inputClass}>
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-ink-800">
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </Field>
      <FormFooter onCancel={onDone} submitLabel={contact ? "Save changes" : "Create contact"} message={state.message && !state.ok ? state.message : undefined} />
    </form>
  );
}

export function NewContactButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-glow flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
        <Icon name="add" className="text-[18px]" /> New contact
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New contact">
        <ContactForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function ContactRowActions({ contact, opportunityCount }: { contact: Contact; opportunityCount: number }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const extra = opportunityCount ? ` and their ${opportunityCount} opportunit${opportunityCount === 1 ? "y" : "ies"}` : "";
    if (!confirm(`Delete ${contact.name}${extra}? This can't be undone.`)) return;
    startTransition(async () => {
      const r = await deleteContact(contact.id);
      if (!r.ok) alert(r.message);
    });
  }

  return (
    <div className="flex justify-end gap-0.5">
      <IconButton icon="edit" label={`Edit ${contact.name}`} onClick={() => setEditing(true)} />
      <IconButton icon="delete" label={`Delete ${contact.name}`} onClick={onDelete} danger disabled={pending} />
      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${contact.name}`}>
        <ContactForm contact={contact} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
