import { parseMoedaBr, parseDataBr, normalizarCodigoTributacaoNacional, buscarPrimeiro, extrairCnpjs } from "./comum";
import { notaServicoVazia, type NotaServicoParseada } from "./notas-servico-tipos";

/**
 * Extração "melhor esforço" para NFS-e de layout próprio de município (sem
 * padronização nacional). Busca por palavras-chave em qualquer lugar do texto,
 * sem depender da ordem/posição — layouts variam muito e o texto extraído de
 * tabelas pode vir fora de ordem. Sempre marcada como não confiável
 * (confiavel=false): precisa de revisão manual antes de confirmar.
 */
export function parseNfseGenerico(texto: string, cnpjEcotruck: string): NotaServicoParseada {
  const resultado = notaServicoVazia("municipal_generico");
  const naoEncontrados: string[] = [];

  const cnpjEcotruckDigitos = cnpjEcotruck.replace(/\D/g, "");
  const cnpjs = extrairCnpjs(texto);
  resultado.tomadorCnpj = cnpjs.find((c) => c.replace(/\D/g, "") === cnpjEcotruckDigitos)?.replace(/\D/g, "") ?? null;
  resultado.prestadorCnpj = cnpjs.find((c) => c.replace(/\D/g, "") !== cnpjEcotruckDigitos)?.replace(/\D/g, "") ?? null;
  if (!resultado.prestadorCnpj) naoEncontrados.push("CNPJ do prestador");

  resultado.numero = buscarPrimeiro(texto, [
    /(\d{1,10}\/NFE)\b/i,
    /N[uú]mero da Nota\/S[ée]rie\s*\n\s*(\d\S*)/i,
    /N[ºo]\.?\s*(\d{2,10})\b/i,
  ]) ?? "";
  if (!resultado.numero) naoEncontrados.push("Número da nota");

  const dataTexto = buscarPrimeiro(texto, [
    /Data e Hora de Emiss[ãa]o\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /Emitida em:?\s*\n?\s*(\d{2}-\d{2}-\d{4})/i,
    /Data e Hora da emiss[ãa]o[^\n]*\n\s*(\d{2}\/\d{2}\/\d{4})/i,
  ])?.replace(/-/g, "/") ?? null;
  resultado.dataEmissao = parseDataBr(dataTexto);
  if (!resultado.dataEmissao) naoEncontrados.push("Data de emissão");

  const competencia = buscarPrimeiro(texto, [
    /Compet[êe]ncia:?\s*\n?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
  ]);
  resultado.competencia = competencia ?? "";

  resultado.prestadorNome = buscarPrimeiro(texto, [
    /Raz[ãa]o Social\s*:?\s*\n?\s*([A-ZÀ-Ú][A-ZÀ-Ú0-9\s.&/-]{4,80}?)(?:\s*\n|$|\s{2,}CNPJ)/,
  ]) ?? "";

  resultado.prestadorMunicipio = buscarPrimeiro(texto, [
    /Munic[íi]pio\s*:?\s*\n?\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]+-\s*[A-Z]{2})/,
  ]) ?? "";

  resultado.prestadorSimplesNacional = /OPTANTE\s+(?:DO|PELO)?\s*SIMPLES NACIONAL/i.test(texto) && !/N[ãa]o optante/i.test(texto);

  const codigoTrib = buscarPrimeiro(texto, [
    /C[óo]digo (?:de )?Tributa[çc][ãa]o Nacional:?\s*\n?\s*([\d.]+)/i,
    /Subitem\s+[Ll]ista\s+de\s+Servi[çc]os\s+LC\s*116\/0?3\s*\/?\s*Descri[çc][ãa]o:?\s*\n?\s*([\d.]+)/i,
    /C[óo]digo do Servi[çc]o:?\s*\n?\s*([\d.]+)/i,
    /C[óo]digo de Tributa[çc][ãa]o do Munic[íi]pio\s*\(CTISS\):?\s*\n?\s*([\d./-]+)/i,
  ]) ?? "";
  resultado.codigoTributacaoNacional = codigoTrib;
  resultado.itemServicoCodigoBase = codigoTrib ? normalizarCodigoTributacaoNacional(codigoTrib) : null;
  if (!resultado.itemServicoCodigoBase) naoEncontrados.push("Código de tributação (item LC 116)");

  resultado.descricaoServico = buscarPrimeiro(texto, [
    /Discrimina[çc][ãa]o do\(s?\)?\s*Servi[çc]o\(s?\)?\s*\n(.+)/i,
  ]) ?? "";

  resultado.valorServico = parseMoedaBr(buscarPrimeiro(texto, [
    /VALOR TOTAL DA NOTA\s*=?\s*R\$\s*([\d.,]+)/i,
    /Valor (?:dos|do) Servi[çc]os?:?\s*\n?\s*R\$\s*([\d.,]+)/i,
    /Valor L[íi]quido(?: da NFS-e)?:?\s*\n?\s*R\$\s*([\d.,]+)/i,
  ]));
  if (resultado.valorServico === null) naoEncontrados.push("Valor do serviço");

  resultado.aliquotaIss = (() => {
    const v = buscarPrimeiro(texto, [
      /Al[íi]quota (?:ISSQN|ISS)\s*\(?%?\)?:?\s*\n?\s*([\d.,]+)\s*%?/i,
      /\(X\)\s*Al[íi]quota:?\s*\n?\s*([\d.,]+)\s*%/i,
    ]);
    return v ? parseFloat(v.replace(",", ".")) : null;
  })();

  resultado.valorIss = parseMoedaBr(buscarPrimeiro(texto, [
    /Valor do ISSQN\s*\(R\$\)\s*\n?\s*([\d.,]+)/i,
    /\(=\)\s*Valor do ISS:?\s*\n?\s*R\$\s*([\d.,]+)/i,
  ]));

  const issRetidoTexto = buscarPrimeiro(texto, [
    /ISSQN Retido na Fonte\s*\n?\s*(SIM|N[ÃA]O)/i,
    /ISS Retido na Fonte:?\s*\n?\s*R\$\s*([\d.,]+)/i,
  ]);
  resultado.issRetido = issRetidoTexto ? /SIM/i.test(issRetidoTexto) : null;

  resultado.irrfDeclarado = parseMoedaBr(buscarPrimeiro(texto, [/\bIR:?\s*\n?\s*R\$\s*([\d.,]+)/i]));
  const pis = parseMoedaBr(buscarPrimeiro(texto, [/\bPIS:?\s*\n?\s*R\$\s*([\d.,]+)/i]));
  const cofins = parseMoedaBr(buscarPrimeiro(texto, [/\bCOFINS:?\s*\n?\s*R\$\s*([\d.,]+)/i]));
  const csll = parseMoedaBr(buscarPrimeiro(texto, [/\bCSLL:?\s*\n?\s*R\$\s*([\d.,]+)/i]));
  if (pis !== null || cofins !== null || csll !== null) {
    resultado.pccDeclarado = (pis ?? 0) + (cofins ?? 0) + (csll ?? 0);
  }

  resultado.valorLiquido = parseMoedaBr(buscarPrimeiro(texto, [/Valor L[íi]quido:?\s*\n?\s*R\$\s*([\d.,]+)/i])) ?? resultado.valorServico;

  resultado.camposNaoEncontrados = naoEncontrados;
  resultado.confiavel = false; // layout não padronizado — sempre exige revisão manual

  return resultado;
}
