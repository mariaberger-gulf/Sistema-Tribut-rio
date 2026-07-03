import type { ItemNFeParseado } from "@/lib/xml/parse-nfe";

export interface ResultadoCredito {
  tipoImposto: "ICMS" | "PIS" | "COFINS";
  elegivel: boolean;
  valorCredito: number;
  motivo: string;
}

// Sufixos de CFOP (últimos 3 dígitos) sem direito a crédito de ICMS/PIS/COFINS:
// uso e consumo, bonificação/doação, brindes.
const CFOP_SEM_CREDITO = ["407", "408", "556", "910", "911", "949"];

// Sufixos de CFOP que tipicamente geram crédito: compra p/ industrialização,
// comercialização, industrialização por encomenda, ativo imobilizado (restrito).
const CFOP_COM_CREDITO = ["101", "102", "111", "116", "117", "118", "120", "151", "152"];

function isIsentoOuNaoTributado(cst: string, csosn: string): boolean {
  if (["40", "41", "50"].includes(cst)) return true;
  if (["300", "400", "500"].includes(csosn)) return true;
  return false;
}

function sufixoCfop(cfop: string): string {
  return cfop.trim().slice(-3);
}

export function apurarCreditoIcms(
  entradaParaEmpresa: boolean,
  item: ItemNFeParseado
): ResultadoCredito {
  if (!entradaParaEmpresa) {
    return { tipoImposto: "ICMS", elegivel: false, valorCredito: 0, motivo: "A empresa é a emitente (venda) desta nota — apuração de crédito só se aplica a compras." };
  }

  const sufixo = sufixoCfop(item.cfop);

  if (isIsentoOuNaoTributado(item.cst, item.csosn)) {
    return { tipoImposto: "ICMS", elegivel: false, valorCredito: 0, motivo: "Item isento ou não tributado — sem ICMS destacado para crédito." };
  }

  if (item.cst === "60") {
    return { tipoImposto: "ICMS", elegivel: false, valorCredito: 0, motivo: "ICMS já recolhido por substituição tributária (CST 60) — sem crédito adicional na entrada." };
  }

  if (CFOP_SEM_CREDITO.includes(sufixo)) {
    return { tipoImposto: "ICMS", elegivel: false, valorCredito: 0, motivo: `CFOP ${item.cfop} indica uso e consumo, bonificação ou doação — sem direito a crédito de ICMS.` };
  }

  if (item.icmsValor <= 0) {
    return { tipoImposto: "ICMS", elegivel: false, valorCredito: 0, motivo: "Nenhum valor de ICMS destacado no item." };
  }

  if (CFOP_COM_CREDITO.includes(sufixo)) {
    return { tipoImposto: "ICMS", elegivel: true, valorCredito: item.icmsValor, motivo: `CFOP ${item.cfop} indica compra para industrialização/comercialização — crédito de ICMS admitido.` };
  }

  return { tipoImposto: "ICMS", elegivel: true, valorCredito: item.icmsValor, motivo: "ICMS destacado em operação de entrada tributada — crédito admitido, conferir enquadramento específico do CFOP." };
}

export function apurarCreditoPisCofins(
  regimeTributario: string | undefined,
  entradaParaEmpresa: boolean,
  item: ItemNFeParseado
): ResultadoCredito[] {
  const base: Omit<ResultadoCredito, "tipoImposto"> = {
    elegivel: false,
    valorCredito: 0,
    motivo: "",
  };

  if (!entradaParaEmpresa) {
    const motivo = "A empresa é a emitente (venda) desta nota — apuração de crédito só se aplica a compras.";
    return [
      { tipoImposto: "PIS", ...base, motivo },
      { tipoImposto: "COFINS", ...base, motivo },
    ];
  }

  if (regimeTributario !== "Lucro Real") {
    const motivo = "Empresa fora do regime não-cumulativo (Lucro Real) — PIS/COFINS não geram crédito.";
    return [
      { tipoImposto: "PIS", ...base, motivo },
      { tipoImposto: "COFINS", ...base, motivo },
    ];
  }

  const sufixo = sufixoCfop(item.cfop);
  if (CFOP_SEM_CREDITO.includes(sufixo)) {
    const motivo = `CFOP ${item.cfop} indica uso e consumo, bonificação ou doação — não se enquadra como insumo para crédito de PIS/COFINS.`;
    return [
      { tipoImposto: "PIS", ...base, motivo },
      { tipoImposto: "COFINS", ...base, motivo },
    ];
  }

  const CST_SEM_CREDITO = ["70", "71", "72", "73", "74", "75", "98", "99", "04", "06", "07", "08", "09", "49"];

  const motivoSemDado = (tributo: string, cst: string) =>
    cst === ""
      ? `${tributo} não consta neste documento (não é impresso no DANFE) — sem base para apurar crédito a partir do PDF.`
      : `CST de ${tributo} "${cst}" não gera direito a crédito nesta entrada.`;

  const resultado: ResultadoCredito[] = [];
  if (CST_SEM_CREDITO.includes(item.pisCst) || item.pisValor <= 0) {
    resultado.push({ tipoImposto: "PIS", elegivel: false, valorCredito: 0, motivo: motivoSemDado("PIS", item.pisCst) });
  } else {
    resultado.push({ tipoImposto: "PIS", elegivel: true, valorCredito: item.pisValor, motivo: "Insumo tributado no regime não-cumulativo — crédito de PIS admitido." });
  }

  if (CST_SEM_CREDITO.includes(item.cofinsCst) || item.cofinsValor <= 0) {
    resultado.push({ tipoImposto: "COFINS", elegivel: false, valorCredito: 0, motivo: motivoSemDado("COFINS", item.cofinsCst) });
  } else {
    resultado.push({ tipoImposto: "COFINS", elegivel: true, valorCredito: item.cofinsValor, motivo: "Insumo tributado no regime não-cumulativo — crédito de COFINS admitido." });
  }

  return resultado;
}

export function apurarCreditoItem(
  regimeTributario: string | undefined,
  entradaParaEmpresa: boolean,
  item: ItemNFeParseado
): ResultadoCredito[] {
  return [apurarCreditoIcms(entradaParaEmpresa, item), ...apurarCreditoPisCofins(regimeTributario, entradaParaEmpresa, item)];
}
