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
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e7eceb" />
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
          formatter={(value: number) => `Rs. ${value.toLocaleString("en-IN")}`}
        />
        <Bar dataKey="total" fill="#ca8a04" radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
