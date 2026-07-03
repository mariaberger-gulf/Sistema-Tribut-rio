import { parseMoedaBr, parseDataBr, normalizarCodigoTributacaoNacional } from "./comum";
import { notaServicoVazia, type NotaServicoParseada } from "./notas-servico-tipos";

// Rótulos que aparecem no DANFSe v1.0 (padrão nacional), usados para delimitar
// onde um valor multilinha (nome, descrição) termina.
const ROTULOS_CONHECIDOS = [
  "Chave de Acesso da NFS-e", "Número da NFS-e", "Competência da NFS-e",
  "Data e Hora da emissão da NFS-e", "Número da DPS", "Série da DPS",
  "Data e Hora da emissão da DPS", "EMITENTE DA NFS-e", "Prestador do Serviço",
  "CNPJ / CPF / NIF", "Inscrição Municipal", "Telefone", "Nome / Nome Empresarial",
  "E-mail", "Endereço", "Município", "CEP", "Simples Nacional na Data de Competência",
  "Regime de Apuração Tributária pelo SN", "TOMADOR DO SERVIÇO CNPJ / CPF / NIF",
  "INTERMEDIÁRIO DO SERVIÇO", "SERVIÇO PRESTADO", "Código de Tributação Nacional",
  "Código de Tributação Municipal", "Local da Prestação", "País da Prestação",
  "Descrição do Serviço", "TRIBUTAÇÃO MUNICIPAL", "Tributação do ISSQN",
  "Operação Tributável", "País Resultado da Prestação do Serviço",
  "Município de Incidência do ISSQN", "Regime Especial de Tributação",
  "Tipo de Imunidade", "Suspensão da Exigibilidade do ISSQN", "Número Processo Suspensão",
  "Benefício Municipal", "Valor do Serviço", "Desconto Incondicionado",
  "Total Deduções/Reduções", "Cálculo do BM", "BC ISSQN", "Alíquota Aplicada",
  "Retenção do ISSQN", "ISSQN Apurado", "TRIBUTAÇÃO FEDERAL", "IRRF",
  "Contribuição Previdenciária - Retida", "Contribuições Sociais - Retidas",
  "Descrição Contrib. Sociais - Retidas", "PIS - Débito Apuração Própria",
  "COFINS - Débito Apuração Própria", "VALOR TOTAL DA NFS-E", "Desconto Condicionado",
  "ISSQN Retido", "Total das Retenções Federais", "PIS/COFINS - Débito Apur. Própria",
  "Valor Líquido da NFS-e", "TOTAIS APROXIMADOS DOS TRIBUTOS", "Federais", "Estaduais",
  "Municipais", "INFORMAÇÕES COMPLEMENTARES",
];

function normalizarLinha(l: string): string {
  return l.trim();
}

function capturarValor(linhas: string[], indiceRotulo: number): string {
  const bloco: string[] = [];
  for (let i = indiceRotulo + 1; i < linhas.length && bloco.length < 3; i++) {
    const linha = normalizarLinha(linhas[i]);
    if (ROTULOS_CONHECIDOS.some((r) => linha === r)) break;
    if (linha === "") continue;
    bloco.push(linha);
  }
  return bloco.join(" ").trim();
}

function indiceRotulo(linhas: string[], rotulo: string, apartirDe = 0): number {
  for (let i = apartirDe; i < linhas.length; i++) {
    if (normalizarLinha(linhas[i]) === rotulo) return i;
  }
  return -1;
}

function valorMonetario(v: string): number | null {
  if (!v || v === "-") return null;
  return parseMoedaBr(v);
}

export function parseDanfseNacional(texto: string): NotaServicoParseada {
  const linhas = texto.split("\n");
  const resultado = notaServicoVazia("danfse_nacional");
  const naoEncontrados: string[] = [];

  const pega = (rotulo: string, apartirDe = 0): { valor: string; indice: number } => {
    const idx = indiceRotulo(linhas, rotulo, apartirDe);
    if (idx === -1) {
      naoEncontrados.push(rotulo);
      return { valor: "", indice: -1 };
    }
    return { valor: capturarValor(linhas, idx), indice: idx };
  };

  const chaveIdx = indiceRotulo(linhas, "Chave de Acesso da NFS-e");
  const chaveLinha = chaveIdx !== -1 ? normalizarLinha(linhas[chaveIdx + 1] ?? "") : "";
  resultado.chaveAcesso = /^\d{20,60}$/.test(chaveLinha) ? chaveLinha : null;
  if (chaveIdx === -1) naoEncontrados.push("Chave de Acesso da NFS-e");
  resultado.numero = pega("Número da NFS-e").valor;
  resultado.competencia = pega("Competência da NFS-e").valor;
  resultado.dataEmissao = parseDataBr(pega("Data e Hora da emissão da NFS-e").valor);

  const emitenteIdx = indiceRotulo(linhas, "EMITENTE DA NFS-e");
  const tomadorRotuloIdx = indiceRotulo(linhas, "TOMADOR DO SERVIÇO CNPJ / CPF / NIF");

  const prestadorCnpjLinha = pega("CNPJ / CPF / NIF", emitenteIdx);
  resultado.prestadorCnpj = prestadorCnpjLinha.valor ? prestadorCnpjLinha.valor.replace(/\D/g, "") : null;
  resultado.prestadorNome = pega("Nome / Nome Empresarial", emitenteIdx).valor;
  resultado.prestadorMunicipio = pega("Município", emitenteIdx).valor;
  const simplesTexto = pega("Simples Nacional na Data de Competência", emitenteIdx).valor.toUpperCase();
  resultado.prestadorSimplesNacional = simplesTexto.includes("OPTANTE") && !simplesTexto.includes("NÃO OPTANTE") && !simplesTexto.includes("NAO OPTANTE");

  if (tomadorRotuloIdx !== -1) {
    const tomadorCnpjTexto = capturarValor(linhas, tomadorRotuloIdx);
    resultado.tomadorCnpj = tomadorCnpjTexto ? tomadorCnpjTexto.replace(/\D/g, "") : null;
    resultado.tomadorNome = pega("Nome / Nome Empresarial", tomadorRotuloIdx).valor;
    resultado.tomadorMunicipio = pega("Município", tomadorRotuloIdx).valor;
  } else {
    naoEncontrados.push("TOMADOR DO SERVIÇO CNPJ / CPF / NIF");
  }

  const servicoIdx = indiceRotulo(linhas, "SERVIÇO PRESTADO");
  const codTributacao = pega("Código de Tributação Nacional", servicoIdx).valor;
  resultado.codigoTributacaoNacional = codTributacao;
  resultado.itemServicoCodigoBase = normalizarCodigoTributacaoNacional(codTributacao);
  resultado.descricaoServico = pega("Descrição do Serviço", servicoIdx).valor;

  const tribMunicipalIdx = indiceRotulo(linhas, "TRIBUTAÇÃO MUNICIPAL");
  resultado.valorServico = valorMonetario(pega("Valor do Serviço", tribMunicipalIdx).valor);
  const aliqTexto = pega("Alíquota Aplicada", tribMunicipalIdx).valor;
  resultado.aliquotaIss = aliqTexto ? parseFloat(aliqTexto.replace(",", ".").replace("%", "")) : null;
  const retencaoIssTexto = pega("Retenção do ISSQN", tribMunicipalIdx).valor.toUpperCase();
  resultado.issRetido = retencaoIssTexto.includes("NÃO RETIDO") || retencaoIssTexto.includes("NAO RETIDO") ? false : retencaoIssTexto.includes("RETIDO") ? true : null;
  resultado.valorIss = valorMonetario(pega("ISSQN Apurado", tribMunicipalIdx).valor);

  const tribFederalIdx = indiceRotulo(linhas, "TRIBUTAÇÃO FEDERAL");
  resultado.irrfDeclarado = valorMonetario(pega("IRRF", tribFederalIdx).valor);
  resultado.pccDeclarado = valorMonetario(pega("Contribuições Sociais - Retidas", tribFederalIdx).valor);

  const valorTotalIdx = indiceRotulo(linhas, "VALOR TOTAL DA NFS-E");
  resultado.valorLiquido = valorMonetario(pega("Valor Líquido da NFS-e", valorTotalIdx).valor);

  resultado.camposNaoEncontrados = naoEncontrados;
  resultado.confiavel = naoEncontrados.length === 0 && resultado.valorServico !== null && !!resultado.prestadorCnpj;

  return resultado;
}
