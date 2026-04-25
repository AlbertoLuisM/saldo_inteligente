import type {
  AccountPayable,
  AccountReceivable,
  Debt,
  Expense,
  Goal,
  Income,
} from "@prisma/client";

type Focus = "debt" | "expense" | "goal" | "savings" | "health" | "general";

export interface ConsultorContext {
  now: Date;
  question: string;
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
  if (/(divida|dividas|emprestimo|cartao|juros|quitar)/.test(normalized)) return "debt";
  if (/(despesa|despesas|gasto|gastos|cortar|reduzir)/.test(normalized)) return "expense";
  if (/(meta|metas|objetivo|objetivos)/.test(normalized)) return "goal";
  if (/(economizar|poupar|poupanca|reserva|investir)/.test(normalized)) return "savings";
  if (/(saude financeira|saude|equilibrio|fluxo de caixa)/.test(normalized)) return "health";
  return "general";
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

  const highestInterestDebt = [...activeDebts].sort((a, b) => b.interestRate - a.interestRate)[0];

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
