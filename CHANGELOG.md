# Changelog

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
