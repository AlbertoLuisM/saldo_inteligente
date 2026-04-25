"use client";
import { useState, useEffect } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";

const BarChartComponent = dynamic(() => import("@/components/dashboard/bar-chart"), { ssr: false });
const DonutChartComponent = dynamic(() => import("@/components/dashboard/donut-chart"), { ssr: false });
const LineChartComp = dynamic(() => import("@/components/dashboard/line-chart"), { ssr: false });

export default function RelatoriosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('12');

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const monthlyData = (data?.monthlyData ?? []).slice(-(parseInt(period)));

  if (loading) return <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#10b981' }} /></div>;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Relatórios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Análise completa das suas finanças</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none bg-white dark:bg-gray-800/60">
          <option value="3">Últimos 3 meses</option>
          <option value="6">Últimos 6 meses</option>
          <option value="12">Últimos 12 meses</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Receitas vs Despesas</h3>
          <div style={{ height: 250 }}>
            <BarChartComponent data={monthlyData} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Distribuição por Categoria</h3>
          <div style={{ height: 250 }}>
            <DonutChartComponent data={data?.categoryData ?? []} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Tendência Mensal (Saldo Líquido)</h3>
        <div style={{ height: 200 }}>
          <LineChartComp data={monthlyData.map((m: any) => ({ ...m, balance: (m?.income ?? 0) - (m?.expense ?? 0) - (m?.debt ?? 0) }))} />
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Resumo Mensal</h3>
        </div>
        <table className="w-full">
          <thead className="border-b border-gray-100 dark:border-gray-700/50">
            <tr>{['Mês','Receitas','Despesas','Dívidas','Saldo'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {monthlyData.map((m: any, i: number) => {
              const balance = (m?.income ?? 0) - (m?.expense ?? 0) - (m?.debt ?? 0);
              return (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 dark:bg-gray-900/50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">{m?.month}</td>
                  <td className="py-3 px-4 text-sm" style={{ color: '#10b981' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m?.income ?? 0)}</td>
                  <td className="py-3 px-4 text-sm" style={{ color: '#ef4444' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m?.expense ?? 0)}</td>
                  <td className="py-3 px-4 text-sm" style={{ color: '#f59e0b' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m?.debt ?? 0)}</td>
                  <td className="py-3 px-4 text-sm font-semibold" style={{ color: balance >= 0 ? '#10b981' : '#ef4444' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
