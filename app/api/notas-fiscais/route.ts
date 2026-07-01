import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const notas = await prisma.notaFiscal.findMany({
    orderBy: { dataEmissao: "desc" },
    include: {
      _count: { select: { itens: true } },
      itens: {
        select: {
          validacoes: { select: { severidade: true } },
        },
      },
    },
  });

  const resumo = notas.map((n) => {
    const erros = n.itens.reduce((acc, i) => acc + i.validacoes.filter((v) => v.severidade === "erro").length, 0);
    const avisos = n.itens.reduce((acc, i) => acc + i.validacoes.filter((v) => v.severidade === "aviso").length, 0);
    return {
      id: n.id,
      chaveAcesso: n.chaveAcesso,
      numero: n.numero,
      serie: n.serie,
      dataEmissao: n.dataEmissao,
      emitNome: n.emitNome,
      emitCnpj: n.emitCnpj,
      destNome: n.destNome,
      destCnpj: n.destCnpj,
      tpNF: n.tpNF,
      valorTotal: n.valorTotal,
      status: n.status,
      totalItens: n._count.itens,
      totalErros: erros,
      totalAvisos: avisos,
    };
  });

  return NextResponse.json({ notas: resumo });
}
