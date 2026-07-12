"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function RevenueChart({
  data,
}: {
  data: { month: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 2" stroke="#e2e8f0" strokeWidth={0.5} />
        <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} />
        <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} domain={[0, "auto"]} />
        <Tooltip
          formatter={(value: number) => `Rs. ${value.toLocaleString("en-IN")}`}
          contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B93A3" />
            <stop offset="100%" stopColor="#5B93A3" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <Bar dataKey="total" fill="url(#barGradient)" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
