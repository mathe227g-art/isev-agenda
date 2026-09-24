# Atualização v11 — pesquisa, histórico e vários serviços

## O que mudou

- Botão de pesquisa geral no topo para localizar clientes, serviços e profissionais.
- Pesquisa dentro das categorias Clientes, Serviços e Profissionais.
- Campos pesquisáveis de cliente, serviço e profissional no novo agendamento interno.
- Nova categoria Histórico, com seleção de dia e busca por cliente, serviço ou profissional.
- O histórico mostra cliente, profissional, horário, situação e todos os serviços do atendimento.
- A página pública agora exibe todos os serviços em cartões com nome, duração, preço e botão `+`.
- O cliente pode adicionar vários serviços antes de escolher profissional, dia e horário.
- Horários públicos são calculados em intervalos de 15 minutos usando a duração total dos serviços.
- Serviços do mesmo atendimento ficam agrupados. Alterar situação, cancelar ou excluir afeta todo o conjunto.

## Banco de dados

A migração `supabase/migrations/20260924015611_multi_service_bookings.sql` já foi aplicada ao projeto Supabase do iSev Agenda em 23/09/2026. Não é necessário executá-la novamente nesse projeto.

Ela adiciona um identificador de grupo aos agendamentos, a ordem dos serviços e funções restritas para consultar horários e registrar vários serviços de forma atômica. A reserva pública continua sendo gravada somente pelo servidor com CAPTCHA e chave secreta; visitantes podem consultar apenas catálogo e horários disponíveis.

## Publicação

Extraia o ZIP e substitua o conteúdo do repositório conectado à Vercel, mantendo `package.json` na raiz. Preserve as variáveis de ambiente já cadastradas na Vercel. Depois, aguarde o novo deployment ficar `Ready`.

## Verificações realizadas

Passaram os testes de isolamento entre empresas, múltiplos serviços consecutivos, cancelamento do conjunto, colisão de horários, histórico agrupado, pesquisa, API pública, sessão, PWA, lint, TypeScript e build de produção. As telas foram verificadas em desktop e em largura de celular.
