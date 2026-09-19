# DeployDash

Dashboard central para acompanhar projetos web espalhados por varias contas Vercel e Supabase:
status, URLs, credenciais cifradas e vencimento de licenca em um lugar so.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres + Auth) ·
Zod + React Hook Form · AES-256-GCM via `node:crypto`.

## Estrutura

```
database/00_core        extensoes, allowlist de acesso, helpers
database/01_projects    projects, vercel_accounts, supabase_accounts
database/02_monitoring  project_status_logs
database/03_licenses    license_alerts
database/04_audit       audit_logs
src/features/projects   servico de dominio + UI dos projetos
src/features/monitoring health check e historico de status
src/features/licenses   estado da licenca e avisos
src/lib                 crypto, env, auth, audit, integracoes externas
src/schemas             schemas Zod (form e Server Action usam o mesmo)
```

As pastas de `database/` sao aplicadas em ordem numerica: toda FK aponta para tras.

## Setup

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha.
   A chave de criptografia sai de:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. No projeto Supabase central, rode os `schema.sql` na ordem das pastas
   (`00_core` → `04_audit`).
4. Libere seu acesso:
   ```sql
   insert into allowed_users (email, label) values ('voce@gmail.com', 'Hugo');
   ```
5. Configure o login com Google (unico metodo de entrada):
   - no Google Cloud Console, crie um OAuth client do tipo *Web application* e
     registre como *Authorized redirect URI*
     `https://<ref>.supabase.co/auth/v1/callback`;
   - no Supabase, em **Authentication > Sign In / Providers > Google**, cole o
     Client ID e o Client Secret e ative o provider;
   - em **Authentication > URL Configuration**, deixe `http://localhost:3000` e a
     URL de producao nas *Redirect URLs*;
   - deixe o signup por e-mail/senha desligado: quem nao esta em `allowed_users`
     e deslogado no proprio `/auth/callback`.
6. `npm run dev`

`/api/health` mostra o que ainda falta configurar — env ausente explica o problema em vez de
devolver 500.

## Monitoramento

O plano Hobby da Vercel roda cron 1x por dia, entao a cadencia real vem do GitHub Actions em
`.github/workflows/check-status.yml`, que bate a cada 10 minutos em
`POST /api/cron/check-status` com `Authorization: Bearer $CRON_SECRET`.

Secrets necessarios no repositorio: `CRON_SECRET` e `DASHBOARD_URL`.

## Seguranca

- Segredos (token Vercel, anon key, `DATABASE_URL`) sao guardados cifrados com AES-256-GCM;
  a chave mestra so existe em variavel de ambiente do servidor.
- Nenhuma listagem devolve segredo: a UI recebe apenas `has_*`.
- Revelar uma credencial e uma acao explicita, uma por vez, registrada em `audit_logs`.
- Escrita sensivel passa por Server Action que valida a sessao e a allowlist;
  o RLS e a ultima linha de defesa, nao o controle principal.
- O login e por Google, entao qualquer pessoa com conta Google consegue se autenticar:
  a allowlist e a unica barreira de autorizacao. Por isso o `/auth/callback` encerra a
  sessao de e-mail nao autorizado e registra `auth.denied` em `audit_logs`.

## Nota sobre o Google Drive

Este projeto vive em `G:\Meu Drive`, que e sincronizado. O `npm install` direto aqui chega a falhar
com `EBADF`, porque o npm apaga e reescreve milhares de arquivos enquanto o Drive sincroniza cada um.
Se acontecer:

1. copie `package.json` para uma pasta em disco local;
2. rode o `npm install` la (leva segundos em vez de dezenas de minutos);
3. traga o resultado com `robocopy <local>/node_modules <projeto>/node_modules /E`.

`npm run build` e `npm run typecheck` rodam normalmente depois disso.
