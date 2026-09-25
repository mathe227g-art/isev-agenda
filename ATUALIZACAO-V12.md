# Atualização v12

## O que mudou

- Login com mensagens mais claras, botão para mostrar/ocultar a senha e confirmação de senha no cadastro.
- Agendamento interno com até 10 serviços, duração sequencial e valor avulso total opcional.
- Valores digitados com máscara brasileira, por exemplo `R$ 1.150,50`.
- Dias e horários passados ficam bloqueados no calendário e também são recusados ao salvar.
- O dia selecionado permanece centralizado na semana, inclusive no celular.
- Telefones dos clientes abrem diretamente uma conversa no WhatsApp.
- Agenda atualiza automaticamente a cada 15 segundos e quando o aplicativo volta ao primeiro plano ou recupera a conexão.
- Listas de cliente, profissional e serviço no novo agendamento ficam recolhidas até o usuário pesquisar.
- Detalhes do atendimento mostram todos os serviços do mesmo agendamento.

## Banco de dados

A migração `booking_custom_price` foi aplicada ao projeto Supabase em 25/09/2026.
Ela adiciona somente a coluna opcional `bookings.custom_price` e atualiza o cálculo do valor concluído. Nenhum cadastro ou agendamento existente foi alterado.

Conferência antes e depois da migração:

- 24 clientes;
- 26 linhas de agendamento;
- 14 serviços;
- 11 profissionais;
- 25 valores financeiros já registrados, com o mesmo total antes e depois.

## Publicação

Envie o conteúdo deste pacote ao repositório conectado à Vercel. A migração já está aplicada; não é necessário executar SQL manualmente.
