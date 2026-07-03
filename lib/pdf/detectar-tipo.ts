export type TipoDocumentoPdf = "danfse_nacional" | "nfcom" | "danfe_mercadoria" | "municipal_generico";

/** Identifica o tipo de documento fiscal a partir do texto extraído do PDF. */
export function detectarTipoDocumento(texto: string): TipoDocumentoPdf {
  const t = texto.toUpperCase();

  if (t.includes("DANFSE") && t.includes("DOCUMENTO AUXILIAR DA NFS-E")) {
    return "danfse_nacional";
  }
  if (t.includes("DANFE-COM") || t.includes("NFCOM") || t.includes("NFCOM Nº") || /\bNFCOM\b/.test(t)) {
    return "nfcom";
  }
  // Palavras isoladas (não a frase inteira): o texto extraído de layouts em
  // colunas costuma vir fora de ordem, então "DOCUMENTO AUXILIAR DA NOTA
  // FISCAL ELETRÔNICA" raramente aparece como uma frase contígua.
  if (
    t.includes("DANFE") &&
    t.includes("CHAVE DE ACESSO") &&
    (t.includes("DESTINATÁRIO") || t.includes("DESTINATARIO")) &&
    t.includes("PRODUTO")
  ) {
    return "danfe_mercadoria";
  }
  return "municipal_generico";
}
