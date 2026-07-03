export function parseMoedaBr(valor: string | undefined | null): number | null {
  if (!valor) return null;
  const limpo = valor.replace(/[^\d.,-]/g, "").trim();
  if (!limpo) return null;
  const normalizado = limpo.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : null;
}

export function parseDataBr(valor: string | undefined | null): Date | null {
  if (!valor) return null;
  const m = valor.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/** Normaliza um "Código de Tributação Nacional" (ex: "01.01.01", "08.02.01.000")
 *  para o codigoBase usado em ItemServicoLC116 (ex: "1.01", "8.02"). */
export function normalizarCodigoTributacaoNacional(codigo: string): string | null {
  const partes = codigo.trim().match(/^0*(\d{1,2})\.(\d{2})/);
  if (!partes) return null;
  return `${partes[1]}.${partes[2]}`;
}

const CNPJ_REGEX = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;

export function extrairCnpjs(texto: string): string[] {
  return [...new Set(texto.match(CNPJ_REGEX) ?? [])];
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Busca o primeiro grupo capturado de uma lista de regexes candidatos, na ordem. */
export function buscarPrimeiro(texto: string, regexes: RegExp[]): string | null {
  for (const re of regexes) {
    const m = texto.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}
