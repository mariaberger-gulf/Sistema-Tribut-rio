import { prisma } from "@/lib/db";
import type { NotaFiscalParseada } from "@/lib/xml/parse-nfe";
import { validarClassificacaoItem } from "./classificacao";
import { apurarCreditoItem } from "./credito";
import { simularReformaItem } from "./simulacao";

export const ANOS_SIMULACAO = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

/**
 * Cria os itens da nota fiscal e roda o motor de regras (classificação,
 * crédito e simulação da reforma) para cada um, persistindo os resultados.
 */
export async function processarItensNota(
  notaFiscalId: number,
  parsed: NotaFiscalParseada,
  regimeTributario: string | undefined
) {
  const tabela = await prisma.tabelaAliquota.findMany({ where: { ativo: true } });
  const configuracao =
    (await prisma.configuracaoReforma.findUnique({ where: { id: 1 } })) ??
    (await prisma.configuracaoReforma.create({ data: { id: 1, aliquotaPadraoCbs: 8.8, aliquotaPadraoIbs: 17.7 } }));

  for (const itemParseado of parsed.itens) {
    const item = await prisma.itemNotaFiscal.create({
      data: {
        notaFiscalId,
        numeroItem: itemParseado.numeroItem,
        codigoProduto: itemParseado.codigoProduto,
        descricao: itemParseado.descricao,
        ncm: itemParseado.ncm,
        cest: itemParseado.cest,
        cfop: itemParseado.cfop,
        unidade: itemParseado.unidade,
        quantidade: itemParseado.quantidade,
        valorUnitario: itemParseado.valorUnitario,
        valorProduto: itemParseado.valorProduto,
        origem: itemParseado.origem,
        cst: itemParseado.cst,
        csosn: itemParseado.csosn,
        modBC: itemParseado.modBC,
        icmsBase: itemParseado.icmsBase,
        icmsAliquota: itemParseado.icmsAliquota,
        icmsValor: itemParseado.icmsValor,
        icmsStBase: itemParseado.icmsStBase,
        icmsStAliquota: itemParseado.icmsStAliquota,
        icmsStValor: itemParseado.icmsStValor,
        fcpAliquota: itemParseado.fcpAliquota,
        ipiCst: itemParseado.ipiCst,
        ipiBase: itemParseado.ipiBase,
        ipiAliquota: itemParseado.ipiAliquota,
        ipiValor: itemParseado.ipiValor,
        pisCst: itemParseado.pisCst,
        pisBase: itemParseado.pisBase,
        pisAliquota: itemParseado.pisAliquota,
        pisValor: itemParseado.pisValor,
        cofinsCst: itemParseado.cofinsCst,
        cofinsBase: itemParseado.cofinsBase,
        cofinsAliquota: itemParseado.cofinsAliquota,
        cofinsValor: itemParseado.cofinsValor,
      },
    });

    const validacoes = validarClassificacaoItem(parsed, itemParseado);
    if (validacoes.length > 0) {
      await prisma.validacaoClassificacao.createMany({
        data: validacoes.map((v) => ({
          itemNotaFiscalId: item.id,
          regra: v.regra,
          severidade: v.severidade,
          mensagem: v.mensagem,
        })),
      });
    }

    const creditos = apurarCreditoItem(regimeTributario, parsed, itemParseado);
    await prisma.creditoTributario.createMany({
      data: creditos.map((c) => ({
        itemNotaFiscalId: item.id,
        tipoImposto: c.tipoImposto,
        elegivel: c.elegivel,
        valorCredito: c.valorCredito,
        motivo: c.motivo,
      })),
    });

    const simulacoes = ANOS_SIMULACAO.map((ano) =>
      simularReformaItem(itemParseado, tabela, configuracao, ano)
    );
    await prisma.simulacaoReforma.createMany({
      data: simulacoes.map((s) => ({
        itemNotaFiscalId: item.id,
        anoReferencia: s.anoReferencia,
        categoriaAliquota: s.categoriaAliquota,
        aliquotaCbs: s.aliquotaCbs,
        aliquotaIbs: s.aliquotaIbs,
        aliquotaIs: s.aliquotaIs,
        valorCbs: s.valorCbs,
        valorIbs: s.valorIbs,
        valorIs: s.valorIs,
        valorAtual: s.valorAtual,
        valorReforma: s.valorReforma,
        delta: s.delta,
      })),
    });
  }
}
