"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { Button } from "./button";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 animate-[modal-backdrop_160ms_ease-out] bg-black/35 backdrop-blur-[2px]" aria-label={t("common.closeDialog")} onClick={() => onOpenChange(false)} />
      <div className="relative max-h-[92vh] w-full max-w-xl animate-[modal-in_180ms_ease-out] overflow-auto rounded-lg border border-border bg-card shadow-2xl max-sm:mt-auto max-sm:max-h-[94vh] max-sm:rounded-b-none">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onOpenChange(false)} aria-label={t("common.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const t = useT();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2 p-5">
        <Button onClick={() => onOpenChange(false)}>{cancelLabel ?? t("common.cancel")}</Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel ?? t("common.delete")}
        </Button>
      </div>
    </Modal>
  );
}
