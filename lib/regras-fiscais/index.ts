import { prisma } from "@/lib/db";
import type { NotaFiscalParseada, ItemNFeParseado } from "@/lib/xml/parse-nfe";
import { validarClassificacaoItem } from "./classificacao";
import { apurarCreditoItem } from "./credito";
import { simularReformaItem } from "./simulacao";

export const ANOS_SIMULACAO = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

type NotaContexto = Pick<NotaFiscalParseada, "emitUf" | "destUf" | "tpNF" | "emitCrt">;
type EmpresaContexto = { cnpj: string; regimeTributario: string } | null | undefined;

// A apuração de crédito depende de a empresa (Ecotruck) ser a DESTINATÁRIA
// desta nota (compra), não do tpNF — que reflete a operação de quem EMITIU
// o documento (numa compra normal, o emitente sempre registra tpNF=1/saída,
// mesmo sendo uma entrada de mercadoria para quem compra). Compara só
// dígitos: o CNPJ pode vir formatado (PDF) ou só números (XML).
const soDigitos = (v: string) => v.replace(/\D/g, "");
export function ehEntradaParaEmpresa(empresa: EmpresaContexto, destCnpj: string): boolean {
  return !!empresa && soDigitos(empresa.cnpj) === soDigitos(destCnpj);
}

async function buscarTabelaEConfiguracao() {
  const tabela = await prisma.tabelaAliquota.findMany({ where: { ativo: true } });
  const configuracao =
    (await prisma.configuracaoReforma.findUnique({ where: { id: 1 } })) ??
    (await prisma.configuracaoReforma.create({ data: { id: 1, aliquotaPadraoCbs: 8.8, aliquotaPadraoIbs: 17.7 } }));
  return { tabela, configuracao };
}

/**
 * Roda o motor de regras (classificação, crédito e simulação da reforma)
 * para um item já persistido e grava os resultados. Usada tanto na primeira
 * gravação (após criar o item) quanto para reprocessar depois de uma edição
 * manual (as validações/créditos/simulações antigas devem ser apagadas antes
 * de chamar esta função, para não duplicar).
 */
async function gravarResultadosItem(
  itemId: number,
  itemParaCalculo: ItemNFeParseado,
  notaContexto: NotaContexto,
  empresa: EmpresaContexto,
  entradaParaEmpresa: boolean,
  tabela: Awaited<ReturnType<typeof buscarTabelaEConfiguracao>>["tabela"],
  configuracao: Awaited<ReturnType<typeof buscarTabelaEConfiguracao>>["configuracao"]
) {
  const validacoes = validarClassificacaoItem(notaContexto, itemParaCalculo);
  if (validacoes.length > 0) {
    await prisma.validacaoClassificacao.createMany({
      data: validacoes.map((v) => ({
        itemNotaFiscalId: itemId,
        regra: v.regra,
        severidade: v.severidade,
        mensagem: v.mensagem,
      })),
    });
  }

  const creditos = apurarCreditoItem(empresa?.regimeTributario, entradaParaEmpresa, itemParaCalculo);
  await prisma.creditoTributario.createMany({
    data: creditos.map((c) => ({
      itemNotaFiscalId: itemId,
      tipoImposto: c.tipoImposto,
      elegivel: c.elegivel,
      valorCredito: c.valorCredito,
      motivo: c.motivo,
    })),
  });

  const simulacoes = ANOS_SIMULACAO.map((ano) => simularReformaItem(itemParaCalculo, tabela, configuracao, ano));
  await prisma.simulacaoReforma.createMany({
    data: simulacoes.map((s) => ({
      itemNotaFiscalId: itemId,
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

/**
 * Cria os itens da nota fiscal e roda o motor de regras (classificação,
 * crédito e simulação da reforma) para cada um, persistindo os resultados.
 */
export async function processarItensNota(
  notaFiscalId: number,
  parsed: NotaFiscalParseada,
  empresa: EmpresaContexto
) {
  const entradaParaEmpresa = ehEntradaParaEmpresa(empresa, parsed.destCnpj);
  const { tabela, configuracao } = await buscarTabelaEConfiguracao();

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

    await gravarResultadosItem(item.id, itemParseado, parsed, empresa, entradaParaEmpresa, tabela, configuracao);
  }
}

/**
 * Reprocessa a classificação, crédito e simulação de UM item já existente —
 * usada depois de uma edição manual ou de um item adicionado à mão, quando a
 * leitura automática do PDF não conseguiu extrair a linha corretamente.
 * Apaga os resultados antigos do item e recalcula do zero.
 */
export async function reprocessarItem(itemId: number) {
  const item = await prisma.itemNotaFiscal.findUnique({
    where: { id: itemId },
    include: { notaFiscal: { include: { empresa: true } } },
  });
  if (!item) throw new Error("Item não encontrado.");

  const { notaFiscal } = item;
  const empresa = notaFiscal.empresa;
  const entradaParaEmpresa = ehEntradaParaEmpresa(empresa, notaFiscal.destCnpj);
  const { tabela, configuracao } = await buscarTabelaEConfiguracao();

  await prisma.validacaoClassificacao.deleteMany({ where: { itemNotaFiscalId: itemId } });
  await prisma.creditoTributario.deleteMany({ where: { itemNotaFiscalId: itemId } });
  await prisma.simulacaoReforma.deleteMany({ where: { itemNotaFiscalId: itemId } });

  await gravarResultadosItem(
    itemId,
    item,
    { emitUf: notaFiscal.emitUf, destUf: notaFiscal.destUf, tpNF: notaFiscal.tpNF, emitCrt: notaFiscal.emitCrt },
    empresa,
    entradaParaEmpresa,
    tabela,
    configuracao
  );
}
