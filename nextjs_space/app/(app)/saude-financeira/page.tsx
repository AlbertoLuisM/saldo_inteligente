"use client";
import { useState, useEffect } from "react";
import { Heart, TrendingUp, TrendingDown, Target, CreditCard, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface HealthData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalDebt: number;
  goals: any[];
  goalProgress: number;
  healthScore: number;
}

export default function SaudeFinanceiraPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Carregando...</div>;

  const score = data?.healthScore ?? 0;
  const savingsRate = (data?.totalIncome ?? 0) > 0 ? ((data?.totalIncome ?? 0) - (data?.totalExpenses ?? 0)) / (data?.totalIncome ?? 1) * 100 : 0;
  const debtRatio = (data?.totalIncome ?? 0) > 0 ? (data?.totalDebt ?? 0) / ((data?.totalIncome ?? 1) * 12) * 100 : 0;

  const getScoreColor = (s: number) => s >= 70 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
  const getScoreLabel = (s: number) => s >= 70 ? 'Boa' : s >= 50 ? 'Regular' : 'Crítica';

  const indicators = [
    {
      label: 'Taxa de Poupança',
      value: `${savingsRate.toFixed(1)}%`,
      score: Math.min(100, savingsRate * 2.5),
      icon: TrendingUp,
      description: savingsRate >= 20 ? 'Excelente! Você poupa mais de 20% da renda.' : savingsRate >= 10 ? 'Razoável. Tente poupar mais de 20%.' : 'Baixa. Reduza gastos para poupar mais.',
      status: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'warning' : 'bad',
    },
    {
      label: 'Relação Dívida/Renda',
      value: `${debtRatio.toFixed(1)}%`,
      score: Math.min(100, Math.max(0, 100 - debtRatio)),
      icon: CreditCard,
      description: debtRatio < 30 ? 'Excelente! Dívidas sob controle.' : debtRatio < 60 ? 'Atenção! Dívidas moderadas.' : 'Perigo! Dívidas altas em relação à renda.',
      status: debtRatio < 30 ? 'good' : debtRatio < 60 ? 'warning' : 'bad',
    },
    {
      label: 'Progresso das Metas',
      value: `${(data?.goalProgress ?? 0).toFixed(0)}%`,
      score: data?.goalProgress ?? 0,
      icon: Target,
      description: (data?.goalProgress ?? 0) >= 60 ? 'Excelente progresso nas metas!' : (data?.goalProgress ?? 0) >= 30 ? 'Bom progresso. Continue!' : 'Crie e trabalhe em suas metas financeiras.',
      status: (data?.goalProgress ?? 0) >= 60 ? 'good' : (data?.goalProgress ?? 0) >= 30 ? 'warning' : 'bad',
    },
    {
      label: 'Saldo Líquido',
      value: formatCurrency(data?.netBalance ?? 0),
      score: (data?.netBalance ?? 0) > 0 ? 100 : 0,
      icon: (data?.netBalance ?? 0) >= 0 ? TrendingUp : TrendingDown,
      description: (data?.netBalance ?? 0) > 0 ? 'Receitas superam despesas. Ótimo!' : 'Despesas superam receitas. Revise seus gastos.',
      status: (data?.netBalance ?? 0) > 0 ? 'good' : 'bad',
    },
  ];

  const recommendations = [
    savingsRate < 20 && { type: 'warning', text: `Aumente sua taxa de poupança para 20%. Atualmente você poupa apenas ${savingsRate.toFixed(1)}% da renda.` },
    debtRatio > 30 && { type: 'danger', text: `Reduza suas dívidas. O ideal é que não ultrapassem 30% da renda anual.` },
    (data?.goalProgress ?? 0) < 50 && { type: 'warning', text: 'Aumente os aportes nas suas metas financeiras mensalmente.' },
    (data?.totalIncome ?? 0) === 0 && { type: 'info', text: 'Cadastre suas receitas para ter uma análise completa.' },
    savingsRate >= 30 && { type: 'success', text: 'Sua taxa de poupança está excelente! Considere diversificar investimentos.' },
  ].filter(Boolean);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Saúde Financeira</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Acompanhe o estado geral das suas finanças</p>
      </div>

      {/* Score card */}
      <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-8">
        <div className="relative flex items-center justify-center">
          <svg width="160" height="160" className="transform -rotate-90">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="12" />
            <circle cx="80" cy="80" r="70" fill="none" stroke={getScoreColor(score)} strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - score / 100)}`}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute text-center">
            <p className="text-4xl font-bold" style={{ color: getScoreColor(score) }}>{score}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">de 100</p>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5" style={{ color: getScoreColor(score) }} />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Saúde Financeira: <span style={{ color: getScoreColor(score) }}>{getScoreLabel(score)}</span></h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mb-4">
            Seu score é calculado com base na taxa de poupança, controle de dívidas e progresso das metas.
          </p>
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 rounded-lg" style={{ background: '#f0fdf4' }}>
              <p className="text-xl font-bold" style={{ color: '#10b981' }}>{savingsRate.toFixed(0)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Poupança</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg" style={{ background: '#fef3c7' }}>
              <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>{debtRatio.toFixed(0)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Dívida/Renda</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg" style={{ background: '#ede9fe' }}>
              <p className="text-xl font-bold" style={{ color: '#6366f1' }}>{(data?.goalProgress ?? 0).toFixed(0)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Metas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {indicators.map((ind, i) => {
          const Icon = ind.icon;
          const statusColors: Record<string, { bg: string; text: string; bar: string }> = {
            good: { bg: '#f0fdf4', text: '#065f46', bar: '#10b981' },
            warning: { bg: '#fefce8', text: '#92400e', bar: '#f59e0b' },
            bad: { bg: '#fff1f2', text: '#991b1b', bar: '#ef4444' },
          };
          const colors = statusColors[ind.status] ?? statusColors.warning;
          return (
            <div key={i} className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: colors.bg }}>
                    <Icon className="w-4 h-4" style={{ color: colors.bar }} />
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{ind.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{ind.value}</span>
              </div>
              <div className="w-full h-2 mb-2 progress-track">
                <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ind.score)}%`, background: colors.bar }} />
              </div>
              <p className="text-xs" style={{ color: colors.text }}>{ind.description}</p>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Recomendações</h3>
          <div className="space-y-3">
            {recommendations.map((rec: any, i) => {
              const config: Record<string, { bg: string; text: string; icon: any }> = {
                success: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle },
                warning: { bg: '#fef3c7', text: '#92400e', icon: AlertTriangle },
                danger: { bg: '#fee2e2', text: '#991b1b', icon: AlertCircle },
                info: { bg: '#dbeafe', text: '#1e40af', icon: AlertCircle },
              };
              const c = config[rec.type] ?? config.info;
              const Icon = c.icon;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: c.bg }}>
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: c.text }} />
                  <p className="text-sm" style={{ color: c.text }}>{rec.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
