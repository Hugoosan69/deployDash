"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

import { deleteProjectAction } from "./actions";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (!result.ok) {
        toast.error(result.error ?? "Falha ao remover");
        return;
      }
      setOpen(false);
      toast.success("Projeto removido");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" />
        Remover
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={remove}
        title={`Remover ${projectName}?`}
        description="Isso apaga o projeto, todo o historico de status e os segredos guardados nele. Nao da para desfazer."
        confirmLabel="Remover projeto"
        confirmPhrase={projectName}
        variant="danger"
        pending={pending}
      />
    </>
  );
}
