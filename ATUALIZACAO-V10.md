# Atualização v10 — agenda para celular

- Agenda móvel com semana no topo, um dia e um profissional por vez, grade de 15 minutos e botão de novo atendimento.
- Cores por situação: pendente amarelo, concluído verde, cancelado vermelho e não compareceu laranja. Profissional e serviço conservam suas cores de identificação.
- Jornada, almoço, folgas e bloqueios temporários aparecem na grade. Alterações na disponibilidade atualizam a agenda.
- Exclusão nos detalhes do atendimento com confirmação e aviso sobre impacto no financeiro quando concluído. Excluir não apaga o cliente, serviço ou profissional.
- Logo personalizada também no rodapé do menu.
- Navegação inferior e formulários adaptados ao celular. A visualização de computador continua disponível.

## Publicar
Extraia o ZIP e atualize o conteúdo do repositório conectado à Vercel, mantendo a estrutura de pastas. package.json fica na raiz do repositório. Preserve as variáveis de ambiente já configuradas na Vercel. Aguarde o deployment ficar Ready.

A migração supabase/migrations/20260924011327_booking_deletion.sql já foi aplicada ao projeto iSev Agenda em 23/09/2026. Não precisa executá-la novamente nesse banco. Ela autoriza exclusão somente para membros da própria empresa, via RLS. Nenhum agendamento real foi excluído durante os testes.

## Verificações
Testes automatizados de calendário, disponibilidade, sessão, PWA, API e isolamento por empresa; lint e build de produção. Conferência visual no navegador em 390 px e 320 px; exclusão testada com dados fictícios da demonstração local.

As pendências anteriores de publicação do OAuth Google e configuração de CAPTCHA para reservas públicas continuam documentadas nos demais guias do projeto. Esta atualização não afirma resolver essas configurações externas.
