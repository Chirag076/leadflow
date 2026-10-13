"use client";

import { Loader2 } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { localInputsToIso, toDateInput, tomorrow, whenPhrase } from "@/lib/dates";
import { useAddDiscussion } from "@/lib/queries";
import type { LeadDetail } from "@/lib/types";

interface DiscussionFormProps {
  lead: LeadDetail;
  now: Date;
}

const inputClass =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export function DiscussionForm({ lead, now }: DiscussionFormProps) {
  const ids = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [withFollowUp, setWithFollowUp] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [formError, setFormError] = useState<string | null>(null);
  const addDiscussion = useAddDiscussion(lead.id);

  const toggleFollowUp = (checked: boolean) => {
    setWithFollowUp(checked);
    if (checked && !date) setDate(toDateInput(tomorrow(now)));
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (addDiscussion.isPending) return;
    if (!body.trim()) {
      setFormError("Write what was discussed first.");
      textRef.current?.focus();
      return;
    }
    let followUpAt: string | null = null;
    if (withFollowUp) {
      if (!date) return setFormError("Pick a date for the follow-up.");
      followUpAt = localInputsToIso(date, time);
      if (new Date(followUpAt) < new Date()) return setFormError("The follow-up has to be in the future.");
    }
    setFormError(null);
    addDiscussion.mutate(
      { body: body.trim(), follow_up_at: followUpAt },
      {
        onSuccess: () => {
          setBody("");
          setWithFollowUp(false);
          setDate("");
          setTime("10:00");
          textRef.current?.focus();
        },
      },
    );
  };

  const error = formError ?? addDiscussion.error?.message ?? null;
  const pendingFollowUp = lead.follow_up_at;

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <label htmlFor={`${ids}-body`} className="sr-only">
        New discussion note
      </label>
      <textarea
        id={`${ids}-body`}
        ref={textRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
        }}
        rows={3}
        maxLength={5000}
        placeholder="Log a new discussion…"
        className="block w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Follow-up</legend>
          <label className="mr-1 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={withFollowUp}
              onChange={(event) => toggleFollowUp(event.target.checked)}
              className="size-4 rounded border-slate-300 accent-blue-600"
            />
            Set Follow-up
          </label>
          <input
            type="date"
            aria-label="Follow-up date"
            value={date}
            min={toDateInput(now)}
            disabled={!withFollowUp}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            aria-label="Follow-up time"
            value={time}
            disabled={!withFollowUp}
            onChange={(event) => setTime(event.target.value)}
            className={inputClass}
          />
        </fieldset>
        <button
          type="submit"
          disabled={addDiscussion.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
        >
          {addDiscussion.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Save Note
        </button>
      </div>

      <div aria-live="polite" className="min-h-4 text-xs">
        {error ? (
          <p className="text-rose-600">{error}</p>
        ) : pendingFollowUp ? (
          <p className="text-slate-500">
            {withFollowUp ? "Replaces" : "Saving completes"} the follow-up due {whenPhrase(pendingFollowUp, now)}.
          </p>
        ) : (
          <p className="text-slate-400">Ctrl + Enter to save.</p>
        )}
      </div>
    </form>
  );
}
