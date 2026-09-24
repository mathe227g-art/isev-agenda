# Login Google — domínio publicado

Site: https://isevagenda.vercel.app

## Configuração realizada

- Projeto Supabase: iSev Agenda (`qfvaqgibefwpeyaowwxe`).
- Site URL e retorno permitido: `https://isevagenda.vercel.app`.
- Retornos locais preservados: `http://127.0.0.1:3017` e `http://localhost:3000/**`.
- Projeto Google Cloud: iSev Agenda (`thematic-scene-509623-f3`).
- Cliente OAuth web: `iSev Agenda — Web local`.
- Origem JavaScript cadastrada anteriormente: `http://127.0.0.1:3017`; não foi alterada nesta correção.
- Callback Google → Supabase: `https://qfvaqgibefwpeyaowwxe.supabase.co/auth/v1/callback`.
- Provedor Google habilitado; segredo cadastrado diretamente no Supabase, nunca neste pacote.

## Validação

O login Google retornou ao domínio publicado, carregou o painel da empresa com os estilos corretos e manteve a sessão ao reabrir o site. O problema anterior era o retorno ao endereço local do computador.

A correção do redirecionamento foi feita no painel do Supabase. Ela não é aplicada por um ZIP ou deploy; ao usar outro projeto Supabase ou domínio, configure novamente essas URLs.

## Pendências

O aplicativo Google foi configurado em modo de testes. A liberação para outras contas e os requisitos de publicação/verificação do Google ainda precisam ser revisados antes da entrega. O CAPTCHA e as variáveis do agendamento público são configurações separadas: veja VERCEL.md e SEGURANCA.md.

Documentação: https://supabase.com/docs/guides/auth/social-login/auth-google
