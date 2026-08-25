# Changelog

## 1.0.34
- chore(build): novo AAB (código 43) para atualizar as faixas de teste interno e fechado com a versão mais recente (ícone donut + todas as correções acumuladas)
- fix(ios): textos claros de permissão de fotos e câmera com exemplo (App Store 5.1.1(ii)); buildNumber 5

## 1.0.32
- feat(diária): seletor de mês na Diária (Registro e Relatórios) — dá para consultar o faturamento e a meta de meses anteriores

## 1.0.31
- fix(saldo): valores "a receber"/"a pagar" não entram mais no saldo até serem marcados como recebido/pago (antes uma receita futura pendente já era contada no saldo)

## 1.0.30
- chore(ios): oculta compra/assinatura por pagamento externo no iOS (regra da App Store); Android mantém o fluxo Asaas

## 1.0.29
- feat(planos): ao atingir o limite gratuito (10 lançamentos no total), abre popup para iniciar trial de 15 dias ou ver planos — em todas as telas de criação

## 1.0.28
- feat(tags): criar tag nova direto do seletor em receita/despesa (botão "+ Criar tag"), sem precisar ir até a aba Tags

## 1.0.27
- fix(diaria): botão "+ Adicionar dia" no registro permite lançar dias anteriores esquecidos (antes só dava para editar o dia de hoje)

## 1.0.26
- fix(teclado): tratamento de teclado em todo o app — 18 telas/modais agora sobem o campo focado acima do teclado (novo componente KeyboardAwareScroll)

## 1.0.25
- feat(tags): campo de tags agora abre um seletor com busca das tags já cadastradas (criação continua só na aba Tags)
- fix(form): teclado deixa de cobrir a observação usando a altura real do teclado (corrige em Android edge-to-edge)

## 1.0.24
- fix(tags): tags voltaram a salvar e aparecer ao editar (mapeamento de tags na leitura do backend)
- fix(tags): tag digitada e não confirmada agora é salva ao sair do campo
- feat(data): botão de calendário no campo de data para selecionar em vez de digitar
- fix(form): teclado não cobre mais o campo de observação (rola junto ao focar)
- fix(fixo): editar a data do lançamento e aplicar em "todos do grupo" agora desloca a série inteira (frente ou trás), mantendo o espaçamento entre parcelas

## 1.0.23
- feat(fixo): selo "🔄 Fixo" nos lançamentos recorrentes da lista
- feat(fixo): ao editar "todos do grupo", detecta e recria meses apagados da série (com confirmação)
- feat(fixo): banner "Corrigir" ao abrir um fixo com meses faltando na série
- feat(fixo): ação "Desativar" para tirar a recorrência (só este mês ou toda a série, mantendo os lançamentos)

## 1.0.6
- fix(cartao): botão "Gerenciar" no dashboard agora navega para CartaoScreen
- feat(cartao): editar cartão de crédito (apelido, limite, datas, cor) e excluir
- feat(contasBancarias): tela de gestão de contas (criar, editar, excluir)
- feat(tags): criar e renomear tags diretamente na tela de Tags
- fix(categorias): edição e exclusão de subcategorias via chips clicáveis
- feat(import): botão "Lançar por foto" integrado na tela de importar extrato
- feat(auth): tela "Esqueci a senha" com código de 6 dígitos

## 1.0.5
- feat: navegação Contas bancárias no menu de ações rápidas
- feat: tela de importar extrato com câmera integrada
- fix(categorias): subcategorias editáveis via menu de ação

## 1.0.4
- feat: tela de Tags com criação e renomeação
- feat: tela de Grupos e Planejamento

## 1.0.3
- fix: correções de segurança e logout
