import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const userId = (session.user as any).id as string;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [incomes, expenses, lastMonthIncomes, lastMonthExpenses, debts, goals, accountsPayable, recentTransactions] = await Promise.all([
      prisma.income.findMany({ where: { userId, date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.income.findMany({ where: { userId, date: { gte: startLastMonth, lte: endLastMonth } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: startLastMonth, lte: endLastMonth } } }),
      prisma.debt.findMany({ where: { userId, status: "active" } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.accountPayable.findMany({ where: { userId, status: { not: "paid" }, dueDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.$queryRaw`
        SELECT 'income' as type, description, amount, date, category FROM "Income" WHERE "userId" = ${userId}
        UNION ALL
        SELECT 'expense' as type, description, amount, date, category FROM "Expense" WHERE "userId" = ${userId}
        ORDER BY date DESC LIMIT 5
      `,
    ]);

    const totalIncome = incomes.reduce((s: number, i: any) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    const lastMonthIncome = lastMonthIncomes.reduce((s: number, i: any) => s + i.amount, 0);
    const lastMonthExpense = lastMonthExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const totalDebt = debts.reduce((s: number, d: any) => s + d.remainingBalance, 0);

    // Calcula parcela pela Tabela Price (PMT)
    function calcPMT(principal: number, ratePercent: number, n: number): number {
      if (principal <= 0 || n <= 0) return 0;
      if (ratePercent <= 0) return principal / n;
      const r = ratePercent / 100;
      return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    // Calcular impacto mensal das dívidas no saldo
    // Toda dívida ativa com parcelas pendentes impacta o saldo mensal
    let debtMonthlyImpact = 0;
    debts.forEach((d: any) => {
      const hasUnpaidInstallments = d.paidInstallments < d.installments;
      if (!hasUnpaidInstallments) return;

      // Valor da parcela: usa installmentAmount se informado, senão calcula pela Tabela Price
      const installmentValue = d.installmentAmount
        ? d.installmentAmount
        : calcPMT(d.originalAmount, d.interestRate, d.installments);

      debtMonthlyImpact += installmentValue;
    });

    const netBalance = totalIncome - totalExpenses - debtMonthlyImpact;

    const incomeChange = lastMonthIncome > 0 ? ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
    const expenseChange = lastMonthExpense > 0 ? ((totalExpenses - lastMonthExpense) / lastMonthExpense) * 100 : 0;
    const balanceChange = lastMonthIncome > 0 ? (((lastMonthIncome - lastMonthExpense) > 0 ? ((netBalance - (lastMonthIncome - lastMonthExpense)) / (lastMonthIncome - lastMonthExpense)) * 100 : 0)) : 0;

    const activeGoals = goals.filter((g: any) => g.currentAmount < g.targetAmount);
    const goalProgress = activeGoals.length > 0
      ? (activeGoals.reduce((s: number, g: any) => s + (g.currentAmount / g.targetAmount), 0) / activeGoals.length) * 100
      : 0;

    // Category breakdown for expenses
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e: any) => {
      categoryMap[e.category] = (categoryMap[e.category] ?? 0) + e.amount;
    });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    // Monthly bar chart (last 12 months)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const [mInc, mExp] = await Promise.all([
        prisma.income.aggregate({ where: { userId, date: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { userId, date: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
      ]);
      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      monthlyData.push({
        month: months[mStart.getMonth()],
        income: mInc._sum.amount ?? 0,
        expense: mExp._sum.amount ?? 0,
        debt: debtMonthlyImpact,
      });
    }

    // Health score
    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
    const debtToIncome = totalIncome > 0 ? totalDebt / (totalIncome * 12) : 1;
    const goalScore = goalProgress / 100;
    const healthScore = Math.min(100, Math.max(0, Math.round(
      savingsRate * 40 + (1 - Math.min(1, debtToIncome)) * 30 + goalScore * 30
    )));

    const nearDueCount = accountsPayable.length;
    const nearDueTotal = accountsPayable.reduce((s: number, a: any) => s + a.amount, 0);

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      netBalance,
      totalDebt,
      debtMonthlyImpact,
      debtInstallments: debts.reduce((s: number, d: any) => s + Math.max(0, d.installments - d.paidInstallments), 0),
      incomeChange,
      expenseChange,
      balanceChange,
      categoryData,
      monthlyData,
      recentTransactions,
      goals: goals.map((g: any) => ({ ...g, progress: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0 })),
      goalProgress,
      healthScore,
      nearDueCount,
      nearDueTotal,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
