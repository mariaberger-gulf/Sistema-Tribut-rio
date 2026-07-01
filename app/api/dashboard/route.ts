import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ANOS_SIMULACAO } from "@/lib/regras-fiscais";

export async function GET() {
  const [totalNotas, totalItens, creditos, validacoes, simulacoes] = await Promise.all([
    prisma.notaFiscal.count(),
    prisma.itemNotaFiscal.count(),
    prisma.creditoTributario.findMany({ where: { elegivel: true } }),
    prisma.validacaoClassificacao.groupBy({ by: ["severidade"], _count: { _all: true } }),
    prisma.simulacaoReforma.findMany(),
  ]);

  const creditoPorImposto: Record<string, number> = { ICMS: 0, PIS: 0, COFINS: 0 };
  for (const c of creditos) {
    creditoPorImposto[c.tipoImposto] = (creditoPorImposto[c.tipoImposto] ?? 0) + c.valorCredito;
  }

  const totalErros = validacoes.find((v) => v.severidade === "erro")?._count._all ?? 0;
  const totalAvisos = validacoes.find((v) => v.severidade === "aviso")?._count._all ?? 0;

  const simulacaoPorAno = ANOS_SIMULACAO.map((ano) => {
    const doAno = simulacoes.filter((s) => s.anoReferencia === ano);
    return {
      ano,
      valorAtual: doAno.reduce((acc, s) => acc + s.valorAtual, 0),
      valorReforma: doAno.reduce((acc, s) => acc + s.valorReforma, 0),
    };
  });

  return NextResponse.json({
    totalNotas,
    totalItens,
    creditoPorImposto,
    totalCredito: Object.values(creditoPorImposto).reduce((a, b) => a + b, 0),
    totalErros,
    totalAvisos,
    simulacaoPorAno,
  });
}
