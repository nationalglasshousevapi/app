"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#0F3A44", "#5B93A3", "#B8863B", "#3F7D5C", "#B4553E", "#8B6F47"];

export default function DocumentTypeChart({
  data,
}: {
  data: { name: string; value: number; type?: string }[];
}) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          strokeWidth={0}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={7}
          formatter={(value: string) => (
            <span className="text-sm text-slate-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
