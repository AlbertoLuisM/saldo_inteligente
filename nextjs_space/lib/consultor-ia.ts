import type {
  AccountPayable,
  AccountReceivable,
  Debt,
  Expense,
  Goal,
  Income,
} from "@prisma/client";

type Focus = "debt" | "expense" | "goal" | "savings" | "health" | "priority" | "general";

interface ChatMessage {
  role?: string;
  content?: string;
}

export interface ConsultorContext {
  now: Date;
  question: string;
  messages?: ChatMessage[];
  incomes: Income[];
  expenses: Expense[];
  lastMonthIncomes: Income[];
  lastMonthExpenses: Expense[];
  debts: Debt[];
  goals: Goal[];
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  recentIncomes: Income[];
  recentExpenses: Expense[];
}

interface Suggestion {
  key: string;
  title: string;
  body: string;
  priority: number;
}

const FIXED_CATEGORY_KEYWORDS = [
  "moradia",
  "saude",
  "educacao",
  "assinaturas",
  "utilidades",
];

const FIXED_DESCRIPTION_KEYWORDS = [
  "aluguel",
  "plano",
  "academia",
  "internet",
  "fibra",
  "iptu",
  "seguro",
  "mensalidade",
  "agua",
  "luz",
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function sumAmount<T extends { amount: number }>(items: T[]) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function calcPMT(principal: number, ratePercent: number, installments: number) {
  if (principal <= 0 || installments <= 0) return 0;
  if (ratePercent <= 0) return principal / installments;
  const monthlyRate = ratePercent / 100;
  const factor = Math.pow(1 + monthlyRate, installments);
  return principal * ((monthlyRate * factor) / (factor - 1));
}

function isFixedExpense(expense: Expense) {
  const recurrence = normalizeText(expense.recurrence);
  const category = normalizeText(expense.category);
  const description = normalizeText(expense.description);

  if (recurrence && recurrence !== "once") return true;
  if (FIXED_CATEGORY_KEYWORDS.some((keyword) => category.includes(keyword))) return true;
  return FIXED_DESCRIPTION_KEYWORDS.some((keyword) => description.includes(keyword));
}

function getFocus(question: string): Focus {
  const normalized = normalizeText(question);
  if (!normalized.trim()) return "general";
  if (/(primeiro|prioridade|priorizar|aconselha|aconselharia|recomenda|recomendaria|por onde comec|o que faco|o que devo fazer|fazer agora|ainda nao sei|nao sei|me ajuda|decide|escolha por mim)/.test(normalized)) return "priority";
  if (/(divida|dividas|emprestimo|cartao|juros|quitar)/.test(normalized)) return "debt";
  if (/(despesa|despesas|gasto|gastos|cortar|reduzir|diminuir|baixar|cancelar|assinatura|assinaturas)/.test(normalized)) return "expense";
  if (/(meta|metas|objetivo|objetivos)/.test(normalized)) return "goal";
  if (/(economizar|poupar|poupanca|reserva|investir)/.test(normalized)) return "savings";
  if (/(saude financeira|saude|equilibrio|fluxo de caixa)/.test(normalized)) return "health";
  return "general";
}

function compactText(value: string) {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenMatches(text: string, target: string) {
  const normalizedTarget = compactText(target);
  if (!text || !normalizedTarget) return false;
  if (text.includes(normalizedTarget)) return true;

  const targetWithoutPlural = normalizedTarget.replace(/s\b/g, "");
  const textWithoutPlural = text.replace(/s\b/g, "");
  return targetWithoutPlural.length >= 4 && textWithoutPlural.includes(targetWithoutPlural);
}

function looksLikeActionProposal(question: string) {
  const normalized = compactText(question);
  if (!normalized) return false;
  const asksForOptions = /^(quais|qual|como|quanto|onde|o que|que )\b/.test(normalized);
  const tentativeProposal = /(talvez|acho|penso|poderia|vou|vamos|seria|e se|sim|ok|entao)/.test(normalized);
  const concreteAction = /(diminuir|reduzir|cortar|cancelar|pausar|suspender|adiar|renegociar|baixar|tirar|parar|limitar|trocar)/.test(normalized);
  return concreteAction && (tentativeProposal || !asksForOptions);
}

function isGreetingOnly(question: string) {
  const normalized = normalizeText(question)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  const greetings = new Set([
    "oi",
    "ola",
    "opa",
    "e ai",
    "eae",
    "salve",
    "bom dia",
    "boa tarde",
    "boa noite",
    "hello",
    "hey",
  ]);

  if (greetings.has(normalized)) return true;

  return /^(oi|ola|opa|bom dia|boa tarde|boa noite|hello|hey)( tudo bem)?( consultor)?$/.test(normalized);
}

function wantsFullReport(question: string) {
  const normalized = normalizeText(question);
  return /(relatorio|analise completa|diagnostico completo|parecer completo|visao geral|analise geral|me diga tudo|resumo completo)/.test(normalized);
}

function monthsUntil(now: Date, targetDate: Date) {
  const yearDiff = targetDate.getFullYear() - now.getFullYear();
  const monthDiff = targetDate.getMonth() - now.getMonth();
  const total = yearDiff * 12 + monthDiff;
  return Math.max(1, total + (targetDate.getDate() >= now.getDate() ? 0 : 1));
}

function buildSuggestions(params: {
  focus: Focus;
  now: Date;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;
  debtMonthlyImpact: number;
  debtServiceRatio: number;
  activeDebts: Debt[];
  overdueBills: AccountPayable[];
  pendingBills: AccountPayable[];
  pendingReceivables: AccountReceivable[];
  topVariableExpense?: { category: string; amount: number };
  activeGoals: Goal[];
}) {
  const {
    focus,
    now,
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    debtMonthlyImpact,
    debtServiceRatio,
    activeDebts,
    overdueBills,
    pendingBills,
    pendingReceivables,
    topVariableExpense,
    activeGoals,
  } = params;

  const suggestions: Suggestion[] = [];
  const totalReceivables = sumAmount(pendingReceivables);
  const highestInterestDebt = [...activeDebts].sort((a, b) => b.interestRate - a.interestRate)[0];

  if (highestInterestDebt) {
    suggestions.push({
      key: "high-interest-debt",
      title: "Ataque a divida mais cara primeiro",
      body: `A divida "${highestInterestDebt.description}" cobra ${formatPercent(highestInterestDebt.interestRate)} ao mes. Priorize amortizacoes extras nela antes das demais para reduzir juros mais rapido.`,
      priority: focus === "debt" ? 120 : 90,
    });
  }

  if (debtServiceRatio >= 20) {
    suggestions.push({
      key: "debt-service",
      title: "Reduza o peso das parcelas no mes",
      body: `Hoje as parcelas consomem ${formatPercent(debtServiceRatio)} da renda do mes (${formatCurrency(debtMonthlyImpact)}). Tente renegociar prazo, antecipar a divida menor ou direcionar parte das entradas extras para baixar esse peso abaixo de 15%.`,
      priority: focus === "debt" ? 115 : 85,
    });
  }

  if (topVariableExpense && totalIncome > 0) {
    const cutAmount = topVariableExpense.amount * 0.15;
    suggestions.push({
      key: "top-variable",
      title: "Corte a categoria que mais pressiona o caixa",
      body: `A categoria ${topVariableExpense.category} lidera os gastos variaveis com ${formatCurrency(topVariableExpense.amount)}. Um corte de 15% ja liberaria cerca de ${formatCurrency(cutAmount)} por mes.`,
      priority: focus === "expense" ? 120 : 80,
    });
  }

  if (savingsRate < 10) {
    suggestions.push({
      key: "savings-rate",
      title: "Crie uma meta minima de sobra mensal",
      body: `Sua taxa de poupanca esta em ${formatPercent(savingsRate)}. Vale definir uma reserva automatica logo apos a entrada da renda, nem que comece com 5% a 10%, para evitar que todo o caixa seja consumido no decorrer do mes.`,
      priority: focus === "savings" || focus === "health" ? 110 : 82,
    });
  }

  if (netBalance < 0) {
    suggestions.push({
      key: "negative-balance",
      title: "Trave novas despesas ate voltar ao azul",
      body: `O saldo mensal esta negativo em ${formatCurrency(netBalance)}. Suspenda gastos discricionarios, reveja compras parceladas e use qualquer entrada extraordinaria para recuperar o fluxo de caixa primeiro.`,
      priority: 130,
    });
  }

  if (overdueBills.length > 0) {
    suggestions.push({
      key: "overdue-bills",
      title: "Regularize contas atrasadas primeiro",
      body: `Ha ${overdueBills.length} conta(s) atrasada(s). Quitar essas pendencias cedo evita multa, juros e efeito cascata no resto do orcamento.`,
      priority: 125,
    });
  } else if (pendingBills.length > 0) {
    suggestions.push({
      key: "pending-bills",
      title: "Antecipe o pagamento das proximas contas",
      body: `Existem ${pendingBills.length} conta(s) pendente(s). Separar o valor delas agora evita apertos na segunda metade do mes.`,
      priority: 65,
    });
  }

  if (totalReceivables > 0) {
    suggestions.push({
      key: "receivables",
      title: "Use contas a receber como alavanca de reorganizacao",
      body: `Voce tem ${formatCurrency(totalReceivables)} a receber. Vale acompanhar ativamente esses recebimentos e, quando entrarem, aplicar o valor em reserva ou amortizacao de dividas, em vez de transformar tudo em novo consumo.`,
      priority: focus === "savings" ? 95 : 72,
    });
  }

  activeGoals
    .slice()
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 2)
    .forEach((goal, index) => {
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const months = monthsUntil(now, new Date(goal.deadline));
      const monthlyNeeded = remaining / months;
      suggestions.push({
        key: `goal-${goal.id}`,
        title: `Proteja a meta ${index === 0 ? "mais urgente" : "seguinte"}`,
        body: `Para a meta "${goal.title}" faltar ${formatCurrency(remaining)} e o prazo permitir ${months} mes(es), o ritmo medio necessario e de ${formatCurrency(monthlyNeeded)} por mes.`,
        priority: focus === "goal" ? 105 - index : 60 - index,
      });
    });

  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .filter((suggestion, index, all) => all.findIndex((item) => item.key === suggestion.key) === index)
    .slice(0, 4);
}

export function buildConsultorReply(context: ConsultorContext) {
  const {
    now,
    question,
    messages = [],
    incomes,
    expenses,
    lastMonthIncomes,
    lastMonthExpenses,
    debts,
    goals,
    accountsPayable,
    accountsReceivable,
    recentIncomes,
    recentExpenses,
  } = context;

  const focus = getFocus(question);
  const totalIncome = sumAmount(incomes);
  const totalExpenses = sumAmount(expenses);
  const lastMonthIncome = sumAmount(lastMonthIncomes);
  const lastMonthExpense = sumAmount(lastMonthExpenses);
  const activeDebts = debts.filter((debt) => debt.status === "active");
  const totalDebt = activeDebts.reduce((sum, debt) => sum + debt.remainingBalance, 0);

  let debtMonthlyImpact = 0;
  for (const debt of activeDebts) {
    if (debt.paidInstallments >= debt.installments) continue;
    debtMonthlyImpact += debt.installmentAmount
      ? debt.installmentAmount
      : calcPMT(debt.originalAmount, debt.interestRate, debt.installments);
  }

  const netBalance = totalIncome - totalExpenses - debtMonthlyImpact;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
  const debtServiceRatio = totalIncome > 0 ? (debtMonthlyImpact / totalIncome) * 100 : 0;
  const debtToIncomeRatio = totalIncome > 0 ? (totalDebt / (totalIncome * 12)) * 100 : 0;

  const fixedExpenses = expenses.filter(isFixedExpense);
  const variableExpenses = expenses.filter((expense) => !isFixedExpense(expense));
  const fixedTotal = sumAmount(fixedExpenses);
  const variableTotal = sumAmount(variableExpenses);

  const expenseByCategory = new Map<string, number>();
  for (const expense of expenses) {
    expenseByCategory.set(expense.category, (expenseByCategory.get(expense.category) ?? 0) + expense.amount);
  }

  const sortedCategories = [...expenseByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  const topVariableExpense = [...variableExpenses]
    .reduce<Map<string, number>>((map, expense) => {
      map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
      return map;
    }, new Map<string, number>());

  const topVariableCategory = [...topVariableExpense.entries()]
    .sort((a, b) => b[1] - a[1])[0];

  const activeGoals = goals.filter((goal) => goal.currentAmount < goal.targetAmount);
  const completedGoals = goals.length - activeGoals.length;
  const goalProgress = activeGoals.length > 0
    ? (activeGoals.reduce((sum, goal) => sum + goal.currentAmount / goal.targetAmount, 0) / activeGoals.length) * 100
    : 0;

  const overdueBills = accountsPayable.filter((bill) => {
    const dueDate = new Date(bill.dueDate);
    return bill.status === "overdue" || (bill.status === "pending" && dueDate < now);
  });

  const pendingBills = accountsPayable.filter((bill) => bill.status === "pending");
  const pendingReceivables = accountsReceivable.filter((item) => item.status !== "received");

  const monthIncomeDiff = totalIncome - lastMonthIncome;
  const monthExpenseDiff = totalExpenses - lastMonthExpense;
  const wantsDetailedReport = wantsFullReport(question);
  const highestInterestDebt = [...activeDebts].sort((a, b) => b.interestRate - a.interestRate)[0];
  const pendingBillsTotal = sumAmount(pendingBills);
  const pendingReceivablesTotal = sumAmount(pendingReceivables);
  const nearestGoal = activeGoals
    .slice()
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
  const previousUserMessage = messages
    .filter((message) => message.role === "user" && message.content?.trim() && message.content !== question)
    .slice(-1)[0]?.content;
  const previousAssistantMessage = messages
    .filter((message) => message.role === "assistant" && message.content?.trim())
    .slice(-1)[0]?.content;
  const normalizedQuestion = compactText(question);
  const unsureFollowUp = /(ainda nao sei|nao sei|nao tenho certeza|tanto faz|me ajuda|decide|escolha por mim)/.test(normalizeText(question));

  const buildActionProposalReply = () => {
    const matchingExpenses = expenses.filter((expense) =>
      tokenMatches(normalizedQuestion, expense.category) ||
      tokenMatches(normalizedQuestion, expense.description)
    );
    const matchedCategory = sortedCategories.find(({ category }) => tokenMatches(normalizedQuestion, category));
    const targetLabel = matchedCategory?.category
      ?? matchingExpenses[0]?.category
      ?? (/(assinatura|assinaturas)/.test(normalizedQuestion) ? "assinaturas" : "esse corte");
    const targetAmount = matchingExpenses.length > 0
      ? sumAmount(matchingExpenses)
      : matchedCategory?.amount ?? 0;
    const gap = Math.max(0, Math.abs(Math.min(netBalance, 0)));
    const hasCashGap = gap > 0;
    const cut15 = targetAmount * 0.15;
    const cut30 = targetAmount * 0.3;
    const bestFallbackCategory = topVariableCategory && topVariableCategory[0] !== targetLabel
      ? { category: topVariableCategory[0], amount: topVariableCategory[1] }
      : sortedCategories.find(({ category }) => category !== targetLabel);
    const targetReference = targetLabel === "esse corte" ? "desse gasto" : `de **${targetLabel}**`;
    const targetQuestion = targetLabel === "esse corte" ? "nesse corte" : `em **${targetLabel}**`;
    const isSubscriptionTarget = /(assinatura|assinaturas)/.test(compactText(targetLabel));
    const immediateAction = isSubscriptionTarget
      ? "cancele ou pause as assinaturas sem uso ate chegar no maior valor possivel"
      : `reduza ou adie gastos ${targetQuestion} ate chegar no maior valor possivel`;

    if (targetAmount <= 0) {
      const fallbackLine = bestFallbackCategory
        ? `Pelos lancamentos deste mes, o maior alvo visivel e **${bestFallbackCategory.category}**, com ${formatCurrency(bestFallbackCategory.amount)}.`
        : `Ainda nao tenho uma categoria forte o suficiente para medir esse corte nos lancamentos do mes.`;
      const setupAction = targetLabel === "esse corte"
        ? "cadastre esse gasto de forma mais clara"
        : `cadastre ou ajuste lancamentos ${targetReference} com esse nome`;
      const cashActionLine = hasCashGap
        ? `Como o mes esta negativo em **${formatCurrency(gap)}**, eu faria assim: ${setupAction}, some quanto custa, e corte primeiro o que nao for essencial.`
        : `Como seu caixa projetado esta em **${formatCurrency(netBalance)}**, esse corte serviria para aumentar sua folga. Eu faria assim: ${setupAction}, some quanto custa, e corte primeiro o que nao for essencial.`;
      const nextStepLine = hasCashGap
        ? "Com esse numero eu te falo se o corte resolve o buraco ou se precisamos atacar outra categoria junto."
        : "Com esse numero eu te falo quanta folga isso cria e qual destino priorizar para o dinheiro.";

      return `Boa direcao. So que eu nao encontrei **${targetLabel}** de forma clara nos lancamentos deste mes, entao nao quero fingir uma conta.

${fallbackLine}

${cashActionLine}

Me diga o valor aproximado ${targetReference}. ${nextStepLine}`;
    }

    const remainingAfter15 = Math.max(0, gap - cut15);
    const remainingAfter30 = Math.max(0, gap - cut30);
    const fullCutLine = !hasCashGap
      ? `Se voce cortar essa categoria, o valor economizado vira folga para reserva, divida ou meta.`
      : targetAmount >= gap
      ? `Se voce conseguisse cortar **${formatCurrency(gap)}** dentro dessa categoria, ela sozinha cobriria o buraco do mes.`
      : `Mesmo zerando essa categoria, ainda faltariam **${formatCurrency(gap - targetAmount)}** para cobrir todo o buraco do mes.`;
    const fallbackLine = bestFallbackCategory
      ? `Se esse corte nao chegar la, o segundo alvo deveria ser **${bestFallbackCategory.category}**, que soma ${formatCurrency(bestFallbackCategory.amount)}.`
      : `Se esse corte nao chegar la, o proximo passo e revisar uma segunda despesa variavel.`;
    const cashProblemLine = hasCashGap
      ? `O problema e que o caixa esta negativo em **${formatCurrency(gap)}**.`
      : `Seu caixa projetado esta em **${formatCurrency(netBalance)}**; esse corte aumentaria sua folga.`;
    const impactLines = hasCashGap
      ? `1. Cortar 15% liberaria cerca de **${formatCurrency(cut15)}**; ainda faltariam **${formatCurrency(remainingAfter15)}**.
2. Cortar 30% liberaria cerca de **${formatCurrency(cut30)}**; ainda faltariam **${formatCurrency(remainingAfter30)}**.`
      : `1. Cortar 15% liberaria cerca de **${formatCurrency(cut15)}**; sua folga iria para **${formatCurrency(netBalance + cut15)}**.
2. Cortar 30% liberaria cerca de **${formatCurrency(cut30)}**; sua folga iria para **${formatCurrency(netBalance + cut30)}**.`;

    return `Boa. **${targetLabel}** faz sentido como primeiro corte, principalmente porque e uma despesa que costuma ser negociavel.

Pelos dados cadastrados, essa categoria soma **${formatCurrency(targetAmount)}** no mes. ${cashProblemLine}

Minha leitura:

${impactLines}
3. ${fullCutLine}

Entao eu faria assim: hoje, ${immediateAction}. ${fallbackLine}

Quanto voce acha que consegue reduzir ${targetQuestion} este mes: algo perto de ${formatCurrency(cut15)}, ${formatCurrency(cut30)} ou mais?`;
  };

  const buildPriorityReply = () => {
    if (totalIncome <= 0 && totalExpenses <= 0 && activeDebts.length === 0 && activeGoals.length === 0) {
      return `Sem problema. Antes de qualquer conselho, eu preciso de um minimo de dados cadastrados para nao inventar uma prioridade.

Eu comecaria por isto:

1. Cadastre sua renda principal do mes.
2. Cadastre as despesas fixas que nao da para evitar.
3. Cadastre dividas e parcelas, se existirem.

Com isso eu ja consigo te dizer, com numeros, se o primeiro passo e cortar gasto, pagar divida, montar reserva ou acelerar uma meta.`;
    }

    const contextLine = unsureFollowUp
      ? `Sem problema. Vou escolher por voce com base no que esta cadastrado agora.`
      : previousUserMessage
        ? `Olhando para sua pergunta e para o historico da conversa, eu faria assim.`
        : `Eu faria assim.`;

    if (overdueBills.length > 0) {
      return `${contextLine}

Primeiro eu resolveria as **contas atrasadas**. Elas vem antes de investimento, metas e amortizacao extra, porque atraso costuma virar multa, juros e efeito cascata no resto do mes.

Hoje, eu faria nesta ordem:

1. Separaria o valor das ${overdueBills.length} conta(s) atrasada(s) e tentaria quitar ou renegociar ainda hoje.
2. Se nao der para pagar tudo, eu ligaria para o credor e buscaria uma data/parcelamento que caiba no caixa.
3. Depois disso, eu travaria novas despesas variaveis ate o saldo mensal parar de piorar.

O numero que eu ficaria olhando e o saldo mensal: hoje ele esta em **${formatCurrency(netBalance)}** depois de despesas e parcelas.

Me diga uma coisa: essas contas atrasadas ainda estao pendentes de verdade ou alguma ja foi paga fora do app?`;
    }

    if (netBalance < 0) {
      const gap = Math.abs(netBalance);
      const variableCut = topVariableCategory
        ? `O corte mais rapido parece estar em **${topVariableCategory[0]}**. Essa categoria soma ${formatCurrency(topVariableCategory[1])}; reduzir 15% liberaria cerca de ${formatCurrency(topVariableCategory[1] * 0.15)}.`
        : `Eu revisaria as despesas variaveis uma por uma e separaria o que pode esperar para o mes seguinte.`;
      const receivableHelp = pendingReceivablesTotal > 0
        ? `Voce tambem tem ${formatCurrency(pendingReceivablesTotal)} a receber. Eu ja definiria que parte desse dinheiro vai cobrir o buraco do mes quando entrar.`
        : `Se houver renda ou saldo fora do app, vale me informar, porque isso muda o tamanho real do problema.`;

      return `${contextLine}

Eu comecaria pelo **fluxo de caixa**, nao por investimento nem por meta. Pelos dados cadastrados, o mes fecha negativo em **${formatCurrency(gap)}**.

O primeiro passo e recuperar esse valor. Bem pratico:

1. Hoje: pare novas despesas nao essenciais ate achar pelo menos **${formatCurrency(gap)}** entre corte, renegociacao ou entrada extra.
2. ${variableCut}
3. ${highestInterestDebt ? `Nao colocaria dinheiro novo em meta ou investimento antes de olhar a divida "${highestInterestDebt.description}", que tem taxa de ${formatPercent(highestInterestDebt.interestRate)} ao mes.` : `Depois que o saldo voltar para zero, ai sim eu pensaria em reserva ou meta.`}

${receivableHelp}

Se voce quiser fazer comigo passo a passo, me diga: qual despesa deste mes voce consegue reduzir ou adiar primeiro?`;
    }

    if (debtServiceRatio > 20 || highestInterestDebt) {
      return `${contextLine}

Eu comecaria pelas **dividas e parcelas**. Seu comprometimento mensal com parcelas esta em **${formatPercent(debtServiceRatio)} da renda** (${formatCurrency(debtMonthlyImpact)} por mes).

Minha ordem seria:

1. Manter todas as contas do mes em dia.
2. Atacar primeiro ${highestInterestDebt ? `a divida **"${highestInterestDebt.description}"**, porque ela tem a maior taxa cadastrada: ${formatPercent(highestInterestDebt.interestRate)} ao mes.` : `a parcela que mais pesa no caixa mensal.`}
3. Tentar trazer o peso das parcelas para baixo de 15% da renda antes de assumir novas compras parceladas.

O ponto de atencao: seu saldo mensal projetado esta em **${formatCurrency(netBalance)}**. Entao qualquer amortizacao extra precisa caber sem deixar o mes negativo.

Me confirme uma coisa: as taxas e parcelas das dividas cadastradas estao atualizadas?`;
    }

    if (savingsRate < 10) {
      return `${contextLine}

Eu comecaria criando **sobra mensal minima**. Hoje sua taxa de poupanca esta em **${formatPercent(savingsRate)}**, entao qualquer imprevisto pode apertar o mes.

O plano simples:

1. Defina uma sobra obrigatoria pequena, de 5% da renda, logo depois que o dinheiro entrar.
2. ${topVariableCategory ? `Para abrir espaco, eu reduziria primeiro **${topVariableCategory[0]}**, que soma ${formatCurrency(topVariableCategory[1])}.` : `Revise gastos variaveis e escolha um teto para o mes.`}
3. So aumente esse valor depois de confirmar que contas e parcelas continuam em dia.

Com os dados atuais, sua sobra projetada e **${formatCurrency(netBalance)}**.

Quer que eu transforme isso em um valor exato de reserva mensal para voce perseguir?`;
    }

    if (nearestGoal) {
      const remaining = Math.max(0, nearestGoal.targetAmount - nearestGoal.currentAmount);
      const months = monthsUntil(now, new Date(nearestGoal.deadline));
      const monthlyNeeded = remaining / months;

      return `${contextLine}

Eu comecaria pela meta **"${nearestGoal.title}"**, porque ela e a mais proxima no calendario.

Faltam **${formatCurrency(remaining)}**. No prazo atual, isso pede cerca de **${formatCurrency(monthlyNeeded)} por mes**. Sua sobra projetada esta em **${formatCurrency(netBalance)}**.

Minha decisao seria:

1. Se esse aporte couber na sobra, automatize logo apos receber.
2. Se nao couber, ajuste prazo ou valor-alvo agora, antes de criar frustracao.
3. Nao sacrifique reserva ou contas essenciais para bater essa meta.

Me diga: essa meta e obrigatoria ou pode ser adiada um pouco?`;
    }

    return `${contextLine}

Seu caixa parece administravel agora. Eu comecaria protegendo essa folga, porque o saldo mensal projetado esta em **${formatCurrency(netBalance)}**.

Minha ordem seria:

1. Separar o valor das contas pendentes${pendingBills.length > 0 ? ` (${formatCurrency(pendingBillsTotal)})` : ""}.
2. Guardar uma parte da sobra como reserva.
3. Depois disso, escolher uma meta clara para os proximos 90 dias.

O que eu nao faria agora: transformar toda a sobra em consumo novo.

Me diga qual e seu objetivo principal nos proximos meses: reserva, quitar divida, comprar algo especifico ou investir?`;
  };

  if (isGreetingOnly(question)) {
    const shortStatus = netBalance < 0
      ? `Pelo que esta cadastrado, seu saldo mensal projetado esta negativo em ${formatCurrency(Math.abs(netBalance))}.`
      : totalIncome > 0 || totalExpenses > 0 || debtMonthlyImpact > 0
        ? `Pelo que esta cadastrado, seu saldo mensal projetado esta em ${formatCurrency(netBalance)}.`
        : `Ainda preciso dos seus lancamentos para personalizar a analise com numeros.`;

    const suggestedFocus = netBalance < 0
      ? `posso te ajudar a montar um plano para voltar ao azul.`
      : activeDebts.length > 0
        ? `posso te ajudar a priorizar dividas, gastos e metas.`
        : activeGoals.length > 0
          ? `posso te ajudar a ajustar o ritmo das suas metas.`
          : `posso te ajudar a diagnosticar receitas, despesas, dividas e metas.`;

    return `Ola! Sou seu Consultor Financeiro IA.

${shortStatus} ${suggestedFocus}

Para comecar, me diga o que voce quer resolver agora. Exemplos:

- Qual e minha prioridade financeira este mes?
- Quais gastos posso cortar?
- Tenho folga para investir?
- Como organizo minhas dividas?`;
  }

  if (!wantsDetailedReport && previousAssistantMessage && looksLikeActionProposal(question)) {
    return buildActionProposalReply();
  }

  if (!wantsDetailedReport && focus === "priority") {
    return buildPriorityReply();
  }

  if (!wantsDetailedReport && focus === "debt") {
    const debtLines = activeDebts.length > 0
      ? activeDebts
          .slice()
          .sort((a, b) => b.interestRate - a.interestRate)
          .slice(0, 4)
          .map((debt) => {
            const installment = debt.installmentAmount
              ? debt.installmentAmount
              : calcPMT(debt.originalAmount, debt.interestRate, debt.installments);
            return `- **${debt.description}:** saldo ${formatCurrency(debt.remainingBalance)}, parcela ${formatCurrency(installment)}, taxa ${formatPercent(debt.interestRate)} ao mes.`;
          })
          .join("\n")
      : "- Nao encontrei dividas ativas cadastradas.";

    const directAnswer = activeDebts.length > 0
      ? highestInterestDebt
        ? `A prioridade e a divida "${highestInterestDebt.description}", porque ela tem a maior taxa cadastrada: ${formatPercent(highestInterestDebt.interestRate)} ao mes.`
        : `A prioridade e reduzir o peso das parcelas no seu fluxo mensal.`
      : `Nao encontrei dividas ativas no cadastro. Se existe cartao, cheque especial ou emprestimo fora do app, cadastre para eu priorizar corretamente.`;

    return `## Resposta direta

${directAnswer}

## O que seus dados mostram

- **Parcelas do mes:** ${formatCurrency(debtMonthlyImpact)} (${formatPercent(debtServiceRatio)} da renda)
- **Saldo total em dividas:** ${formatCurrency(totalDebt)}
- **Saldo mensal depois de despesas e parcelas:** ${formatCurrency(netBalance)}
- **Contas atrasadas:** ${overdueBills.length}

${debtLines}

## O que fazer agora

1. ${overdueBills.length > 0 ? `Regularize ou renegocie as ${overdueBills.length} conta(s) atrasada(s) antes de amortizar outras dividas.` : highestInterestDebt ? `Direcione qualquer valor extra primeiro para "${highestInterestDebt.description}".` : `Confirme se todas as dividas reais estao cadastradas.`}
2. ${debtServiceRatio > 20 ? `Renegocie parcelas para reduzir o comprometimento de ${formatPercent(debtServiceRatio)} para abaixo de 15% da renda.` : `Mantenha as parcelas em dia e evite assumir nova divida ate ter reserva.`}
3. ${netBalance < 0 ? `Libere pelo menos ${formatCurrency(Math.abs(netBalance))} no mes com cortes, renegociacao ou entrada extra antes de pensar em investimento.` : `Use parte da sobra de ${formatCurrency(netBalance)} para amortizar a divida mais cara ou reforcar reserva.`}

## Preciso confirmar

- As taxas e parcelas cadastradas estao atualizadas?
- Existe divida de cartao, cheque especial ou emprestimo fora do app?`;
  }

  if (!wantsDetailedReport && focus === "expense") {
    const categoryLines = sortedCategories.length > 0
      ? sortedCategories
          .slice(0, 5)
          .map(({ category, amount }) => `- **${category}:** ${formatCurrency(amount)} (${formatPercent(totalIncome > 0 ? (amount / totalIncome) * 100 : 0)} da renda)`)
          .join("\n")
      : "- Nao encontrei despesas cadastradas no mes atual.";

    return `## Resposta direta

${topVariableCategory ? `O melhor corte inicial esta em **${topVariableCategory[0]}**: essa categoria soma ${formatCurrency(topVariableCategory[1])}. Um corte de 15% liberaria cerca de ${formatCurrency(topVariableCategory[1] * 0.15)} neste mes.` : `Ainda nao ha despesas variaveis suficientes para eu apontar um corte com precisao.`}

## O que seus dados mostram

- **Receitas do mes:** ${formatCurrency(totalIncome)}
- **Despesas fixas:** ${formatCurrency(fixedTotal)} (${formatPercent(totalIncome > 0 ? (fixedTotal / totalIncome) * 100 : 0)} da renda)
- **Despesas variaveis:** ${formatCurrency(variableTotal)} (${formatPercent(totalIncome > 0 ? (variableTotal / totalIncome) * 100 : 0)} da renda)
- **Saldo mensal depois de parcelas:** ${formatCurrency(netBalance)}

${categoryLines}

## O que fazer agora

1. ${topVariableCategory ? `Defina teto de ${formatCurrency(topVariableCategory[1] * 0.85)} para ${topVariableCategory[0]} neste mes.` : `Cadastre as principais despesas do mes por categoria.`}
2. Separe gastos em essencial, negociavel e cortavel.
3. ${netBalance < 0 ? `A meta minima e liberar ${formatCurrency(Math.abs(netBalance))} para sair do vermelho.` : `Direcione parte da sobra de ${formatCurrency(netBalance)} para reserva ou meta prioritaria.`}

## Preciso confirmar

- Alguma despesa de cartao ainda nao entrou no app?
- Existe gasto grande previsto nos proximos 30 dias?`;
  }

  if (!wantsDetailedReport && focus === "goal") {
    const goalLines = activeGoals.length > 0
      ? activeGoals
          .slice()
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
          .slice(0, 4)
          .map((goal) => {
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const months = monthsUntil(now, new Date(goal.deadline));
            return `- **${goal.title}:** faltam ${formatCurrency(remaining)}; ritmo necessario de ${formatCurrency(remaining / months)} por mes.`;
          })
          .join("\n")
      : "- Nao encontrei metas ativas cadastradas.";

    const firstGoal = activeGoals
      .slice()
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
    const firstGoalRemaining = firstGoal ? Math.max(0, firstGoal.targetAmount - firstGoal.currentAmount) : 0;
    const firstGoalMonthly = firstGoal ? firstGoalRemaining / monthsUntil(now, new Date(firstGoal.deadline)) : 0;

    return `## Resposta direta

${firstGoal ? `A meta que merece prioridade agora e **${firstGoal.title}**. Ela precisa de cerca de ${formatCurrency(firstGoalMonthly)} por mes para cumprir o prazo.` : `Voce ainda nao tem meta ativa suficiente para eu calcular ritmo de aporte.`}

## O que seus dados mostram

- **Saldo mensal disponivel apos despesas e parcelas:** ${formatCurrency(netBalance)}
- **Metas ativas:** ${activeGoals.length}
- **Metas concluidas:** ${completedGoals}
- **Progresso medio das metas ativas:** ${formatPercent(goalProgress)}

${goalLines}

## O que fazer agora

1. ${firstGoal ? `Compare o aporte necessario da meta "${firstGoal.title}" com sua sobra mensal de ${formatCurrency(netBalance)}.` : `Cadastre uma meta com valor-alvo e prazo.`}
2. ${netBalance < 0 ? `Antes de aportar em meta, corrija o saldo negativo de ${formatCurrency(Math.abs(netBalance))}.` : firstGoalMonthly > netBalance ? `Ajuste prazo, valor-alvo ou aporte: hoje a meta pede mais do que a sobra projetada.` : `Automatize o aporte logo apos a entrada da renda.`}
3. Revise metas que competem com contas pendentes ou dividas caras.

## Preciso confirmar

- Essa meta e essencial, desejavel ou pode esperar?
- Existe reserva fora do app que ja conta para essa meta?`;
  }

  if (!wantsDetailedReport && focus === "savings") {
    return `## Resposta direta

${netBalance <= 0 ? `Com os dados cadastrados, ainda nao ha folga segura para investir: o saldo mensal esta em ${formatCurrency(netBalance)}.` : debtServiceRatio > 20 ? `Voce tem alguma folga, mas as parcelas ainda consomem ${formatPercent(debtServiceRatio)} da renda; antes de investir, reduza esse peso.` : `Ha uma sobra projetada de ${formatCurrency(netBalance)}. O primeiro destino deveria ser reserva e metas de curto prazo, antes de buscar rendimento.`}

## O que seus dados mostram

- **Receitas do mes:** ${formatCurrency(totalIncome)}
- **Despesas + parcelas:** ${formatCurrency(totalExpenses + debtMonthlyImpact)}
- **Saldo mensal:** ${formatCurrency(netBalance)}
- **Taxa de poupanca:** ${formatPercent(savingsRate)}
- **Contas pendentes:** ${pendingBills.length} (${formatCurrency(sumAmount(pendingBills))})
- **Dividas ativas:** ${activeDebts.length}

## O que fazer agora

1. ${netBalance <= 0 ? `Recupere pelo menos ${formatCurrency(Math.abs(netBalance))} de fluxo antes de pensar em aporte.` : `Separe primeiro o valor das contas pendentes e so invista o que sobrar depois disso.`}
2. ${highestInterestDebt ? `Compare qualquer rendimento esperado com a taxa da divida "${highestInterestDebt.description}" (${formatPercent(highestInterestDebt.interestRate)} ao mes).` : `Monte reserva de emergencia antes de produtos de maior risco ou prazo.`}
3. Defina o objetivo do dinheiro: reserva, meta de curto prazo, medio prazo ou aposentadoria.

## Preciso confirmar

- Quanto voce ja tem em conta ou reserva fora do app?
- O objetivo e liquidez imediata, meta com prazo ou acumulacao de longo prazo?`;
  }

  if (!wantsDetailedReport && focus === "health") {
    const mainRisk = overdueBills.length > 0
      ? `contas atrasadas`
      : netBalance < 0
        ? `saldo mensal negativo`
        : debtServiceRatio > 20
          ? `parcelas pesadas`
          : savingsRate < 10
            ? `baixa sobra mensal`
            : `manter disciplina e transformar sobra em progresso`;

    return `## Resposta direta

Sua saude financeira hoje depende principalmente de **${mainRisk}**.

## O que seus dados mostram

- **Receitas:** ${formatCurrency(totalIncome)}
- **Despesas:** ${formatCurrency(totalExpenses)}
- **Parcelas de dividas:** ${formatCurrency(debtMonthlyImpact)}
- **Saldo mensal:** ${formatCurrency(netBalance)}
- **Taxa de poupanca:** ${formatPercent(savingsRate)}
- **Comparacao com mes anterior:** receitas ${monthIncomeDiff >= 0 ? "subiram" : "cairam"} ${formatCurrency(Math.abs(monthIncomeDiff))}; despesas ${monthExpenseDiff >= 0 ? "subiram" : "cairam"} ${formatCurrency(Math.abs(monthExpenseDiff))}.

## Plano curto

1. ${overdueBills.length > 0 ? `Resolver as ${overdueBills.length} conta(s) atrasada(s).` : netBalance < 0 ? `Cortar ou renegociar ${formatCurrency(Math.abs(netBalance))} para fechar no azul.` : `Preservar a sobra mensal de ${formatCurrency(netBalance)}.`}
2. ${topVariableCategory ? `Atacar ${topVariableCategory[0]}, que e o maior gasto variavel do mes.` : `Classificar melhor as despesas para achar cortes reais.`}
3. ${activeDebts.length > 0 ? `Revisar dividas antes de aumentar consumo ou investimentos.` : `Criar reserva e uma meta objetiva para os proximos 90 dias.`}

## Preciso confirmar

- Ha saldo em conta, reserva ou investimento fora do app?
- Alguma fatura futura ainda nao foi cadastrada?`;
  }

  if (!wantsDetailedReport && focus === "general") {
    return buildPriorityReply();
  }

  const suggestions = buildSuggestions({
    focus,
    now,
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRate,
    debtMonthlyImpact,
    debtServiceRatio,
    activeDebts,
    overdueBills,
    pendingBills,
    pendingReceivables,
    topVariableExpense: topVariableCategory
      ? { category: topVariableCategory[0], amount: topVariableCategory[1] }
      : undefined,
    activeGoals,
  });

  const quickAssessment =
    netBalance > 0 && savingsRate >= 20
      ? "Seu caixa esta saudavel neste momento."
      : netBalance > 0
        ? "Seu caixa ainda esta positivo, mas pede mais disciplina para sobrar mais no fim do mes."
      : "Seu fluxo de caixa esta sob pressao e precisa de ajuste imediato.";

  const advisorOpening = overdueBills.length > 0
    ? `ha conta atrasada no radar, entao a prioridade e estancar multa, juros e efeito cascata antes de pensar em novos objetivos.`
    : netBalance < 0
      ? `o mes esta fechando no vermelho em ${formatCurrency(Math.abs(netBalance))}; o foco agora e recuperar fluxo de caixa, nao buscar rendimento.`
      : debtServiceRatio > 25
        ? `seu caixa ainda respira, mas as parcelas ja tomam ${formatPercent(debtServiceRatio)} da renda e limitam sua liberdade de decisao.`
        : savingsRate < 10
          ? `voce ainda tem pouco espaco de sobra; com ${formatPercent(savingsRate)} de taxa de poupanca, qualquer imprevisto pode apertar o mes.`
          : savingsRate >= 20 && debtServiceRatio <= 15
            ? `a base do mes esta boa; agora o ganho vem de proteger a reserva, acelerar metas e evitar concentracao em gastos variaveis.`
            : `sua situacao esta administravel, mas ainda precisa de prioridade clara para transformar sobra em progresso.`;

  const primaryPriority = overdueBills.length > 0
    ? `regularizar as ${overdueBills.length} conta(s) atrasada(s) e impedir novos atrasos.`
    : netBalance < 0
      ? `liberar pelo menos ${formatCurrency(Math.abs(netBalance))} no mes entre cortes, renegociacao ou entradas extras.`
      : highestInterestDebt
        ? `reduzir a divida "${highestInterestDebt.description}", que tem a maior taxa cadastrada (${formatPercent(highestInterestDebt.interestRate)} ao mes).`
        : savingsRate < 10
          ? `criar uma sobra automatica minima de 5% a 10% da renda antes de aumentar consumo.`
          : activeGoals[0]
            ? `dar ritmo para a meta "${activeGoals[0].title}" sem comprometer a liquidez.`
            : `manter a sobra mensal positiva e criar uma meta financeira objetiva para os proximos 90 dias.`;

  const monthlyPlan = [
    pendingBills.length > 0
      ? `Separar ${formatCurrency(sumAmount(pendingBills))} para as contas pendentes antes de assumir novos gastos.`
      : `Manter as contas em dia e reservar uma parte da sobra assim que a renda entrar.`,
    topVariableCategory
      ? `Reduzir ${topVariableCategory[0]} para no maximo ${formatCurrency(topVariableCategory[1] * 0.85)} neste mes.`
      : `Classificar os gastos do mes em essenciais, negociaveis e cortaveis.`,
    highestInterestDebt
      ? `Destinar qualquer valor extra primeiro para a divida "${highestInterestDebt.description}".`
      : `Criar ou reforcar uma reserva antes de assumir objetivos mais longos.`,
    activeGoals[0]
      ? `Revisar a meta "${activeGoals[0].title}" e confirmar se o aporte necessario cabe no caixa.`
      : `Cadastrar uma meta de curto prazo para transformar a sobra em compromisso.`,
  ];

  const confirmationPoints = [
    `Qual valor voce tem hoje em conta ou reserva fora do Saldo Inteligente?`,
    activeDebts.length > 0
      ? `As taxas e parcelas das dividas cadastradas estao atualizadas?`
      : `Existe alguma divida de cartao, cheque especial ou emprestimo ainda nao cadastrada?`,
    focus === "savings"
      ? `Seu objetivo e reserva de emergencia, investimento de medio prazo ou aposentadoria?`
      : `Ha algum gasto grande previsto para os proximos 30 a 90 dias?`,
  ];

  const suggestionText = suggestions.length > 0
    ? suggestions.map((suggestion, index) => `${index + 1}. **${suggestion.title}**\n${suggestion.body}`).join("\n\n")
    : `1. **Complete seu diagnostico financeiro**\nCadastre pelo menos uma receita, suas despesas fixas, eventuais dividas e uma meta. Sem esses dados, eu consigo orientar o metodo, mas nao consigo priorizar seu dinheiro com precisao.`;

  const latestQuestionLine = question.trim()
    ? `Pergunta do usuario: "${question.trim()}". A analise abaixo foi priorizada com esse foco.\n\n`
    : "";

  const topCategoryLines = sortedCategories.length > 0
    ? sortedCategories
        .slice(0, 3)
        .map(({ category, amount }) => `- **${category}:** ${formatCurrency(amount)}`)
        .join("\n")
    : "- Nenhuma despesa registrada no mes atual.";

  const recentLines = [
    ...recentIncomes
      .slice(0, 3)
      .map((income) => `- Entrada: ${formatCurrency(income.amount)} em ${income.description} (${income.category})`),
    ...recentExpenses
      .slice(0, 5)
      .map((expense) => `- Saida: ${formatCurrency(expense.amount)} em ${expense.description} (${expense.category})`),
  ].join("\n");

  const nextSteps = [
    overdueBills.length > 0
      ? `Quite ou renegocie hoje as ${overdueBills.length} conta(s) atrasada(s).`
      : pendingBills.length > 0
        ? `Reserve agora o valor das ${pendingBills.length} conta(s) pendente(s) para evitar atraso.`
        : "Voce nao tem contas pendentes no momento; preserve essa folga no seu planejamento.",
    topVariableCategory
      ? `Defina um teto mensal para ${topVariableCategory[0]} abaixo de ${formatCurrency(topVariableCategory[1] * 0.85)}.`
      : "Revise os gastos do mes e marque o que e essencial versus o que pode esperar.",
    activeDebts.length > 0
      ? `Escolha uma divida para amortizacao extra neste mes, de preferencia a de juros mais altos.`
      : "Mantenha o caixa positivo e direcione parte da sobra para reserva ou investimento.",
    pendingReceivables.length > 0
      ? `Acompanhe os ${pendingReceivables.length} recebimentos pendentes e ja defina destino para esse dinheiro.`
      : "Automatize uma transferencia para a reserva no dia da entrada da renda.",
    activeGoals[0]
      ? `Reveja a meta "${activeGoals[0].title}" e ajuste o aporte do mes conforme sua prioridade real.`
      : "Crie ao menos uma meta financeira clara para o proximo trimestre.",
  ].slice(0, 5);

  return `${latestQuestionLine}## Parecer do consultor

Vou ser direto: ${advisorOpening}

**Prioridade principal:** ${primaryPriority}

**Limite da analise:** estou usando os dados cadastrados no Saldo Inteligente. Se houver saldo em conta, investimentos, fatura futura de cartao ou renda fora do app, isso pode mudar a recomendacao.

## Diagnostico

- **Receitas do mes:** ${formatCurrency(totalIncome)}
- **Despesas fixas:** ${formatCurrency(fixedTotal)} (${formatPercent(totalIncome > 0 ? (fixedTotal / totalIncome) * 100 : 0)} da renda)
- **Despesas variaveis:** ${formatCurrency(variableTotal)} (${formatPercent(totalIncome > 0 ? (variableTotal / totalIncome) * 100 : 0)} da renda)
- **Dividas (parcelas):** ${formatCurrency(debtMonthlyImpact)} (${formatPercent(debtServiceRatio)} da renda)
- **Saldo mensal apos despesas e parcelas:** ${formatCurrency(netBalance)}

${quickAssessment}

## Analise dos numeros

- **Saldo Mensal:** ${formatCurrency(netBalance)}. ${netBalance >= 0 ? "Voce termina o mes no azul." : "Hoje voce fecha o mes no vermelho."}
- **Taxa de Poupanca:** ${formatPercent(savingsRate)}. ${savingsRate >= 20 ? "Nivel saudavel." : savingsRate >= 10 ? "Aceitavel, mas ainda apertado." : "Baixa para quem quer ganhar folga no caixa."}
- **Comprometimento com Dividas:** ${formatPercent(debtServiceRatio)} da renda mensal e ${formatPercent(debtToIncomeRatio)} da renda anualizada. ${debtServiceRatio <= 15 ? "Peso controlado." : debtServiceRatio <= 25 ? "Pede atencao." : "Ja pressiona o orcamento."}
- **Comparacao com o mes anterior:** receitas ${monthIncomeDiff >= 0 ? "subiram" : "cairam"} ${formatCurrency(Math.abs(monthIncomeDiff))} e despesas ${monthExpenseDiff >= 0 ? "subiram" : "cairam"} ${formatCurrency(Math.abs(monthExpenseDiff))}.
- **Metas em andamento:** ${activeGoals.length} ativa(s), ${completedGoals} concluida(s), progresso medio de ${formatPercent(goalProgress)}.
- **Contas a receber:** ${formatCurrency(sumAmount(pendingReceivables))} pendente(s).
- **Maiores categorias de despesa no mes:**
${topCategoryLines}

## O que fazer agora

${suggestionText}

## Plano para este mes

${monthlyPlan.map((step) => `- ${step}`).join("\n")}

## Pontos que preciso confirmar

${confirmationPoints.map((point) => `- ${point}`).join("\n")}

## Proximos passos no app

${nextSteps.map((step) => `- ${step}`).join("\n")}

${recentLines ? `\nTransacoes recentes relevantes:\n${recentLines}` : ""}`;
}

export function createSsePayloadChunks(content: string) {
  const chunks: string[] = [];
  const paragraphChunks = content.split("\n");

  for (const paragraph of paragraphChunks) {
    if (!paragraph) {
      chunks.push("\n");
      continue;
    }

    const words = paragraph.split(" ");
    let buffer = "";
    for (const word of words) {
      const nextValue = buffer ? `${buffer} ${word}` : word;
      if (nextValue.length > 90) {
        chunks.push(`${buffer}\n`);
        buffer = word;
      } else {
        buffer = nextValue;
      }
    }
    if (buffer) chunks.push(`${buffer}\n`);
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
