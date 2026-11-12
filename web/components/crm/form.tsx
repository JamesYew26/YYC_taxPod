"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Icon, cx } from "@/components/ui/glass";

export const inputClass =
  "w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-fg ring-1 ring-inset ring-white/10 placeholder:text-fg-subtle focus:outline-none focus:ring-teal/50";

/** Native <dialog> modal: focus trapping, Esc to close and a backdrop come from the browser. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() focuses the first focusable element (the Close button), overriding React's
      // autoFocus. Move focus to the first form field instead so typing goes where users expect.
      d.querySelector<HTMLElement>("form input:not([type=hidden]), form select, form textarea")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // click on backdrop
      className="glass-strong m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl !bg-ink-800/95 p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-fg-muted hover:bg-white/10 hover:text-fg">
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>
      <div className="p-5">{open && children}</div>
    </dialog>
  );
}

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-rose">{error}</span>
      ) : (
        hint && <span className="text-xs text-fg-subtle">{hint}</span>
      )}
    </label>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-glow flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormFooter({ onCancel, submitLabel, message }: { onCancel: () => void; submitLabel: string; message?: string }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="text-xs text-rose">{message}</span>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="glass rounded-xl px-4 py-2 text-sm text-fg-muted hover:bg-white/10 hover:text-fg">
          Cancel
        </button>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </div>
  );
}

/** Small icon button for row actions (edit / delete). */
export function IconButton({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        "rounded-lg p-1.5 text-fg-subtle transition-colors disabled:opacity-40",
        danger ? "hover:bg-rose/15 hover:text-rose" : "hover:bg-white/10 hover:text-fg",
      )}
    >
      <Icon name={icon} className="text-[18px]" />
    </button>
  );
}
