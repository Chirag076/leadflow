"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

/**
 * A native <dialog> opened with showModal(): the browser handles focus trapping, Escape
 * and making the page behind inert. Clicking the dimmed backdrop closes it too.
 */
export function Modal({ open, onClose, labelledBy, className = "", children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault(); // let React state drive closing
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // the click landed on the backdrop
      }}
      className={`m-auto w-[min(100%-2rem,var(--modal-width,32rem))] overflow-hidden rounded-xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-[2px] ${className}`}
    >
      {open && children}
    </dialog>
  );
}
