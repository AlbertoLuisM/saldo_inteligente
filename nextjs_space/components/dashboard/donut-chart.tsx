"use client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface Props {
  data: { name: string; value: number }[];
}

export default function DonutChartComponent({ data }: Props) {
  const total = (data ?? []).reduce((s, d) => s + (d?.value ?? 0), 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data ?? []}
          cx="40%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {(data ?? []).map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [
            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v),
          ]}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string, entry: any) => (
            <span style={{ color: '#374151' }}>
              {value}<br />
              <span style={{ color: '#6b7280', fontSize: 10 }}>
                {total > 0 ? `${((entry?.payload?.value ?? 0) / total * 100).toFixed(0)}%` : '0%'}
              </span>
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
