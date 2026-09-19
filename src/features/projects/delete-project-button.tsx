"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { deleteProjectAction } from "./actions";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    // Remocao e irreversivel: exige digitar o slug/nome antes de apagar.
    const typed = window.prompt(
      `Isso apaga "${projectName}" e todo o historico de status. Digite o nome para confirmar:`,
    );
    if (typed !== projectName) {
      if (typed !== null) toast.error("Nome nao confere, nada foi apagado.");
      return;
    }

    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (!result.ok) {
        toast.error(result.error ?? "Falha ao remover");
        return;
      }
      toast.success("Projeto removido");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removendo..." : "Remover"}
    </Button>
  );
}
