import { parseMoedaBr, buscarPrimeiro, extrairCnpjs } from "./comum";
import { notaServicoVazia, type NotaServicoParseada } from "./notas-servico-tipos";

/**
 * NFCom (fatura de telecom) não segue a Lista de Serviços da LC 116/2003 —
 * é tributada por ICMS, não ISS. Extraímos os dados gerais e as retenções
 * federais declaradas, mas não há item de serviço LC116 para vincular.
 */
export function parseNfcom(texto: string, cnpjEcotruck: string): NotaServicoParseada {
  const resultado = notaServicoVazia("nfcom");
  const naoEncontrados: string[] = [];

  resultado.chaveAcesso = buscarPrimeiro(texto, [/Chave de acesso:\s*\n?\s*([\d\s]{40,60})/i])?.replace(/\s/g, "") ?? null;
  if (!resultado.chaveAcesso) naoEncontrados.push("Chave de acesso");

  resultado.numero = buscarPrimeiro(texto, [/NFCOM\s*Nº\s*(\d+)/i]) ?? "";
  if (!resultado.numero) naoEncontrados.push("Número da NFCom");

  const competencia = buscarPrimeiro(texto, [/Refer[êe]ncia\s*\n?\s*(\d{2}\/\d{4})/i]);
  resultado.competencia = competencia ?? "";

  const cnpjs = extrairCnpjs(texto).map((c) => c.replace(/\D/g, ""));
  const cnpjEcotruckDigitos = cnpjEcotruck.replace(/\D/g, "");
  resultado.tomadorCnpj = cnpjs.includes(cnpjEcotruckDigitos) ? cnpjEcotruckDigitos : null;
  resultado.prestadorCnpj = cnpjs.find((c) => c !== cnpjEcotruckDigitos) ?? null;

  resultado.prestadorNome = buscarPrimeiro(texto, [/\n([A-ZÀ-Ú][A-ZÀ-Ú\s./]+S\/?A)\s*\nCNPJ\s*\d/i]) ?? "";
  resultado.tomadorNome = buscarPrimeiro(texto, [/EMPRESA BRASILEIRA[A-ZÀ-Ú\s]*S(?:\/A|A)?\b/i]) ?? "";

  resultado.valorServico = parseMoedaBr(buscarPrimeiro(texto, [/Valor total\s*\n?\s*R\$\s*([\d.,]+)/i]));
  resultado.valorLiquido = resultado.valorServico;

  const retencoesMatch = texto.match(/PIS\s+COFINS\s+CSLL\s+IRRF\s*\n\s*([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i);
  if (retencoesMatch) {
    const [, pis, cofins, csll, irrfValor] = retencoesMatch;
    resultado.pccDeclarado = (parseMoedaBr(pis) ?? 0) + (parseMoedaBr(cofins) ?? 0) + (parseMoedaBr(csll) ?? 0);
    resultado.irrfDeclarado = parseMoedaBr(irrfValor);
  } else {
    naoEncontrados.push("Retenção de tributos federais");
  }

  resultado.camposNaoEncontrados = naoEncontrados;
  resultado.confiavel = naoEncontrados.length === 0 && resultado.valorServico !== null && !!resultado.prestadorCnpj;

  return resultado;
}
