# iSev Agenda — calendário, identidade e financeiro

## Atualizar uma instalação existente

Esta versão inclui correções de segurança. Siga primeiro `SEGURANCA.md`: configurar Turnstile e variáveis privadas na hospedagem, aplicar a migração 005 após a 004 e publicar o código em conjunto. Não execute novamente os SQLs 001–003.

A 005 foi validada em PostgreSQL isolado e aplicada ao projeto Supabase iSev Agenda em 23/09/2026. Sem as variáveis de segurança, o novo formulário público não aceita reservas. Os agendamentos existentes são preservados.

## O que mudou

- Agenda em calendário: Dia e Semana com grade de horários; Mês com blocos por dia.
- Clique em um espaço livre para abrir o agendamento com data e hora preenchidas. Clique em um atendimento para ver detalhes e atualizar a situação.
- Filtro por profissional; alternância entre cores de profissionais e serviços; opção de mostrar cancelados.
- Atendimentos simultâneos dividem o espaço em colunas, e os que atravessam meia-noite aparecem nos dois dias.
- Logo e nome da empresa em destaque abaixo da iSev Agenda, no painel e na página pública.
- Configurações com logo PNG/JPG/WebP (até 2 MB e 4096 × 4096), qualquer cor hexadecimal e modos claro/escuro. A logo é armazenada no registro visual da empresa; não exige configurar um bucket adicional.
- Cores editáveis em Serviços e Profissionais, com salvamento explícito. As mesmas cores dos serviços são usadas no Financeiro.
- Financeiro: receita, quantidade de concluídos, ticket médio e gráfico circular por serviço; filtros Dia/Semana/Mês, navegação e escolha da data de referência.

## Como os valores são calculados

Cada serviço é uma categoria. Dois cortes de R$ 50 resultam em R$ 100 em Corte de cabelo. Apenas `completed` entra no total; confirmados, cancelados e faltas ficam de fora. O período usa a data de início do atendimento no fuso da empresa; semanas começam na segunda-feira. Valores são somados em centavos.

Após a migração, um trigger registra o preço vigente quando o atendimento é concluído. Alterar o preço do serviço não modifica o histórico. Reabrir/cancelar um atendimento o exclui do financeiro, mas preserva seu valor registrado caso seja concluído novamente.

O sistema anterior não guardava o preço individual: o SQL preenche concluídos antigos com o preço atual do serviço, marcando-os como `historical_estimate`. A interface informa quando há estimativas no período. Serviços sem preço não entram na receita nem no ticket médio e são sinalizados. Preço zero é válido.

Este módulo resume o valor dos serviços concluídos. Não é controle de recebimentos, despesas, caixa ou lucro.

## Executar localmente

Requisitos: Node.js 22.13+ e npm.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. Para outra porta: `npm run dev -- --port 3018`.

Em desenvolvimento, `/demonstracao` permite experimentar calendário, financeiro, upload de logo e tema com dados fictícios. As mudanças nessa rota ficam apenas em memória e não chamam o banco. A rota responde 404 em produção.

O projeto usa Next.js diretamente. As dependências, configurações, scripts e exemplos antigos de Vite/Cloudflare/D1 foram removidos. O pacote usa npm e package-lock.json. Publicação em uma hospedagem Cloudflare anterior exige adaptação própria; esta revisão não publicou um site online.

## Supabase

O projeto original está configurado em `lib/supabase.ts` com sua chave publicável. Para outro projeto, copie `.env.example` para `.env.local`. Nunca coloque uma chave `service_role` no frontend. As políticas RLS restringem os registros por empresa; após a migração 005, identidade, cores e cadastros de configuração podem ser alterados somente pelo proprietário.

A RPC pública de identidade retorna apenas logo, tema e cor. Ela não expõe clientes, membros ou configurações privadas de cores por entidade.

Login Google configurado e testado para http://127.0.0.1:3017; veja LOGIN-GOOGLE.md. A publicação no domínio definitivo exige atualizar os retornos e o modo de testes no Google.

## Testes

```sh
npm run lint
npm run build
npm test
```

Os testes cobrem datas, períodos e fusos, agrupamento por serviço, preços históricos, cancelados/faltas, preços ausentes ou zero, sobreposição de horários, transição de meia-noite e contraste. O teste SQL roda em PostgreSQL isolado, sem conexão com o banco real, e valida a migração, reaplicação, RLS, captura de preços e identidade pública.

A interface foi conferida no navegador em modo claro, escuro e largura móvel de 390px. Foram testados os filtros diário/mensal, detalhes de atendimento, exclusão de cancelado do total financeiro e upload/aplicação/remoção da logo em demonstração. A validação autenticada no banco real depende da execução do SQL 004 e de uma conta da empresa.

## Limites atuais

O financeiro carrega os agendamentos em páginas e calcula o resumo no navegador; empresas com histórico muito grande devem migrar esses cálculos para consultas agregadas no servidor. Clientes, serviços e profissionais ainda usam o limite padrão do Supabase. Agenda e financeiro usam o fuso da empresa; alguns rótulos herdados da visão geral e da página pública continuam fixos em America/Sao_Paulo.

## Aplicativo instalável (PWA)

A versão PWA mantém o mesmo site, banco e funcionalidades. Depois de publicada em um domínio HTTPS, oferece um ícone na tela inicial e abre em uma janela própria. Não é necessário publicar em Play Store ou App Store. O endereço 127.0.0.1 da prévia só funciona neste computador; ele não é um endereço de instalação para o celular.

Há um botão Instalar aplicativo no login, no rodapé do menu da empresa e nas Configurações. Em navegadores que oferecem instalação direta, o botão abre o diálogo do navegador. Nos demais, mostra as instruções. Quando já está aberto em modo aplicativo, o botão fica oculto.

- Android: abrir o endereço publicado no Chrome → menu ⋮ → Instalar aplicativo ou Adicionar à tela inicial.
- iPhone: abrir o endereço publicado no Safari → Compartilhar → Adicionar à Tela de Início. Se houver a opção Abrir como App, mantê-la ativada.
- Ao abrir pelo ícone, pode ser necessário entrar uma vez no aplicativo: o navegador e a instalação podem ter armazenamentos separados, dependendo do sistema.

A sessão fica no armazenamento persistente do Supabase, sem salvar a senha. `persistSession` e `autoRefreshToken` estão explicitamente habilitados. A aplicação restaura a identidade por `INITIAL_SESSION`; eventos de renovação de token e de retorno à aba para a mesma conta não limpam o painel. Sair encerra a sessão deste dispositivo (`scope: local`).

Não existe garantia de login eterno: limpar dados, remover o aplicativo, usar navegação privada, revogar a sessão ou atingir limites de sessão configurados no Supabase pode exigir autenticar novamente. Esta revisão não altera políticas de segurança do projeto nem aumenta a validade de JWTs. As regras RLS continuam validando cada acesso aos dados.

O service worker funciona em produção e armazena apenas ícones públicos e a página genérica de falta de conexão. Ele não guarda páginas autenticadas, dados da agenda, respostas de API ou tokens. O app precisa de internet para operar. A instalação e a persistência no aparelho específico ainda devem ser confirmadas em Android/iPhone após publicar com HTTPS.

Não há SQL adicional para o PWA. A migração 004 continua sendo necessária apenas para identidade visual e financeiro da versão anterior.

Arquivos principais: `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html`, `components/install-app.tsx`, `lib/session.mjs`. Ícones PNG gerados a partir do símbolo vetorial do projeto por `node scripts/generate-app-icons.mjs`.

Os testes de sessão usam o SDK real contra uma resposta simulada: validam armazenamento, reabertura, renovação e saída. Os testes de PWA validam manifesto, dimensões dos ícones, fallback sem conexão e exclusão de dados privados do cache. Nenhuma credencial real é utilizada nesses testes.

Referências: https://supabase.com/docs/guides/auth/sessions e https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
