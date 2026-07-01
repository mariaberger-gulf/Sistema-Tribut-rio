import type { ItemNFeParseado } from "@/lib/xml/parse-nfe";

export interface TabelaAliquotaRef {
  prefixoNcm: string;
  categoria: string; // "padrao" | "reduzida40" | "reduzida60" | "isenta"
  seletivo: boolean;
  aliquotaSeletivo: number;
}

export interface ConfiguracaoReformaRef {
  aliquotaPadraoCbs: number;
  aliquotaPadraoIbs: number;
}

export interface ResultadoSimulacao {
  anoReferencia: number;
  categoriaAliquota: string;
  aliquotaCbs: number;
  aliquotaIbs: number;
  aliquotaIs: number;
  valorCbs: number;
  valorIbs: number;
  valorIs: number;
  valorAtual: number;
  valorReforma: number;
  delta: number;
}

const FATOR_CATEGORIA: Record<string, number> = {
  padrao: 1,
  reduzida40: 0.6, // redução de 40% sobre a alíquota padrão
  reduzida60: 0.4, // redução de 60% sobre a alíquota padrão (saúde/educação, Anexo I da LC 214/2025)
  isenta: 0,
};

/**
 * Cronograma de transição (EC 132/2023, LC 214/2025):
 * 2026 = ano de teste (CBS/IBS simbólicos, sem carga real);
 * 2027-2028 = CBS e Imposto Seletivo já substituem PIS/COFINS/IPI, IBS ainda não iniciou;
 * 2029-2032 = fase de transição do ICMS/ISS para o IBS (rampa aproximada, sujeita a
 * regulamentação — ajustar aqui quando os percentuais oficiais anuais forem publicados);
 * 2033 = substituição plena.
 */
function blendTransicao(ano: number): { cbsIs: number; ibs: number } {
  if (ano <= 2026) return { cbsIs: 0, ibs: 0 };
  if (ano <= 2028) return { cbsIs: 1, ibs: 0 };
  if (ano >= 2033) return { cbsIs: 1, ibs: 1 };
  // 2029..2032: rampa linear aproximada de 20% a 80%
  const passo = (ano - 2028) * 0.2;
  return { cbsIs: 1, ibs: Math.min(passo, 1) };
}

function encontrarCategoria(ncm: string, tabela: TabelaAliquotaRef[]): TabelaAliquotaRef {
  const candidatos = tabela
    .filter((t) => t.prefixoNcm && ncm.startsWith(t.prefixoNcm))
    .sort((a, b) => b.prefixoNcm.length - a.prefixoNcm.length);
  if (candidatos.length > 0) return candidatos[0];
  return tabela.find((t) => t.prefixoNcm === "") ?? { prefixoNcm: "", categoria: "padrao", seletivo: false, aliquotaSeletivo: 0 };
}

export function simularReformaItem(
  item: Pick<ItemNFeParseado, "ncm" | "valorProduto" | "icmsValor" | "ipiValor" | "pisValor" | "cofinsValor">,
  tabela: TabelaAliquotaRef[],
  configuracao: ConfiguracaoReformaRef,
  anoReferencia: number
): ResultadoSimulacao {
  const ref = encontrarCategoria(item.ncm, tabela);
  const fator = FATOR_CATEGORIA[ref.categoria] ?? 1;
  const { cbsIs, ibs } = blendTransicao(anoReferencia);

  const aliquotaCbs = configuracao.aliquotaPadraoCbs * fator;
  const aliquotaIbs = configuracao.aliquotaPadraoIbs * fator;
  const aliquotaIs = ref.seletivo ? ref.aliquotaSeletivo : 0;

  const valorCbs = item.valorProduto * (aliquotaCbs / 100) * cbsIs;
  const valorIbs = item.valorProduto * (aliquotaIbs / 100) * ibs;
  const valorIs = ref.seletivo ? item.valorProduto * (aliquotaIs / 100) * cbsIs : 0;

  const valorAtual = item.icmsValor + item.ipiValor + item.pisValor + item.cofinsValor;
  const valorReforma = valorCbs + valorIbs + valorIs;

  return {
    anoReferencia,
    categoriaAliquota: ref.categoria,
    aliquotaCbs,
    aliquotaIbs,
    aliquotaIs,
    valorCbs,
    valorIbs,
    valorIs,
    valorAtual,
    valorReforma,
    delta: valorReforma - valorAtual,
  };
}
