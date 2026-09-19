"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { RevealableField } from "@/schemas/project";

import { revealSecretAction } from "./actions";

/** Depois de revelado, o segredo some sozinho da tela. */
const AUTO_HIDE_MS = 30_000;

/**
 * Revelar credencial e acao explicita: um campo por vez, com confirmacao
 * e registro em audit_logs feito no servidor.
 */
export function SecretReveal({
  projectId,
  field,
  label,
  available,
}: {
  projectId: string;
  field: RevealableField;
  label: string;
  available: boolean;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => setValue(null), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  function reveal() {
    startTransition(async () => {
      const result = await revealSecretAction(projectId, field);
      if (!result.ok || !result.value) {
        toast.error(result.error ?? "Falha ao revelar");
        return;
      }
      setConfirming(false);
      setValue(result.value);
    });
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("O navegador bloqueou a copia");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-zinc-300">{label}</p>
        <p
          className={
            value
              ? "truncate font-mono text-xs text-emerald-300"
              : "truncate font-mono text-xs text-zinc-500"
          }
        >
          {!available ? "nao cadastrado" : (value ?? "••••••••••••")}
        </p>
      </div>

      {available ? (
        <div className="flex shrink-0 items-center gap-1">
          {value ? (
            <>
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setValue(null)}>
                <EyeOff className="h-3.5 w-3.5" />
                Ocultar
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={pending}
            >
              <Eye className="h-3.5 w-3.5" />
              Revelar
            </Button>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={reveal}
        title={`Revelar ${label}?`}
        description={
          <>
            O valor aparece na tela e some sozinho em 30 segundos. A leitura fica
            registrada em <span className="font-mono">audit_logs</span> com o seu
            e-mail e o horario.
          </>
        }
        confirmLabel="Revelar"
        pending={pending}
      />
    </div>
  );
}
