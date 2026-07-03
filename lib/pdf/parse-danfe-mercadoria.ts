import { parseMoedaBr, parseDataBr, extrairCnpjs } from "./comum";
import type { NotaFiscalParseada, ItemNFeParseado } from "@/lib/xml/parse-nfe";

export interface ResultadoDanfeMercadoria {
  nota: NotaFiscalParseada;
  itensNaoLidos: boolean; // true = não foi possível ler a tabela de produtos automaticamente
  avisos: string[];
}

const REGEX_CHAVE = /(\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4})/;
const REGEX_ITEM = /^(\S+)\s+(.+?)\s+(\d{7,8})\s+(\d{3,4})\s+([1-7]\d{3})\s+([A-ZÇ]{1,4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/gm;

const PALAVRAS_ROTULO = /INSCRI[ÇC][ÃA]O|CNPJ|IDENTIFICA[ÇC][ÃA]O|DANFE|DOCUMENTO|AUXILIAR|ELETR[ÔO]NICA|NOTA FISCAL|CHAVE DE ACESSO|CONSULTA|NATUREZA|OPERA[ÇC][ÃA]O|PROTOCOLO|AUTORIZA[ÇC][ÃA]O|DESTINAT[ÁA]RIO|EMITENTE|FOLHA/i;

/** Busca no bloco de identificação (início do documento, antes de
 *  "DESTINATÁRIO") uma linha que pareça razão social do emitente — o layout
 *  do DANFE varia demais entre softwares emissores para localizar isso de
 *  forma exata a partir da posição do CNPJ. */
function nomeEmitente(texto: string): string {
  const fimBloco = texto.search(/DESTINAT[ÁA]RIO/i);
  const bloco = fimBloco > 0 ? texto.slice(0, fimBloco) : texto.slice(0, 1500);
  for (const linhaOriginal of bloco.split("\n")) {
    // remove rótulos que às vezes aparecem colados na mesma linha do nome
    const l = linhaOriginal.trim().replace(/\s+(NOTA FISCAL|DANFE|DOCUMENTO AUXILIAR).*$/i, "").trim();
    const nPalavras = l.split(/\s+/).length;
    if (
      /^[A-ZÀ-Ú][A-ZÀ-Ú\s.&/-]{7,45}$/.test(l) &&
      nPalavras >= 2 && nPalavras <= 6 &&
      !PALAVRAS_ROTULO.test(l)
    ) {
      return l;
    }
  }
  return "";
}

const UFS_VALIDAS = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

function extrairUfs(texto: string): string[] {
  const encontradas: string[] = [];
  for (const m of texto.matchAll(/\b([A-ZÀ-Ú]{3,})\s*-\s*([A-Z]{2})\b/g)) {
    if (UFS_VALIDAS.has(m[2])) encontradas.push(m[2]);
  }
  return encontradas;
}

const NATUREZAS_CONHECIDAS = /(VENDA DE MERCADORIAS?[A-ZÀ-Ú\s/]*|DEVOLU[ÇC][ÃA]O[A-ZÀ-Ú\s/]*|REMESSA[A-ZÀ-Ú\s/]*|TRANSFER[ÊE]NCIA[A-ZÀ-Ú\s/]*|PRESTA[ÇC][ÃA]O DE SERVI[ÇC]O[A-ZÀ-Ú\s/]*)/;

function extrairNaturezaOperacao(texto: string): string {
  const m = texto.match(NATUREZAS_CONHECIDAS);
  return m ? m[1].trim().replace(/\s{2,}/g, " ") : "";
}

export function parseDanfeMercadoria(texto: string, cnpjEcotruck: string): ResultadoDanfeMercadoria | { erro: string } {
  const chaveMatch = texto.match(REGEX_CHAVE);
  const chaveAcesso = chaveMatch ? chaveMatch[1].replace(/\s/g, "") : null;
  if (!chaveAcesso) {
    return { erro: "Não foi possível localizar a chave de acesso no PDF. Verifique se é um DANFE (NF-e modelo 55) válido." };
  }

  const cnpjEcotruckDigitos = cnpjEcotruck.replace(/\D/g, "");
  const cnpjs = extrairCnpjs(texto);
  // Mantém a versão formatada (com pontuação) só para localizar outros
  // campos por proximidade no texto (ex: data de emissão); os campos da nota
  // em si guardam somente dígitos, no mesmo formato usado por Empresa.cnpj.
  const destCnpjFormatado = cnpjs.find((c) => c.replace(/\D/g, "") === cnpjEcotruckDigitos) ?? cnpjEcotruck;
  const emitCnpjFormatado = cnpjs.find((c) => c.replace(/\D/g, "") !== cnpjEcotruckDigitos) ?? "";
  const destCnpj = destCnpjFormatado.replace(/\D/g, "");
  const emitCnpj = emitCnpjFormatado.replace(/\D/g, "");

  const numeroMatch = texto.match(/(\d{3}\.\d{3}\.\d{3})\s*\n\s*S[ÉE]RIE/i) ?? texto.match(/N[ºo°]\s*(\d{3}\.\d{3}\.\d{3})/i);
  const numero = numeroMatch ? numeroMatch[1].replace(/\./g, "") : "";

  const serieMatch = texto.match(/S[ÉE]RIE\s*\n?\s*(\d{1,3})\b/i);
  const serie = serieMatch ? serieMatch[1] : "1";

  const dataEmissaoMatch =
    texto.match(new RegExp(`${destCnpjFormatado.replace(/[.\-/]/g, "\\$&")}\\s+(\\d{2}\\/\\d{2}\\/\\d{4})`)) ??
    texto.match(/DATA D[AE] EMISS[ÃA]O\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/i);
  const dataEmissao = dataEmissaoMatch ? parseDataBr(dataEmissaoMatch[1]) : null;

  const avisos: string[] = [];
  if (!dataEmissao) avisos.push("Data de emissão não encontrada automaticamente — confira e preencha.");

  // tpNF: dígito logo após a chave de acesso ("0-ENTRADA/1-SAÍDA")
  const posChave = texto.indexOf(chaveMatch![1]);
  const restoAposChave = texto.slice(posChave + chaveMatch![1].length, posChave + chaveMatch![1].length + 10);
  const tpNFMatch = restoAposChave.match(/^\s*([01])\b/);
  const tpNF = tpNFMatch ? Number(tpNFMatch[1]) : 1;

  const naturezaOperacao = extrairNaturezaOperacao(texto);

  const ufsEncontradas = extrairUfs(texto);
  const emitUf = ufsEncontradas[0] ?? "";
  const destUf = ufsEncontradas[1] ?? emitUf;

  const totalNotaMatch = texto.match(/(?:VALOR )?TOTAL DA NOTA\s*\n?\s*([\d.,]+)/i);
  const valorTotal = parseMoedaBr(totalNotaMatch?.[1]) ?? 0;
  const totalProdutosMatch = texto.match(/TOTAL DOS PRODUTOS\s*\n?\s*([\d.,]+)/i);
  const valorProdutos = parseMoedaBr(totalProdutosMatch?.[1]) ?? valorTotal;

  const simplesNacional = /OPTANTE PELO SIMPLES NACIONAL/i.test(texto);

  const itens: ItemNFeParseado[] = [];
  let numeroItem = 1;
  for (const m of texto.matchAll(REGEX_ITEM)) {
    const [, codigoProduto, descricao, ncm, codigoTributario, cfop, unidade, quant, valorUnit, valorProd, bcIcms, valorIcms] = m;
    const ehSimples = codigoTributario.length === 4 || simplesNacional;
    const origem = Number(codigoTributario[0]);
    const cst = ehSimples ? "" : codigoTributario.slice(1);
    const csosn = ehSimples ? codigoTributario.slice(1) : "";

    itens.push({
      numeroItem: numeroItem++,
      codigoProduto,
      descricao: descricao.trim(),
      ncm,
      cest: "",
      cfop,
      unidade,
      quantidade: parseMoedaBr(quant) ?? 0,
      valorUnitario: parseMoedaBr(valorUnit) ?? 0,
      valorProduto: parseMoedaBr(valorProd) ?? 0,
      origem,
      cst,
      csosn,
      modBC: 0,
      icmsBase: parseMoedaBr(bcIcms) ?? 0,
      icmsAliquota: 0,
      icmsValor: parseMoedaBr(valorIcms) ?? 0,
      icmsStBase: 0,
      icmsStAliquota: 0,
      icmsStValor: 0,
      fcpAliquota: 0,
      ipiCst: "",
      ipiBase: 0,
      ipiAliquota: 0,
      ipiValor: 0,
      // PIS/COFINS não são impressos no DANFE (só constam na XML original) —
      // ficam zerados; a apuração de crédito desses tributos não é possível
      // a partir do PDF.
      pisCst: "",
      pisBase: 0,
      pisAliquota: 0,
      pisValor: 0,
      cofinsCst: "",
      cofinsBase: 0,
      cofinsAliquota: 0,
      cofinsValor: 0,
    });
  }

  const nota: NotaFiscalParseada = {
    chaveAcesso,
    numero,
    serie,
    dataEmissao: dataEmissao ?? new Date(),
    tpNF,
    idDest: emitUf && destUf && emitUf === destUf ? 1 : 2,
    finNFe: /devolu[çc][ãa]o/i.test(naturezaOperacao) ? 4 : 1,
    naturezaOperacao,
    emitCnpj,
    emitNome: nomeEmitente(texto),
    emitUf: emitUf ?? "",
    emitCrt: simplesNacional || itens.some((i) => i.csosn) ? 1 : 3,
    destCnpj,
    destNome: "",
    destUf: destUf ?? "",
    valorProdutos,
    valorIcms: itens.reduce((acc, i) => acc + i.icmsValor, 0),
    valorIpi: 0,
    valorPis: 0,
    valorCofins: 0,
    valorTotal,
    itens,
  };

  if (itens.length === 0) avisos.push("Não foi possível ler a tabela de produtos automaticamente — confira o PDF e cadastre os itens manualmente.");
  if (!nota.emitNome) avisos.push("Nome do emitente não encontrado automaticamente.");

  return { nota, itensNaoLidos: itens.length === 0, avisos };
}
