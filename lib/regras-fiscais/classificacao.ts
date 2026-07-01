import type { ItemNFeParseado, NotaFiscalParseada } from "@/lib/xml/parse-nfe";

export interface ResultadoValidacao {
  regra: string;
  severidade: "erro" | "aviso";
  mensagem: string;
}

const TOLERANCIA_VALOR = 0.03;

function primeiroDigito(cfop: string): string {
  return cfop.trim().charAt(0);
}

function isIsentoOuNaoTributado(cst: string, csosn: string): boolean {
  if (["40", "41", "50"].includes(cst)) return true;
  if (["300", "400", "500"].includes(csosn)) return true;
  return false;
}

export function validarClassificacaoItem(
  nota: Pick<NotaFiscalParseada, "emitUf" | "destUf" | "tpNF" | "emitCrt">,
  item: ItemNFeParseado
): ResultadoValidacao[] {
  const resultados: ResultadoValidacao[] = [];
  const digito = primeiroDigito(item.cfop);

  // CFOP x UF: 1/5 = intra-estadual, 2/6 = interestadual, 3/7 = exterior
  if (["1", "5"].includes(digito) && nota.emitUf !== nota.destUf) {
    resultados.push({
      regra: "CFOP_UF_INCOERENTE",
      severidade: "erro",
      mensagem: `CFOP ${item.cfop} indica operação intraestadual, mas emitente (${nota.emitUf}) e destinatário (${nota.destUf}) estão em UFs diferentes.`,
    });
  }
  if (["2", "6"].includes(digito) && nota.emitUf === nota.destUf) {
    resultados.push({
      regra: "CFOP_UF_INCOERENTE",
      severidade: "erro",
      mensagem: `CFOP ${item.cfop} indica operação interestadual, mas emitente e destinatário estão na mesma UF (${nota.emitUf}).`,
    });
  }

  // CFOP x tpNF: 1/2/3 = entrada, 5/6/7 = saída
  if (["1", "2", "3"].includes(digito) && nota.tpNF !== 0) {
    resultados.push({
      regra: "CFOP_TIPO_OPERACAO_INCOERENTE",
      severidade: "erro",
      mensagem: `CFOP ${item.cfop} é de entrada, mas a nota está marcada como saída (tpNF=${nota.tpNF}).`,
    });
  }
  if (["5", "6", "7"].includes(digito) && nota.tpNF !== 1) {
    resultados.push({
      regra: "CFOP_TIPO_OPERACAO_INCOERENTE",
      severidade: "erro",
      mensagem: `CFOP ${item.cfop} é de saída, mas a nota está marcada como entrada (tpNF=${nota.tpNF}).`,
    });
  }

  // CST x CSOSN x CRT do emitente
  const emitenteSimples = nota.emitCrt === 1;
  if (emitenteSimples && !item.csosn) {
    resultados.push({
      regra: "CST_CSOSN_REGIME_INCOERENTE",
      severidade: "erro",
      mensagem: "Emitente é do Simples Nacional (CRT=1), mas o item usa CST em vez de CSOSN.",
    });
  }
  if (!emitenteSimples && !item.cst && item.csosn) {
    resultados.push({
      regra: "CST_CSOSN_REGIME_INCOERENTE",
      severidade: "erro",
      mensagem: "Emitente não é do Simples Nacional, mas o item usa CSOSN em vez de CST.",
    });
  }

  // CST/CSOSN de isenção deve ter ICMS zerado
  const isento = isIsentoOuNaoTributado(item.cst, item.csosn);
  if (isento && item.icmsValor > TOLERANCIA_VALOR) {
    resultados.push({
      regra: "ICMS_ALIQUOTA_ISENCAO_INCOERENTE",
      severidade: "erro",
      mensagem: `CST/CSOSN indica isenção ou não tributação, mas há valor de ICMS destacado (R$ ${item.icmsValor.toFixed(2)}).`,
    });
  }

  // Coerência base x alíquota x valor (ICMS)
  if (item.icmsBase > 0 && item.icmsAliquota > 0) {
    const esperado = (item.icmsBase * item.icmsAliquota) / 100;
    if (Math.abs(esperado - item.icmsValor) > TOLERANCIA_VALOR) {
      resultados.push({
        regra: "BASE_CALCULO_ICMS_INCOERENTE",
        severidade: "aviso",
        mensagem: `Base de cálculo × alíquota de ICMS (R$ ${esperado.toFixed(2)}) diverge do valor destacado (R$ ${item.icmsValor.toFixed(2)}).`,
      });
    }
  }

  // Coerência base x alíquota x valor (PIS/COFINS)
  if (item.pisBase > 0 && item.pisAliquota > 0) {
    const esperado = (item.pisBase * item.pisAliquota) / 100;
    if (Math.abs(esperado - item.pisValor) > TOLERANCIA_VALOR) {
      resultados.push({
        regra: "BASE_CALCULO_PIS_INCOERENTE",
        severidade: "aviso",
        mensagem: `Base de cálculo × alíquota de PIS (R$ ${esperado.toFixed(2)}) diverge do valor destacado (R$ ${item.pisValor.toFixed(2)}).`,
      });
    }
  }
  if (item.cofinsBase > 0 && item.cofinsAliquota > 0) {
    const esperado = (item.cofinsBase * item.cofinsAliquota) / 100;
    if (Math.abs(esperado - item.cofinsValor) > TOLERANCIA_VALOR) {
      resultados.push({
        regra: "BASE_CALCULO_COFINS_INCOERENTE",
        severidade: "aviso",
        mensagem: `Base de cálculo × alíquota de COFINS (R$ ${esperado.toFixed(2)}) diverge do valor destacado (R$ ${item.cofinsValor.toFixed(2)}).`,
      });
    }
  }

  // NCM ausente ou fora do padrão (8 dígitos)
  if (!/^\d{8}$/.test(item.ncm)) {
    resultados.push({
      regra: "NCM_FORMATO_INVALIDO",
      severidade: "aviso",
      mensagem: `NCM "${item.ncm}" não tem o formato esperado de 8 dígitos.`,
    });
  }

  return resultados;
}
