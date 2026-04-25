"use client";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Target, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function VisaoFinanceiraPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#10b981' }} /></div>;

  const cards = [
    { label: 'Receita Total', value: formatCurrency(data?.totalIncome ?? 0), icon: TrendingUp, color: '#10b981', bg: '#d1fae5', href: '/receitas' },
    { label: 'Despesas Totais', value: formatCurrency(data?.totalExpenses ?? 0), icon: TrendingDown, color: '#ef4444', bg: '#fee2e2', href: '/despesas' },
    { label: 'Saldo Líquido', value: formatCurrency(data?.netBalance ?? 0), icon: Wallet, color: '#3b82f6', bg: '#dbeafe', href: '/dashboard' },
    { label: 'Dívidas Ativas', value: formatCurrency(data?.totalDebt ?? 0), icon: CreditCard, color: '#f59e0b', bg: '#fef3c7', href: '/dividas' },
    { label: 'Progresso Metas', value: `${(data?.goalProgress ?? 0).toFixed(0)}%`, icon: Target, color: '#8b5cf6', bg: '#f3e8ff', href: '/metas' },
  ];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Visão Financeira</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Panorama completo das suas finanças</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
            </Link>
          );
        })}
      </div>

      {/* Category breakdown */}
      {(data?.categoryData ?? []).length > 0 && (
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Despesas por Categoria</h3>
          <div className="space-y-3">
            {(data?.categoryData ?? []).sort((a: any, b: any) => b.value - a.value).map((cat: any, i: number) => {
              const total = (data?.categoryData ?? []).reduce((s: number, c: any) => s + c.value, 0);
              const pct = total > 0 ? (cat.value / total) * 100 : 0;
              const colors = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">{cat.name}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{formatCurrency(cat.value)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 progress-track">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
