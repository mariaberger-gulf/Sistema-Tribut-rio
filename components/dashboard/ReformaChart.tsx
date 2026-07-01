"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "@/components/layout/ThemeProvider";
import { formatMoeda } from "@/lib/utils";

interface ReformaChartProps {
  data: { ano: number; valorAtual: number; valorReforma: number }[];
}

export function ReformaChart({ data }: ReformaChartProps) {
  const { theme } = useTheme();
  const tickColor = theme === "dark" ? "#a1a1aa" : "#71717a";

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-100 mb-4">
        Carga tributária atual vs. Reforma (ICMS+IPI+PIS+COFINS vs. CBS+IBS+IS), por ano de transição
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4}>
          <XAxis dataKey="ano" tick={{ fontSize: 12, fill: tickColor }} />
          <YAxis tick={{ fontSize: 12, fill: tickColor }} tickFormatter={(v) => formatMoeda(v)} width={90} />
          <Tooltip formatter={(v) => formatMoeda(Number(v))} />
          <Legend />
          <Bar dataKey="valorAtual" name="Regime atual" fill="#71717a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="valorReforma" name="Reforma (CBS+IBS+IS)" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
