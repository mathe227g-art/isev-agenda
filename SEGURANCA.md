# Segurança — atualização 005

Esta versão corrige problemas no código e inclui uma migração de banco. **As mudanças SQL foram aplicadas e verificadas no projeto iSev Agenda em 23/09/2026 pela integração Supabase.** A proteção do agendamento público só estará completa quando o código, as variáveis da hospedagem e a migração 005 estiverem ativos juntos.

## O que foi corrigido e testado

- Removidas as dependências antigas de Vite/Vinext/Cloudflare/Drizzle Kit que não eram usadas pela execução Next.js. A auditoria passou de 16 pacotes sinalizados para zero. O resultado está em `security-audit.json`; ele cobre alertas conhecidos no momento da consulta, não todas as falhas possíveis.
- Reservas públicas passam por `/api/book`. A rota usa Vercel BotID para bloquear automações e também verifica a origem, tipos, comprimentos e tamanho real do corpo. A chave secreta do Supabase permanece apenas no servidor.
- A migração 005 retira de `anon` e `authenticated` a permissão de executar `book_public`. Somente o servidor com credencial privilegiada pode executar essa função. Isso impede contornar o BotID chamando diretamente a API do banco. O painel autenticado continua criando agendamentos da própria empresa pelas regras RLS.
- Limite de cinco reservas por telefone normalizado/empresa nas últimas 24 horas, contando cancelamentos, com trava transacional para chamadas simultâneas. Reservas internas também entram na contagem; a equipe pode continuar criando pelo painel. BotID e esse limite reduzem abuso, mas não comprovam a posse do telefone.
- Somente proprietários podem alterar serviços, profissionais, disponibilidade, bloqueios, logo, tema e cores. As regras estão no banco, além da interface. Funcionários mantêm acesso operacional à agenda, clientes e valores/financeiro da sua empresa; não foi implementado um perfil de funcionário sem acesso financeiro.
- Cabeçalhos contra enquadramento em outros sites, detecção indevida de MIME e envio do endereço de cancelamento no Referer. HSTS em produção e restrições de CSP para objetos, URL-base, formulários e frames. A CSP não é uma política completa de scripts com nonce.
- Testes em PostgreSQL isolado aplicam os SQLs 001–005 reais e reaplicam a 005; verificam isolamento entre empresas, acesso anônimo, alterações por funcionários, elevação de privilégio, bloqueio da RPC antiga, limite de reservas, conflito de horário e cancelamento de uso único.
- Testes da API simulam o Supabase, verificando falhas e sucesso sem usar credenciais ou dados reais. Testes de sessão/PWA, calendário e financeiro continuam passando.

## Ativação (SQL já aplicado neste projeto)

1. Confirme que a migração 004 já está instalada. Não reaplique as migrações 001–003. Faça um backup recuperável antes da atualização e mantenha o código anterior disponível.
2. Configure as variáveis da `.env.example` na hospedagem Node/Next.js:
   - `APP_ORIGIN`: endereço completo, por exemplo `https://agenda.suaempresa.com`.
   - `SUPABASE_SECRET_KEY`: chave secreta do projeto Supabase (ou service_role legado), somente no servidor. Não use prefixo `NEXT_PUBLIC_`, não coloque em arquivos versionados e não envie a chave no chat. Essa chave tem privilégios elevados.
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: valores públicos do projeto correto.
3. Execute `npm ci`, `npm test`, `npm run lint` e `npm run build`. As variáveis `NEXT_PUBLIC_*` precisam existir durante o build.
4. **No iSev Agenda conectado, este passo já foi executado.** Para outra instalação, em uma janela de manutenção, aplique **somente** `supabase/migrations/202609230005_security.sql` no SQL Editor e publique o novo código. A migração não remove tabelas nem registros; altera permissões e uma função. Depois de aplicada, versões antigas da página pública não conseguem reservar. Sem a chave privada, a versão nova bloqueia reservas públicas em vez de desabilitar a proteção. O painel autenticado continua operando.
5. Execute `supabase/checks/security.sql` e confira os resultados. Teste no domínio HTTPS uma reserva pública com BotID, conclusão no painel, recarregamento, saída/reentrada e cancelamento. Teste duas contas de empresas diferentes e um funcionário no ambiente real. Os testes isolados não substituem essa verificação final.

## Configurações externas ainda pendentes

A integração permitiu alterar e verificar o banco, mas não oferece ferramentas para configurar todos os recursos de Supabase Auth e backups. Permanecem pendentes:

- Autenticação: confirmação de e-mail, regras de senha, proteção de senhas vazadas quando disponível, limites de login/cadastro, URLs de redirecionamento e proteção contra bots no login/cadastro. O BotID desta revisão protege a reserva pública.
- Administração: MFA nas contas que administram Supabase/hospedagem, colaboradores mínimos e credenciais guardadas no gerenciador de segredos.
- Backups: verificar os recursos disponíveis no plano, definir retenção e executar uma restauração de teste em outro projeto. Exportar somente o esquema SQL não é backup dos agendamentos. Não é possível prometer recuperação sem testar a restauração.
- Hospedagem: HTTPS, limites de tráfego no endpoint `/api/book`, monitoramento de erros/abuso e logs sem tokens, chaves ou dados de contato. Não registrar corpos de requisição nem URLs de cancelamento completas em ferramentas de análise.

Não houve teste de invasão externo nem certificação de segurança. Nenhum agendamento do banco real foi criado, alterado ou apagado durante os testes desta revisão. Publique para clientes após ativar e verificar os itens acima.

Referências: [validação Turnstile no servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) e [chaves do Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## Verificação no projeto real — 23/09/2026

- Projeto: iSev Agenda (`qfvaqgibefwpeyaowwxe`). Nenhuma alteração no projeto iSev Finance.
- Migrações registradas: `20260923231412_agenda_security` e `20260923231526_agenda_internal_security`. O arquivo local 005 contém o conjunto reaplicável das duas alterações. As migrações antigas foram instaladas pelo SQL Editor e não constavam no histórico; não use um `db push` cego para reaplicá-las.
- Confirmadas nove tabelas públicas com RLS, dez políticas restritivas de proprietário, reserva direta negada para anon/authenticated e permitida para service_role.
- Consulta com o papel authenticated e identidade sem vínculo, em transação somente leitura: nenhum acesso a empresas, membros, clientes, agendamentos ou identidade visual. Não foi criado usuário de teste real.
- Contagens antes/depois: um cliente e um agendamento. As alterações foram de funções, políticas, privilégios e localização de extensão, sem DML em dados de negócio.
- `btree_gist` movida para `extensions`, preservando o índice que impede sobreposição. Revogado acesso público à função interna de event trigger `rls_auto_enable`.
- Advisors consultados novamente: os alertas de extensão pública, função interna pública e reserva pública direta foram removidos. Permanecem avisos de funções SECURITY DEFINER intencionalmente acessíveis (catálogo, horários, identidade visual, cancelamento por token, criação de empresa autenticada e consultas de vínculo). Esses avisos foram revisados, não são uma aprovação automática nem foram simplesmente ocultados.
- O Advisor confirmou proteção de senhas vazadas desativada. Ainda é necessário configurar no painel, conforme a disponibilidade do plano: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- CAPTCHA, chaves privadas do servidor e domínio não configurados: reservas públicas continuam bloqueadas. O painel autenticado mantém as permissões operacionais.

## Atualização de gestão (v9)

A migração schedule_management foi aplicada ao projeto iSev Agenda. A função save_working_week é SECURITY INVOKER, exige proprietário, respeita RLS e não é executável por anon. Exclusões de serviços/profissionais exigem proprietário; clientes exigem membro da própria empresa. Chaves estrangeiras impedem excluir cadastros referenciados por agendamentos. Jornada, almoço e folgas são salvos atomicamente. Testes isolados cobrem autorização, rollback, exclusões e horários públicos.

A revisão dos advisors não indicou novos avisos específicos desta função; continuam os avisos existentes de RPCs SECURITY DEFINER e proteção contra senhas vazadas. Referências: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
