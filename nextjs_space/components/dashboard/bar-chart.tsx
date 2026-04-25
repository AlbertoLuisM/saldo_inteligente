"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface Props {
  data: { month: string; income: number; expense: number; debt?: number }[];
}

function formatK(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return `${v}`;
}

export default function BarChartComponent({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barCategoryGap="30%">
        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={formatK} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v: number) => [
            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v),
          ]}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
        <Bar dataKey="income" name="Receita Total" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expense" name="Despesas Totais" fill="#ef4444" radius={[3, 3, 0, 0]} />
        <Bar dataKey="debt" name="Dívidas (parcelas)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
