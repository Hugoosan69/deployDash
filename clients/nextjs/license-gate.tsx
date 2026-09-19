import type { ReactNode } from "react";

import { getLicenseState, shouldBlock, shouldWarn } from "./license-guard";

/**
 * Envolve o conteudo do site cliente. Copie junto com license-guard.ts e use
 * no layout raiz:
 *
 *   export default async function RootLayout({ children }) {
 *     return (
 *       <html lang="pt-BR">
 *         <body>
 *           <LicenseGate>{children}</LicenseGate>
 *         </body>
 *       </html>
 *     );
 *   }
 *
 * Vencida dentro da tolerancia: faixa no topo, site funcionando.
 * Passada a tolerancia: tela de bloqueio.
 */
export async function LicenseGate({
  children,
  contato = "o suporte",
}: {
  children: ReactNode;
  contato?: string;
}) {
  const state = await getLicenseState();

  if (shouldBlock(state)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            Site temporariamente indisponivel
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#a1a1aa", lineHeight: 1.6 }}>
            A licenca deste site expirou. Entre em contato com {contato} para
            reativar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {shouldWarn(state) ? (
        <div
          role="status"
          style={{
            background: "#78350f",
            color: "#fef3c7",
            padding: "0.625rem 1rem",
            fontSize: "0.875rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          A licenca deste site venceu
          {state.expiresAt
            ? ` em ${new Date(state.expiresAt).toLocaleDateString("pt-BR")}`
            : ""}
          . Regularize para evitar a suspensao
          {state.graceUntil
            ? ` em ${new Date(state.graceUntil).toLocaleDateString("pt-BR")}`
            : ""}
          .
        </div>
      ) : null}
      {children}
    </>
  );
}
