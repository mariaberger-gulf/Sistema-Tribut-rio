import { extrairTextoPdf } from "./extrair-texto";
import { detectarTipoDocumento } from "./detectar-tipo";
import { parseDanfseNacional } from "./parse-danfse-nacional";
import { parseNfcom } from "./parse-nfcom";
import { parseNfseGenerico } from "./parse-nfse-generico";
import type { NotaServicoParseada } from "./notas-servico-tipos";

export interface ProcessamentoNotaServico {
  parseada: NotaServicoParseada;
  texto: string;
}

export async function processarNotaServicoPdf(
  buffer: Buffer,
  cnpjEcotruck: string
): Promise<ProcessamentoNotaServico | { erro: string }> {
  const texto = await extrairTextoPdf(buffer);
  if (!texto || texto.trim().length < 20) {
    return { erro: "Não foi possível extrair texto do PDF (pode ser uma imagem escaneada sem camada de texto)." };
  }

  const tipo = detectarTipoDocumento(texto);
  if (tipo === "danfe_mercadoria") {
    return { erro: "Este PDF parece ser uma nota fiscal de mercadoria (NF-e modelo 55), não de serviço. Envie pela aba Notas Fiscais." };
  }

  const parseada =
    tipo === "danfse_nacional" ? parseDanfseNacional(texto) :
    tipo === "nfcom" ? parseNfcom(texto, cnpjEcotruck) :
    parseNfseGenerico(texto, cnpjEcotruck);

  return { parseada, texto };
}
