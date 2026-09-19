"use client";

import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { RevealableField } from "@/schemas/project";

import { revealSecretAction } from "./actions";

/**
 * Revelar credencial e acao explicita: um campo por vez, com confirmacao,
 * e cada revelacao vira uma linha em audit_logs no servidor.
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
  const [pending, startTransition] = useTransition();

  function reveal() {
    const confirmed = window.confirm(
      `Revelar "${label}"? A acao fica registrada na auditoria.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await revealSecretAction(projectId, field);
      if (!result.ok || !result.value) {
        toast.error(result.error ?? "Falha ao revelar");
        return;
      }
      setValue(result.value);
    });
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado");
    } catch {
      toast.error("O navegador bloqueou a copia");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-zinc-300">{label}</p>
        <p className="truncate font-mono text-xs text-zinc-500">
          {!available ? "nao cadastrado" : (value ?? "••••••••••••")}
        </p>
      </div>

      {available ? (
        <div className="flex shrink-0 items-center gap-1">
          {value ? (
            <>
              <Button variant="ghost" size="sm" onClick={copy}>
                <Copy className="h-3.5 w-3.5" />
                Copiar
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
              onClick={reveal}
              disabled={pending}
            >
              <Eye className="h-3.5 w-3.5" />
              {pending ? "..." : "Revelar"}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
