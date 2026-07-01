"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { ReformaChart } from "@/components/dashboard/ReformaChart";
import { formatMoeda } from "@/lib/utils";

interface DashboardData {
  totalNotas: number;
  totalItens: number;
  creditoPorImposto: Record<string, number>;
  totalCredito: number;
  totalErros: number;
  totalAvisos: number;
  simulacaoPorAno: { ano: number; valorAtual: number; valorReforma: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada das notas fiscais processadas, créditos identificados e impacto da Reforma Tributária.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Notas processadas" valor={String(data.totalNotas)} descricao={`${data.totalItens} itens`} />
        <KPICard label="Crédito total identificado" valor={formatMoeda(data.totalCredito)} cor="emerald"
          descricao={`ICMS ${formatMoeda(data.creditoPorImposto.ICMS ?? 0)}`} />
        <KPICard label="Inconsistências (erro)" valor={String(data.totalErros)} cor={data.totalErros > 0 ? "red" : "default"} />
        <KPICard label="Avisos de classificação" valor={String(data.totalAvisos)} cor={data.totalAvisos > 0 ? "yellow" : "default"} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Crédito ICMS" valor={formatMoeda(data.creditoPorImposto.ICMS ?? 0)} cor="blue" />
        <KPICard label="Crédito PIS" valor={formatMoeda(data.creditoPorImposto.PIS ?? 0)} cor="blue" />
        <KPICard label="Crédito COFINS" valor={formatMoeda(data.creditoPorImposto.COFINS ?? 0)} cor="blue" />
      </div>

      <ReformaChart data={data.simulacaoPorAno} />
    </div>
  );
}
