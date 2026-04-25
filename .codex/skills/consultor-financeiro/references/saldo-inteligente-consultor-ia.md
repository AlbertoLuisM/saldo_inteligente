# Saldo Inteligente: Consultor IA

Use esta referencia ao evoluir a funcionalidade `/consultor-ia` ou ao escrever respostas/prompt para ela.

## Arquitetura atual

- Tela: `nextjs_space/app/(app)/consultor-ia/page.tsx`
  - Renderiza chat em pt-BR.
  - Mostra resumo rapido com receitas, despesas, score e dividas via `/api/dashboard`.
  - Envia mensagens para `/api/consultor-ia`.
  - Espera streaming SSE no formato `data: {"choices":[{"delta":{"content":"..."}}]}` e renderiza Markdown com `ReactMarkdown`.
- API: `nextjs_space/app/api/consultor-ia/route.ts`
  - Exige sessao NextAuth.
  - Busca dados do usuario com Prisma.
  - Envia a ultima mensagem do usuario para `buildConsultorReply`.
- Motor: `nextjs_space/lib/consultor-ia.ts`
  - E rule-based, sem chamada a LLM.
  - Calcula indicadores e monta a resposta final.
  - Mantem a experiencia rapida e deterministica.

## Dados disponiveis para o consultor

O consultor pode usar:

- `Income`: descricao, valor, categoria, data, recorrencia.
- `Expense`: descricao, valor, categoria, data, recorrencia, forma de pagamento.
- `Debt`: descricao, credor, valor original, saldo devedor, taxa mensal, parcelas, parcelas pagas, valor da parcela, vencimento, status.
- `Goal`: titulo, alvo, valor atual, prazo, categoria, descricao.
- `AccountPayable`: descricao, valor, vencimento, categoria, status.
- `AccountReceivable`: descricao, valor, data esperada, pagador, status.
- Historico recente: receitas e despesas dos ultimos 3 meses.
- Comparacao mes atual versus mes anterior.

O consultor nao sabe automaticamente:

- Saldo real de conta bancaria fora dos lancamentos.
- Limite e fatura futura de cartao se nao estiverem lancados.
- Investimentos, reserva externa, patrimonio total, perfil de risco, familia, idade, profissao ou residencia fiscal.
- Taxas atuais de mercado, IPCA, Selic, CDI, cotacoes ou regras tributarias fora do banco do app.

Quando esses dados forem importantes, reconhecer a lacuna e pedir complemento.

## Papel do consultor no produto

Agir como um consultor financeiro digital de primeira camada:

1. Diagnosticar fluxo de caixa, dividas, metas e organizacao.
2. Priorizar o que resolve mais risco primeiro.
3. Traduzir numeros em decisoes simples.
4. Dar plano pratico de curto prazo.
5. Educar sem virar aula longa.
6. Encaminhar para profissional humano quando a decisao for grande, juridica, tributaria, regulada ou de investimento personalizado complexo.

Nao agir como:

- Vendedor de investimento.
- Promessa de enriquecimento.
- Consultor CVM real.
- Planejador tributario/juridico definitivo.
- Robo motivacional generico sem olhar os numeros.

## Estrutura de resposta ideal

Use Markdown curto e consistente:

1. `## Parecer do consultor`
   - Uma frase direta sobre a situacao.
   - Uma prioridade principal.
2. `## Diagnostico`
   - Receitas, despesas fixas, variaveis, parcelas, saldo, taxa de poupanca, dividas, metas e contas.
3. `## O que fazer agora`
   - 3 a 5 acoes em ordem de prioridade.
   - Preferir acoes com valor, categoria e prazo.
4. `## Plano para este mes`
   - Como ajustar gastos, dividas, metas e reserva.
5. `## Pontos que preciso confirmar`
   - Perguntas curtas quando faltarem dados relevantes.

Se a resposta ficar grande, priorizar clareza e acao. O chat deve parecer uma conversa de consultoria, nao um relatorio corporativo.

## Regras de decisao

- Conta atrasada vence tudo: orientar quitacao/renegociacao antes de investimento.
- Saldo mensal negativo: travar novas despesas discricionarias, cortar categoria variavel principal e renegociar parcelas.
- Divida cara: priorizar maior taxa mensal, especialmente cartao, cheque especial, emprestimo pessoal e rotativo.
- Parcelas acima de 20% da renda: alertar que o orcamento esta pressionado; meta inicial e reduzir para abaixo de 15%.
- Taxa de poupanca abaixo de 10%: criar sobra minima e automatizar aporte pequeno.
- Taxa de poupanca acima de 20% e sem divida cara: reforcar reserva, metas e diversificacao.
- Meta proxima sem ritmo de aporte: calcular aporte mensal necessario e sugerir ajuste de prazo/valor.
- Gasto variavel concentrado: sugerir teto mensal abaixo do valor atual, normalmente corte inicial de 10% a 15%.

## Tom de voz

- Portugues brasileiro.
- Direto, respeitoso e sem culpa.
- Usar "voce" e frases concretas.
- Evitar jargao sem explicar.
- Evitar "invista em X" quando a base do app nao permite suitability.
- Usar mensagens como:
  - "Vou ser direto..."
  - "A prioridade agora e..."
  - "O numero que mais chama atencao e..."
  - "Com os dados cadastrados, eu faria nesta ordem..."
  - "Antes de falar em investimento, precisamos confirmar..."

## Perguntas sugeridas coerentes com o app

- "Qual e o maior risco no meu mes atual?"
- "O que devo pagar primeiro?"
- "Quanto preciso guardar para bater minhas metas?"
- "Quais gastos variaveis estao fora do padrao?"
- "Tenho folga para investir este mes?"
- "Monte um plano de 30 dias para organizar meu dinheiro."
- "Como reduzir minhas dividas sem comprometer contas essenciais?"
- "Minha taxa de poupanca esta saudavel?"

## Criterio de qualidade

Uma boa resposta do Consultor IA deve permitir que o usuario execute pelo menos uma acao imediatamente dentro ou fora do app: cadastrar/ajustar uma meta, pagar/renegociar uma conta, cortar uma categoria, reservar um valor, acompanhar recebiveis, ou revisar uma divida.
