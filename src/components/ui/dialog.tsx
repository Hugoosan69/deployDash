"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

/**
 * Dialogo em cima do <dialog> nativo: foco preso, Esc, inertizacao do resto da
 * pagina e semantica de modal vem do navegador, sem biblioteca nova. O que
 * escrevemos aqui e so a aparencia e o fluxo de confirmar/cancelar.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Esc dispara "cancel"; clique no backdrop cai no proprio <dialog>.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-zinc-800 bg-zinc-900 p-0 text-zinc-100 shadow-2xl",
        "backdrop:bg-black/70 backdrop:backdrop-blur-sm",
      )}
    >
      <div className="p-5">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <div id={descriptionId} className="mt-1 text-sm text-zinc-400">
            {description}
          </div>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
      {footer ? (
        <div className="flex justify-end gap-2 border-t border-zinc-800 p-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * Confirmacao de acao sensivel. Com `confirmPhrase`, exige digitar exatamente
 * aquele texto — usado no que e irreversivel, para o clique nao ser reflexo.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  confirmPhrase,
  variant = "default",
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  confirmPhrase?: string;
  variant?: "default" | "danger";
  pending?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const inputId = useId();

  // Limpa ao fechar em vez de reagir a `open` num efeito: o texto digitado nao
  // pode sobreviver para a proxima abertura do dialogo.
  function close() {
    setTyped("");
    onClose();
  }

  const blocked = Boolean(confirmPhrase) && typed.trim() !== confirmPhrase;

  return (
    <Dialog
      open={open}
      onClose={pending ? () => {} : close}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "default"}
            onClick={onConfirm}
            disabled={blocked || pending}
            autoFocus={!confirmPhrase}
          >
            {pending ? "Aguarde..." : confirmLabel}
          </Button>
        </>
      }
    >
      {confirmPhrase ? (
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>
            Digite <span className="font-mono text-zinc-100">{confirmPhrase}</span>{" "}
            para confirmar
          </Label>
          <Input
            id={inputId}
            value={typed}
            autoFocus
            autoComplete="off"
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !blocked && !pending) onConfirm();
            }}
          />
        </div>
      ) : null}
    </Dialog>
  );
}
