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
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e7eceb" />
        <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} />
        <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} />
        <Tooltip
          formatter={(value: number) => `Rs. ${value.toLocaleString("en-IN")}`}
        />
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#046380" />
            <stop offset="100%" stopColor="#1f748e" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <Bar dataKey="total" fill="url(#barGradient)" radius={[7, 7, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
