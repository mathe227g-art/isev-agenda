# Login com Google — configurado para teste local

Configurado e testado em 23/09/2026.

- Projeto Google Cloud: iSev Agenda, ID `thematic-scene-509623-f3`.
- Cliente OAuth: aplicativo web, nome `iSev Agenda — Web local`.
- Origem autorizada: `http://127.0.0.1:3017`.
- Callback Google → Supabase: `https://qfvaqgibefwpeyaowwxe.supabase.co/auth/v1/callback`.
- Provedor Google ativado no projeto Supabase iSev Agenda. Client ID e Client Secret cadastrados diretamente no painel; segredo não incluído neste pacote nem no frontend.
- Site URL e retorno permitido no Supabase: `http://127.0.0.1:3017`. O retorno de desenvolvimento antigo `http://localhost:3000/**` foi preservado.
- Conta administradora adicionada como usuária de teste. Aplicativo Google em modo **Testando**, sem publicação para todos os usuários.
- Confirmação de e-mail permanece habilitada; login anônimo e opções de ignorar nonce/aceitar usuário sem e-mail permanecem desabilitados.

## Validação realizada

Saída local → botão Google → escolha da conta administradora → consentimento de nome/foto/e-mail → retorno ao aplicativo → mesma empresa e dados existentes. Não foram criados clientes nem agendamentos para testar o login.

O botão também trata falhas de rede sem ficar preso no estado de carregamento. Lint e build passaram.

## Antes da publicação

Atualizar a origem autorizada do cliente Google, Site URL e lista exata de retornos do Supabase para o domínio HTTPS definitivo. Concluir branding/domínios/links exigidos pelo Google e a publicação/verificação aplicável. Enquanto estiver em modo de testes, adicionar explicitamente as demais contas que precisarão testar. O endereço local não funciona como site público para clientes.

O login Google não ativa o CAPTCHA de reservas públicas. As variáveis de Turnstile e do servidor continuam sendo uma configuração separada, descrita em SEGURANCA.md.

[Configuração oficial do Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
