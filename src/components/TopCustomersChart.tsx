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

export default function TopCustomersChart({
  data,
}: {
  data: { name: string; total: number; count: number }[];
}) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="2 2" stroke="#e2e8f0" strokeWidth={0.5} />
        <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} />
        <YAxis
          type="category"
          dataKey="name"
          fontSize={12}
          width={150}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#1e293b" }}
        />
        <Tooltip
          formatter={(value: number) => `₹ ${value.toLocaleString("en-IN")}`}
          contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Bar dataKey="total" fill="#B8863B" radius={[0, 3, 3, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
