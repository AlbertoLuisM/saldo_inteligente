"use client";
import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Wallet, CreditCard,
  Heart, Target, Plus, ArrowUpRight, ArrowDownRight,
  Bot, AlertCircle, CheckCircle, AlertTriangle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const BarChartComponent = dynamic(() => import("@/components/dashboard/bar-chart"), { ssr: false });
const DonutChartComponent = dynamic(() => import("@/components/dashboard/donut-chart"), { ssr: false });

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalDebt: number;
  debtMonthlyImpact: number;
  debtInstallments: number;
  incomeChange: number;
  expenseChange: number;
  balanceChange: number;
  categoryData: { name: string; value: number }[];
  monthlyData: { month: string; income: number; expense: number; debt?: number }[];
  recentTransactions: { type: string; description: string; amount: number; date: string; category: string }[];
  goals: { id: string; title: string; targetAmount: number; currentAmount: number; category: string; progress: number }[];
  goalProgress: number;
  healthScore: number;
  nearDueCount: number;
  nearDueTotal: number;
}

const INSIGHTS_COLORS: Record<string, string> = {
  success: '#d1fae5',
  warning: '#fef3c7',
  danger: '#fee2e2',
};
const INSIGHTS_TEXT: Record<string, string> = {
  success: '#065f46',
  warning: '#92400e',
  danger: '#991b1b',
};

function generateInsights(data: DashboardData) {
  const insights: { type: 'success' | 'warning' | 'danger'; icon: any; text: string }[] = [];
  if (!data) return insights;

  const savingsRate = data.totalIncome > 0 ? ((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100 : 0;
  if (savingsRate > 20) {
    insights.push({ type: 'success', icon: CheckCircle, text: `Sua taxa de poupança está em ${savingsRate.toFixed(0)}%! Continue assim!` });
  } else if (savingsRate < 10) {
    insights.push({ type: 'danger', icon: AlertCircle, text: `Taxa de poupança baixa: ${savingsRate.toFixed(0)}%. Revise seus gastos mensais.` });
  }

  if (data.expenseChange > 15) {
    insights.push({ type: 'warning', icon: AlertTriangle, text: `Gastos aumentaram ${data.expenseChange.toFixed(0)}% em relação ao mês anterior.` });
  }

  if (data.nearDueCount > 0) {
    insights.push({ type: 'danger', icon: AlertCircle, text: `Você tem ${data.nearDueCount} conta(s) vencendo esta semana. Não esqueça!` });
  }

  if (data.goalProgress > 60) {
    insights.push({ type: 'success', icon: CheckCircle, text: `Ótimo progresso nas metas: ${data.goalProgress.toFixed(0)}% concluído!` });
  }

  if (data.healthScore >= 70) {
    insights.push({ type: 'success', icon: CheckCircle, text: `Saúde financeira boa: ${data.healthScore}/100. Continue mantendo!` });
  } else if (data.healthScore < 50) {
    insights.push({ type: 'warning', icon: AlertTriangle, text: `Saúde financeira precisa de atenção: ${data.healthScore}/100.` });
  }

  return insights.slice(0, 3);
}

export default function DashboardClient({ userName }: { userName: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#10b981' }} />
        <span className="ml-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Carregando...</span>
      </div>
    );
  }

  const insights = data ? generateInsights(data) : [];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Olá, <span style={{ color: '#10b981' }}>{userName}</span> 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">Sua saúde financeira está sendo monitorada. Bom trabalho!</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:flex-wrap sm:justify-end">
          <Link href="/receitas?new=1" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#10b981' }}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Nova</span> Receita
          </Link>
          <Link href="/despesas?new=1" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#ef4444' }}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Nova</span> Despesa
          </Link>
          <Link href="/dividas?new=1" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#f59e0b' }}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Nova</span> Dívida
          </Link>
          <Link href="/metas?new=1" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#6366f1' }}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Nova</span> Meta
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Receita Total */}
        <div className="rounded-xl p-3 sm:p-5 text-white" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm font-medium opacity-90">Receita Total</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold">{formatCurrency(data?.totalIncome ?? 0)}</p>
          {(data?.incomeChange ?? 0) !== 0 && (
            <p className="text-xs mt-1 opacity-80">
              {(data?.incomeChange ?? 0) >= 0 ? '+' : ''}{(data?.incomeChange ?? 0).toFixed(1)}% vs mês anterior
            </p>
          )}
        </div>

        {/* Despesas Totais */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Despesas Totais</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: '#fee2e2' }}>
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#ef4444' }} />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data?.totalExpenses ?? 0)}</p>
          {(data?.expenseChange ?? 0) !== 0 && (
            <p className="text-xs mt-1" style={{ color: (data?.expenseChange ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
              {(data?.expenseChange ?? 0) >= 0 ? '+' : ''}{(data?.expenseChange ?? 0).toFixed(1)}% vs mês anterior
            </p>
          )}
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Saldo Líquido</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: '#dbeafe' }}>
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#3b82f6' }} />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold" style={{ color: (data?.netBalance ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(data?.netBalance ?? 0)}
          </p>
          {(data?.debtMonthlyImpact ?? 0) > 0 && (
            <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
              Inclui {formatCurrency(data?.debtMonthlyImpact ?? 0)} em parcelas
            </p>
          )}
          {(data?.balanceChange ?? 0) !== 0 && (
            <p className="text-xs mt-0.5" style={{ color: (data?.balanceChange ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
              {(data?.balanceChange ?? 0) >= 0 ? '+' : ''}{(data?.balanceChange ?? 0).toFixed(1)}% vs mês anterior
            </p>
          )}
        </div>

        {/* Dívidas */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Dívidas</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(data?.totalDebt ?? 0)}</p>
          {(data?.debtInstallments ?? 0) > 0 && (
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{data?.debtInstallments} parcelas restantes</p>
          )}
        </div>
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Score de Saúde</span>
            <Heart className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {data?.healthScore ?? 0}<span className="text-lg text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">/100</span>
          </p>
          <p className="text-sm mt-1" style={{ color: '#10b981' }}>
            {(data?.healthScore ?? 0) >= 70 ? 'Bom • Melhorando' : (data?.healthScore ?? 0) >= 50 ? 'Regular' : 'Precisa melhorar'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Progresso das Metas</span>
            <Target className="w-4 h-4" style={{ color: '#6366f1' }} />
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{(data?.goalProgress ?? 0).toFixed(0)}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{(data?.goals ?? []).filter((g) => g.progress < 100).length} de {data?.goals?.length ?? 0} metas ativas</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-gray-800/60 rounded-xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Receitas vs Despesas vs Dívidas</h3>
          <div className="h-48 sm:h-56">
            <BarChartComponent data={data?.monthlyData ?? []} />
          </div>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-gray-800/60 rounded-xl p-3 sm:p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Distribuição por Categoria</h3>
          <div className="h-48 sm:h-56">
            <DonutChartComponent data={data?.categoryData ?? []} />
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Transações Recentes</h3>
            <Link href="/receitas" className="text-xs" style={{ color: '#10b981' }}>Ver todas</Link>
          </div>
          <div className="space-y-3">
            {(data?.recentTransactions ?? []).length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center py-4">Nenhuma transação</p>
            )}
            {(data?.recentTransactions ?? []).map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center`}
                    style={{ background: t.type === 'income' ? '#d1fae5' : '#fee2e2' }}>
                    {t.type === 'income'
                      ? <ArrowUpRight className="w-4 h-4" style={{ color: '#10b981' }} />
                      : <ArrowDownRight className="w-4 h-4" style={{ color: '#ef4444' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(t.date)}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold" style={{ color: t.type === 'income' ? '#10b981' : '#ef4444' }}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Progresso das Metas</h3>
            <Link href="/metas" className="text-xs" style={{ color: '#10b981' }}>Ver todas</Link>
          </div>
          <div className="space-y-4">
            {(data?.goals ?? []).length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center py-4">Nenhuma meta criada</p>
            )}
            {(data?.goals ?? []).slice(0, 4).map((g) => (
              <div key={g.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{g.title}</span>
                  <span className="text-xs font-semibold" style={{ color: '#10b981' }}>{g.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 progress-track">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, g.progress)}%`, background: '#10b981' }} />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Insights da IA</h3>
            <Bot className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <div className="space-y-3">
            {insights.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center py-4">Adicione dados para ver insights</p>
            )}
            {insights.map((ins, i) => {
              const Icon = ins.icon;
              return (
                <div key={i} className="p-3 rounded-lg" style={{ background: INSIGHTS_COLORS[ins.type] }}>
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: INSIGHTS_TEXT[ins.type] }} />
                    <p className="text-xs leading-relaxed" style={{ color: INSIGHTS_TEXT[ins.type] }}>{ins.text}</p>
                  </div>
                </div>
              );
            })}
            <Link href="/consultor-ia" className="block text-center text-xs mt-2" style={{ color: '#10b981' }}>
              Ver todos os insights →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
