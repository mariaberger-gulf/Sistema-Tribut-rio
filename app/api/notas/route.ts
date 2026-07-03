import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apurarRetencaoFederal } from "@/lib/retencoes-fonte/apurar";

const TOLERANCIA_RETENCAO = 0.02;

export interface RetencaoResumo {
  calculado: number;
  declarado: number | null;
  divergente: boolean;
}

/** Lista unificada de Notas Fiscais (mercadoria) e Notas de Serviço, com uma
 *  coluna de retenção federal (IRRF/PCC) calculada para as notas de serviço —
 *  não se aplica a notas de mercadoria. */
export async function GET() {
  const [notasFiscais, notasServico] = await Promise.all([
    prisma.notaFiscal.findMany({
      orderBy: { dataEmissao: "desc" },
      include: {
        _count: { select: { itens: true } },
        itens: { select: { validacoes: { select: { severidade: true } } } },
      },
    }),
    prisma.notaServico.findMany({ orderBy: [{ dataEmissao: "desc" }, { createdAt: "desc" }] }),
  ]);

  const codigosBase = [...new Set(notasServico.map((n) => n.itemServicoCodigoBase).filter((c): c is string => !!c))];
  const itensServico = codigosBase.length > 0
    ? await prisma.itemServicoLC116.findMany({ where: { codigoBase: { in: codigosBase } } })
    : [];
  const itemPorCodigoBase = new Map<string, (typeof itensServico)[number]>();
  for (const item of itensServico) if (!itemPorCodigoBase.has(item.codigoBase)) itemPorCodigoBase.set(item.codigoBase, item);

  const fiscais = notasFiscais.map((n) => {
    const erros = n.itens.reduce((acc, i) => acc + i.validacoes.filter((v) => v.severidade === "erro").length, 0);
    const avisos = n.itens.reduce((acc, i) => acc + i.validacoes.filter((v) => v.severidade === "aviso").length, 0);
    return {
      tipo: "fiscal" as const,
      id: n.id,
      documento: `${n.numero}/${n.serie}`,
      contraparte: n.emitNome,
      dataEmissao: n.dataEmissao,
      valor: n.valorTotal,
      status: n.status === "Revisão Pendente" ? "revisao" : erros > 0 ? "erro" : avisos > 0 ? "aviso" : "ok",
      totalItens: n._count.itens,
      totalErros: erros,
      totalAvisos: avisos,
      retencao: null as RetencaoResumo | null,
    };
  });

  const servicos = notasServico.map((n) => {
    let retencao: RetencaoResumo | null = null;
    if (n.itemServicoCodigoBase && n.valorServico !== null) {
      const item = itemPorCodigoBase.get(n.itemServicoCodigoBase);
      if (item) {
        const apuracao = apurarRetencaoFederal(item, n.valorServico, n.prestadorSimplesNacional);
        const declaradoInformado = n.pccDeclarado !== null || n.irrfDeclarado !== null;
        const declarado = (n.pccDeclarado ?? 0) + (n.irrfDeclarado ?? 0);
        retencao = {
          calculado: apuracao.valorTotalRetido,
          declarado: declaradoInformado ? declarado : null,
          divergente: declaradoInformado && Math.abs(apuracao.valorTotalRetido - declarado) > TOLERANCIA_RETENCAO,
        };
      }
    }
    return {
      tipo: "servico" as const,
      id: n.id,
      documento: n.numero || n.arquivoOrigem,
      contraparte: n.prestadorNome,
      dataEmissao: n.dataEmissao,
      valor: n.valorServico,
      status: n.status === "Confirmada" ? "ok" : "revisao",
      totalItens: null,
      totalErros: 0,
      totalAvisos: 0,
      retencao,
    };
  });

  const notas = [...fiscais, ...servicos].sort((a, b) => {
    const da = a.dataEmissao ? new Date(a.dataEmissao).getTime() : 0;
    const db = b.dataEmissao ? new Date(b.dataEmissao).getTime() : 0;
    return db - da;
  });

  return NextResponse.json({ notas });
}
