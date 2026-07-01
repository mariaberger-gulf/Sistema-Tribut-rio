import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name) => name === "det" || name === "NFref" || name === "dup",
});

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Retorna o primeiro (e único) valor de um objeto cuja chave varia
 *  conforme o grupo tributário (ex: ICMS00, ICMS10, ICMSSN101...). */
function primeiroGrupo(obj: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!obj) return {};
  const values = Object.values(obj);
  return (values[0] as Record<string, unknown>) ?? {};
}

export interface ItemNFeParseado {
  numeroItem: number;
  codigoProduto: string;
  descricao: string;
  ncm: string;
  cest: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorProduto: number;
  origem: number;
  cst: string;
  csosn: string;
  modBC: number;
  icmsBase: number;
  icmsAliquota: number;
  icmsValor: number;
  icmsStBase: number;
  icmsStAliquota: number;
  icmsStValor: number;
  fcpAliquota: number;
  ipiCst: string;
  ipiBase: number;
  ipiAliquota: number;
  ipiValor: number;
  pisCst: string;
  pisBase: number;
  pisAliquota: number;
  pisValor: number;
  cofinsCst: string;
  cofinsBase: number;
  cofinsAliquota: number;
  cofinsValor: number;
}

export interface NotaFiscalParseada {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: Date;
  tpNF: number;
  idDest: number;
  finNFe: number;
  naturezaOperacao: string;
  emitCnpj: string;
  emitNome: string;
  emitUf: string;
  emitCrt: number;
  destCnpj: string;
  destNome: string;
  destUf: string;
  valorProdutos: number;
  valorIcms: number;
  valorIpi: number;
  valorPis: number;
  valorCofins: number;
  valorTotal: number;
  itens: ItemNFeParseado[];
}

export class NFeParseError extends Error {}

export function parseNFeXml(xmlText: string): NotaFiscalParseada {
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xmlText);
  } catch {
    throw new NFeParseError("XML inválido ou malformado.");
  }

  const nfeProc = doc.nfeProc as Record<string, unknown> | undefined;
  const nfe = (nfeProc?.NFe ?? doc.NFe) as Record<string, unknown> | undefined;
  const infNFe = nfe?.infNFe as Record<string, unknown> | undefined;

  if (!infNFe) {
    throw new NFeParseError("Não foi possível localizar o elemento infNFe. Verifique se é um XML de NF-e modelo 55.");
  }

  const idAttr = String(infNFe["@_Id"] ?? "");
  const chaveAcesso = idAttr.replace(/^NFe/, "");
  if (chaveAcesso.length !== 44) {
    throw new NFeParseError("Chave de acesso inválida ou ausente no XML.");
  }

  const ide = (infNFe.ide ?? {}) as Record<string, unknown>;
  const emit = (infNFe.emit ?? {}) as Record<string, unknown>;
  const dest = (infNFe.dest ?? {}) as Record<string, unknown>;
  const total = (infNFe.total ?? {}) as Record<string, unknown>;
  const icmsTot = (total.ICMSTot ?? {}) as Record<string, unknown>;
  const enderEmit = (emit.enderEmit ?? {}) as Record<string, unknown>;
  const enderDest = (dest.enderDest ?? {}) as Record<string, unknown>;

  const dets = toArray(infNFe.det as Record<string, unknown> | Record<string, unknown>[] | undefined);

  const itens: ItemNFeParseado[] = dets.map((det, idx) => {
    const prod = (det.prod ?? {}) as Record<string, unknown>;
    const imposto = (det.imposto ?? {}) as Record<string, unknown>;

    const icms = primeiroGrupo(imposto.ICMS as Record<string, unknown> | undefined);
    const ipiWrap = (imposto.IPI ?? {}) as Record<string, unknown>;
    const ipi = primeiroGrupo(ipiWrap);
    const pis = primeiroGrupo(imposto.PIS as Record<string, unknown> | undefined);
    const cofins = primeiroGrupo(imposto.COFINS as Record<string, unknown> | undefined);

    return {
      numeroItem: Number(det["@_nItem"] ?? idx + 1),
      codigoProduto: String(prod.cProd ?? ""),
      descricao: String(prod.xProd ?? ""),
      ncm: String(prod.NCM ?? ""),
      cest: String(prod.CEST ?? ""),
      cfop: String(prod.CFOP ?? ""),
      unidade: String(prod.uCom ?? ""),
      quantidade: num(prod.qCom),
      valorUnitario: num(prod.vUnCom),
      valorProduto: num(prod.vProd),

      origem: num(icms.orig),
      cst: String(icms.CST ?? ""),
      csosn: String(icms.CSOSN ?? ""),
      modBC: num(icms.modBC),
      icmsBase: num(icms.vBC),
      icmsAliquota: num(icms.pICMS),
      icmsValor: num(icms.vICMS),
      icmsStBase: num(icms.vBCST),
      icmsStAliquota: num(icms.pICMSST),
      icmsStValor: num(icms.vICMSST),
      fcpAliquota: num(icms.pFCP),

      ipiCst: String(ipi.CST ?? ""),
      ipiBase: num(ipi.vBC),
      ipiAliquota: num(ipi.pIPI),
      ipiValor: num(ipi.vIPI),

      pisCst: String(pis.CST ?? ""),
      pisBase: num(pis.vBC),
      pisAliquota: num(pis.pPIS),
      pisValor: num(pis.vPIS),

      cofinsCst: String(cofins.CST ?? ""),
      cofinsBase: num(cofins.vBC),
      cofinsAliquota: num(cofins.pCOFINS),
      cofinsValor: num(cofins.vCOFINS),
    };
  });

  const dhEmi = String(ide.dhEmi ?? ide.dEmi ?? "");

  return {
    chaveAcesso,
    numero: String(ide.nNF ?? ""),
    serie: String(ide.serie ?? ""),
    dataEmissao: dhEmi ? new Date(dhEmi) : new Date(),
    tpNF: num(ide.tpNF),
    idDest: num(ide.idDest),
    finNFe: num(ide.finNFe) || 1,
    naturezaOperacao: String(ide.natOp ?? ""),
    emitCnpj: String(emit.CNPJ ?? emit.CPF ?? ""),
    emitNome: String(emit.xNome ?? ""),
    emitUf: String(enderEmit.UF ?? ""),
    emitCrt: num(emit.CRT),
    destCnpj: String(dest.CNPJ ?? dest.CPF ?? ""),
    destNome: String(dest.xNome ?? ""),
    destUf: String(enderDest.UF ?? ""),
    valorProdutos: num(icmsTot.vProd),
    valorIcms: num(icmsTot.vICMS),
    valorIpi: num(icmsTot.vIPI),
    valorPis: num(icmsTot.vPIS),
    valorCofins: num(icmsTot.vCOFINS),
    valorTotal: num(icmsTot.vNF),
    itens,
  };
}
