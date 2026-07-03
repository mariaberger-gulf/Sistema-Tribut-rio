export type TipoDocumentoServico = "danfse_nacional" | "nfcom" | "municipal_generico";

export interface NotaServicoParseada {
  tipoDocumento: TipoDocumentoServico;
  confiavel: boolean; // true = extração de alta confiança, pode ser confirmada automaticamente
  chaveAcesso: string | null;
  numero: string;
  dataEmissao: Date | null;
  competencia: string;
  prestadorCnpj: string | null;
  prestadorNome: string;
  prestadorMunicipio: string;
  prestadorSimplesNacional: boolean;
  tomadorCnpj: string | null;
  tomadorNome: string;
  tomadorMunicipio: string;
  codigoTributacaoNacional: string;
  itemServicoCodigoBase: string | null;
  descricaoServico: string;
  valorServico: number | null;
  aliquotaIss: number | null;
  issRetido: boolean | null;
  valorIss: number | null;
  irrfDeclarado: number | null;
  pccDeclarado: number | null; // PIS+COFINS+CSLL retidos, combinados (como declarado no documento)
  valorLiquido: number | null;
  camposNaoEncontrados: string[]; // nomes de campos que não puderam ser extraídos, para sinalizar revisão
}

export function notaServicoVazia(tipoDocumento: TipoDocumentoServico): NotaServicoParseada {
  return {
    tipoDocumento,
    confiavel: false,
    chaveAcesso: null,
    numero: "",
    dataEmissao: null,
    competencia: "",
    prestadorCnpj: null,
    prestadorNome: "",
    prestadorMunicipio: "",
    prestadorSimplesNacional: false,
    tomadorCnpj: null,
    tomadorNome: "",
    tomadorMunicipio: "",
    codigoTributacaoNacional: "",
    itemServicoCodigoBase: null,
    descricaoServico: "",
    valorServico: null,
    aliquotaIss: null,
    issRetido: null,
    valorIss: null,
    irrfDeclarado: null,
    pccDeclarado: null,
    valorLiquido: null,
    camposNaoEncontrados: [],
  };
}
