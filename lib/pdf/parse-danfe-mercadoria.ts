import { parseMoedaBr, parseDataBr, extrairCnpjs } from "./comum";
import type { NotaFiscalParseada, ItemNFeParseado } from "@/lib/xml/parse-nfe";

export interface ResultadoDanfeMercadoria {
  nota: NotaFiscalParseada;
  itensNaoLidos: boolean; // true = não foi possível ler a tabela de produtos automaticamente
  avisos: string[];
}

const REGEX_CHAVE = /(\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4})/;

// Dois layouts de tabela de produtos observados em DANFEs reais (o texto
// extraído do PDF preserva a ordem visual das colunas, que varia por
// software emissor). Espaçamento intra-linha usa só [ \t] (não \s) para
// impedir que o separador atravesse quebras de linha e funda duas linhas
// distintas num só match.
//
// Layout A (ex: UniDANFE): CÓDIGO DESCRIÇÃO NCM CST/CSOSN CFOP UNID QUANT
// VALOR_UNIT VALOR_TOTAL [demais colunas de ICMS, variáveis, não capturadas].
const REGEX_ITEM_LAYOUT_A =
  /^(\S+)[ \t]+(.*?)[ \t]*(\d{7,8})[ \t]+(\d{3,4})[ \t]+([1-7]\d{3})[ \t]+([A-ZÇ]{1,4})\.?[ \t]+([\d.,]+)[ \t]+([\d.,]+)[ \t]+([\d.,]+)/gm;

// Layout B (ex: SupraSys): CÓDIGO(EAN) CFOP UNID QUANT VALOR_UNIT VALOR_TOTAL
// [desconto, base ICMS, valor ICMS, valor IPI, alíq. ICMS, alíq. IPI —
// quantidade variável de colunas] TAB CST/CSOSN TAB NCM. A descrição fica em
// linha(s) anteriores ao código, nunca na mesma linha. Os dois últimos campos
// (CST e NCM) são identificados pelo TAB literal que os separa dos demais
// números — sem isso não dá pra distingui-los das colunas de valor.
const REGEX_ITEM_LAYOUT_B =
  /^(\S+)[ \t]+([1-7]\d{3})[ \t]+([A-ZÇ]{1,4})[ \t]+([\d.,]+)[ \t]+([\d.,]+)[ \t]+([\d.,]+)(?:[ \t]+[\d.,]+)*\t(\d{3,4})\t(\d{7,8})[ \t]*$/gm;

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

interface ItemBruto {
  codigoProduto: string;
  descricaoInline: string; // "" quando o layout não traz a descrição na mesma linha do código
  ncm: string;
  codigoTributario: string;
  cfop: string;
  unidade: string;
  quant: string;
  valorUnit: string;
  valorProd: string;
  indice: number; // posição do match no texto — usada para buscar a descrição em linhas anteriores
}

function extrairItensLayoutA(texto: string): ItemBruto[] {
  const itens: ItemBruto[] = [];
  for (const m of texto.matchAll(REGEX_ITEM_LAYOUT_A)) {
    const [, codigoProduto, descricaoInline, ncm, codigoTributario, cfop, unidade, quant, valorUnit, valorProd] = m;
    itens.push({ codigoProduto, descricaoInline, ncm, codigoTributario, cfop, unidade, quant, valorUnit, valorProd, indice: m.index });
  }
  return itens;
}

function extrairItensLayoutB(texto: string): ItemBruto[] {
  const itens: ItemBruto[] = [];
  for (const m of texto.matchAll(REGEX_ITEM_LAYOUT_B)) {
    const [, codigoProduto, cfop, unidade, quant, valorUnit, valorProd, codigoTributario, ncm] = m;
    itens.push({ codigoProduto, descricaoInline: "", ncm, codigoTributario, cfop, unidade, quant, valorUnit, valorProd, indice: m.index });
  }
  return itens;
}

/** Quando a descrição não está na mesma linha do código do produto, busca até
 *  2 linhas não vazias imediatamente antes do match. Para de subir quando a
 *  linha parece ser a linha de dados de OUTRO item (contém um NCM de 7-8
 *  dígitos ou 2+ valores decimais), um rótulo do cabeçalho, ou for só
 *  números/pontuação. */
function resolverDescricao(texto: string, item: ItemBruto): string {
  const inline = item.descricaoInline.trim();
  if (inline) return inline;

  const antes = texto.slice(0, item.indice).split("\n");
  const linhasDescricao: string[] = [];
  for (let i = antes.length - 1; i >= 0 && linhasDescricao.length < 2; i--) {
    const linha = antes[i].trim();
    if (!linha) continue;
    const pareceLinhaDeItem = /\d{7,8}/.test(linha) || (linha.match(/\d+[.,]\d+/g)?.length ?? 0) >= 2;
    if (/^[\d.,\s]+$/.test(linha) || pareceLinhaDeItem || PALAVRAS_ROTULO.test(linha)) break;
    linhasDescricao.unshift(linha);
  }
  return linhasDescricao.join(" ").trim();
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

  const itensBrutos = extrairItensLayoutA(texto);
  if (itensBrutos.length === 0) itensBrutos.push(...extrairItensLayoutB(texto));

  const itens: ItemNFeParseado[] = [];
  let numeroItem = 1;
  for (const bruto of itensBrutos) {
    const { codigoProduto, ncm, codigoTributario, cfop, unidade, quant, valorUnit, valorProd } = bruto;
    const ehSimples = codigoTributario.length === 4 || simplesNacional;
    const origem = Number(codigoTributario[0]);
    const cst = ehSimples ? "" : codigoTributario.slice(1);
    const csosn = ehSimples ? codigoTributario.slice(1) : "";
    const descricao = resolverDescricao(texto, bruto);

    itens.push({
      numeroItem: numeroItem++,
      codigoProduto,
      descricao,
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
      // As colunas de ICMS (base/valor) que vêm após quantidade/valor total
      // variam de posição e quantidade entre softwares emissores de DANFE —
      // não são capturadas pelo regex, ficam zeradas (mesma limitação já
      // documentada para PIS/COFINS abaixo).
      icmsBase: 0,
      icmsAliquota: 0,
      icmsValor: 0,
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
  if (itens.length > 0) avisos.push("Base e valor de ICMS por item não são lidos automaticamente do PDF (posição variável entre layouts) — confira e complete manualmente se for apurar crédito de ICMS.");
  if (!nota.emitNome) avisos.push("Nome do emitente não encontrado automaticamente.");

  return { nota, itensNaoLidos: itens.length === 0, avisos };
}
