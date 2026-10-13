"use client";

import { Loader2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Modal } from "@/components/ui/modal";
import { useCreateLead } from "@/lib/queries";

interface AddLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

const fieldClass =
  "mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none aria-invalid:border-rose-400";

export function AddLeadDialog({ open, onClose, onCreated }: AddLeadDialogProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="add-lead-title" className="[--modal-width:28rem]">
      <AddLeadForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  );
}

// Mounted only while the dialog is open, so every open starts with a clean form.
function AddLeadForm({ onClose, onCreated }: Omit<AddLeadDialogProps, "open">) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const createLead = useCreateLead();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }
    createLead.mutate(
      { name: name.trim(), company: company.trim() || null, phone: phone.trim() || null },
      {
        onSuccess: (lead) => {
          onCreated(lead.id);
          onClose();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id="add-lead-title" className="text-xl font-semibold text-slate-900">
          Add New Lead
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="space-y-4 px-5 py-5">
        <div>
          <label htmlFor="lead-name" className="text-sm font-medium text-slate-700">
            Full Name <span className="text-rose-600">*</span>
          </label>
          <input
            id="lead-name"
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) setNameError(null);
            }}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "lead-name-error" : undefined}
            maxLength={120}
            placeholder="e.g., John Doe"
            className={fieldClass}
          />
          {nameError && (
            <p id="lead-name-error" className="mt-1 text-xs text-rose-600">
              {nameError}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="lead-company" className="text-sm font-medium text-slate-700">
            Company <span className="font-normal text-slate-400">(Optional)</span>
          </label>
          <input
            id="lead-company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            maxLength={120}
            placeholder="e.g., Stark Industries"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="lead-phone" className="text-sm font-medium text-slate-700">
            Phone <span className="font-normal text-slate-400">(Optional)</span>
          </label>
          <input
            id="lead-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={40}
            placeholder="e.g., 555-0123"
            className={fieldClass}
          />
        </div>
        {createLead.error && (
          <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {createLead.error.message}
          </p>
        )}
      </div>

      <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createLead.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {createLead.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Save Lead
        </button>
      </footer>
    </form>
  );
}
