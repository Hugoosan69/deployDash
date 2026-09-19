# Cliente de licenca — Next.js

Dois arquivos para copiar no site que sera licenciado:

| arquivo | destino sugerido |
|---|---|
| `license-guard.ts` | `src/lib/license-guard.ts` |
| `license-gate.tsx` | `src/components/license-gate.tsx` |

## Instalacao

1. Copie os dois arquivos (ajuste o import do gate para o caminho do guard).
2. No layout raiz:

```tsx
import { LicenseGate } from "@/components/license-gate";

export default async function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <LicenseGate contato="suporte@exemplo.com">{children}</LicenseGate>
      </body>
    </html>
  );
}
```

3. Variavel de ambiente do site, na Vercel (tipo *sensitive*):

```
LICENSE_KEY=dd_live_...
```

Nao existe dependencia nova: assinatura e verificada com `node:crypto`.

## Comportamento

| estado no DeployDash | o que o site faz |
|---|---|
| ativa | nada |
| vencida, dentro da tolerancia | faixa amarela no topo |
| vencida, passada a tolerancia | tela de bloqueio |
| revogada | tela de bloqueio |
| DeployDash fora do ar | usa a ultima resposta valida por ate 72h; depois libera |
| `LICENSE_KEY` ausente | libera, com aviso no log do servidor |

A consulta acontece no maximo de 12 em 12 horas por instancia. Revogar uma
licenca vale, na pratica, em ate 12 horas.

## O que isso nao e

Nao e protecao contra copia. Se o cliente tem o codigo e controla o deploy, ele
remove o `LicenseGate` em cinco minutos. A validacao serve para site hospedado
em conta que voce controla — ali ela e efetiva — e, fora disso, como atrito e
registro de contato, nao como barreira.
