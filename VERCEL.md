# Publicação na Vercel

Domínio atual: https://isevagenda.vercel.app

## Arquivos e configuração

Extraia o ZIP e envie o conteúdo da pasta iSev-Agenda para a raiz do repositório. O package.json deve ficar na raiz, junto das pastas app, components, lib, public e vendor. Envie todos os arquivos das pastas, especialmente lib/utils.ts, lib/supabase.ts e lib/session.mjs.

- Framework: Next.js.
- Root Directory: ./
- Node.js: 24.x.
- Instalação e build: padrões do Next.js na Vercel.
- Preserve package.json e package-lock.json juntos.

## Correções incluídas

- Entrada sem versão do package-lock.json corrigida; instalação limpa e build validados.
- Node limitado à versão 24.x.
- Todos os arquivos de lib incluídos; três deles estavam ausentes no upload anterior ao GitHub.
- Remoção de arquivos antigos de Cloudflare/D1 e dependência sem uso.
- Documentação atualizada para o domínio de produção.

O deploy de produção foi concluído na Vercel. O login Google também foi testado no domínio publicado. A alteração do Site URL e da lista de retornos foi feita diretamente no Supabase e não depende de reenviar código.

## Variáveis do agendamento público ainda pendentes

Configure na Vercel conforme .env.example:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- APP_ORIGIN=https://isevagenda.vercel.app
- NEXT_PUBLIC_TURNSTILE_SITE_KEY
- TURNSTILE_SECRET_KEY
- SUPABASE_SECRET_KEY

As duas chaves secretas são somente do servidor: nunca use prefixo NEXT_PUBLIC_ para elas nem envie seus valores ao GitHub. Configure o Turnstile para o domínio publicado. Faça um novo deploy após configurar as variáveis.

Sem essas configurações, a reserva pública falha de forma segura. O painel autenticado não usa essa rota pública para criar agendamentos.

## Banco e entrega

Os SQLs foram mantidos para referência e manutenção. Não reaplique todos indiscriminadamente no banco já instalado. O pacote contém código, não um backup dos dados do Supabase.

Antes de entregar ao cliente, conclua CAPTCHA, verifique a liberação do Google para as contas dos clientes e valide os fluxos de agendamento e isolamento de contas no ambiente publicado.

## Atualização v9 — agenda e disponibilidade

Envie todos os arquivos deste pacote ao repositório, incluindo os novos `components/availability.tsx`, `components/time-picker.tsx` e `lib/availability.mjs`. O frontend ainda não foi publicado por esta atualização.

A migração `20260924002842_schedule_management.sql` já foi aplicada ao projeto Supabase iSev Agenda. Ela permite excluir cadastros sem agendamentos vinculados e salvar a semana de trabalho de forma atômica, com autorização por empresa. Não execute novamente no banco atual.

Validação: testes SQL isolados, lint, TypeScript/build, novo agendamento e edição de cliente conferidos na prévia local; almoço e cores de situação conferidos no navegador. Os testes visuais não salvaram alterações nos cadastros reais. O agendamento público ainda depende das variáveis/CAPTCHA descritos acima.
