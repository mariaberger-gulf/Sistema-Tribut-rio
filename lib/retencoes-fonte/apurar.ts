export interface ItemServicoRef {
  codigo: string;
  codigoBase: string;
  itemGrupo: string;
  descricao: string;
  pis: string;
  cofins: string;
  csll: string;
  irrf15: string;
  irrf10: string;
  observacaoFederal: string;
  inss: string;
  observacaoInss: string;
}

export interface IssMunicipioRef {
  aliquota: number | null;
  retencao: string;
  observacao: string;
}

export interface ApurarRetencoesInput {
  item: ItemServicoRef;
  valorServico: number;
  prestadorSimplesNacional: boolean;
  cessaoMaoDeObra: boolean;
  issRef: IssMunicipioRef | null;
  municipioParticularidade: string | null;
  aliquotaIssInformadaNaNf?: number; // obrigatório informar quando prestador é Simples Nacional
}

export type StatusRetencao = "elegivel" | "nao_elegivel" | "condicional";

export interface ResultadoTributo {
  tributo: string;
  status: StatusRetencao;
  valor: number;
  aliquota: number | null;
  motivo: string;
}

export interface ResultadoApuracao {
  pcc: ResultadoTributo[]; // PIS, COFINS, CSLL
  irrf: ResultadoTributo;
  inss: ResultadoTributo;
  iss: ResultadoTributo;
  valorTotalRetido: number;
  atencao: string[];
}

const TOLERANCIA_DISPENSA_PCC_IRRF = 10; // Lei 10.833/2003 art. 31 §3º; RIR/2018 art. 785

// Itens em que o INSS retido de prestador Simples Nacional (Anexo IV, §5º-C
// art. 18 LC 123/2006) permanece devido: construção civil, vigilância/limpeza
// /conservação e advocacia.
function inssValeParaSimplesAnexoIV(item: ItemServicoRef): boolean {
  if (item.itemGrupo === "7") return true; // engenharia/construção civil/limpeza e conservação
  if (["11.02", "11.03"].includes(item.codigoBase)) return true; // vigilância/escolta
  if (item.codigoBase === "17.14") return true; // advocacia
  return false;
}

function statusDeTexto(valor: string): StatusRetencao {
  const v = valor.trim().toUpperCase();
  if (v === "SIM") return "elegivel";
  if (v === "NÃO" || v === "NAO" || v === "—" || v === "-") return "nao_elegivel";
  return "condicional"; // "SIM/NÃO", "NÃO/SIM", "NÃO SALVO...", etc — depende do caso concreto
}

function apurarPcc(item: ItemServicoRef, valorServico: number, simplesNacional: boolean): ResultadoTributo[] {
  const tributos: { nome: string; valor: string; aliquota: number }[] = [
    { nome: "PIS", valor: item.pis, aliquota: 0.65 },
    { nome: "COFINS", valor: item.cofins, aliquota: 3 },
    { nome: "CSLL", valor: item.csll, aliquota: 1 },
  ];

  if (simplesNacional) {
    return tributos.map((t) => ({
      tributo: t.nome,
      status: "nao_elegivel" as const,
      valor: 0,
      aliquota: null,
      motivo: "PCC não se aplica quando o prestador é optante pelo Simples Nacional (Lei 10.833/2003).",
    }));
  }

  return tributos.map((t) => {
    const status = statusDeTexto(t.valor);
    if (status !== "elegivel") {
      return {
        tributo: t.nome,
        status,
        valor: 0,
        aliquota: null,
        motivo: status === "condicional"
          ? `Depende do caso concreto (fonte: "${t.valor}") — conferir o objeto na NF/contrato.`
          : "Não há retenção para este item da lista de serviços.",
      };
    }
    return { tributo: t.nome, status, valor: (valorServico * t.aliquota) / 100, aliquota: t.aliquota, motivo: "Retenção devida (Lei 10.833/2003)." };
  });
}

function aplicarDispensaPcc(pcc: ResultadoTributo[]): ResultadoTributo[] {
  const total = pcc.reduce((acc, t) => acc + t.valor, 0);
  if (total > 0 && total <= TOLERANCIA_DISPENSA_PCC_IRRF) {
    return pcc.map((t) => (t.valor > 0
      ? { ...t, status: "nao_elegivel" as const, valor: 0, motivo: `Retenção dispensada: valor total do PCC (R$ ${total.toFixed(2)}) é igual ou inferior a R$ 10,00 (Lei 10.833/2003, art. 31, §3º).` }
      : t));
  }
  return pcc;
}

function apurarIrrf(item: ItemServicoRef, valorServico: number, simplesNacional: boolean): ResultadoTributo {
  if (simplesNacional) {
    return { tributo: "IRRF", status: "nao_elegivel", valor: 0, aliquota: null, motivo: "IRRF não é retido de prestador optante pelo Simples Nacional (o IRPJ já está incluído no DAS)." };
  }

  const status15 = statusDeTexto(item.irrf15);
  const status10 = statusDeTexto(item.irrf10);

  let escolhido: { aliquota: number; status: StatusRetencao; label: string } | null = null;
  if (status15 === "elegivel") escolhido = { aliquota: 1.5, status: "elegivel", label: "1,5% (RIR/2018, art. 714 — rol taxativo de serviços profissionais)" };
  else if (status10 === "elegivel") escolhido = { aliquota: 1.0, status: "elegivel", label: "1,0% (RIR/2018, art. 716 — limpeza, conservação, segurança, vigilância, locação de mão de obra)" };
  else if (status15 === "condicional" || status10 === "condicional") {
    const raw = status15 === "condicional" ? item.irrf15 : item.irrf10;
    return { tributo: "IRRF", status: "condicional", valor: 0, aliquota: null, motivo: `Depende do caso concreto (fonte: "${raw}") — conferir o objeto na NF/contrato.` };
  }

  if (!escolhido) {
    return { tributo: "IRRF", status: "nao_elegivel", valor: 0, aliquota: null, motivo: "Não há retenção de IRRF para este item da lista de serviços." };
  }

  const valor = (valorServico * escolhido.aliquota) / 100;
  if (valor <= TOLERANCIA_DISPENSA_PCC_IRRF) {
    return { tributo: "IRRF", status: "nao_elegivel", valor: 0, aliquota: escolhido.aliquota, motivo: `Retenção dispensada: valor (R$ ${valor.toFixed(2)}) é igual ou inferior a R$ 10,00 (RIR/2018, art. 785).` };
  }
  return { tributo: "IRRF", status: "elegivel", valor, aliquota: escolhido.aliquota, motivo: `Retenção devida — alíquota ${escolhido.label}.` };
}

function apurarInss(item: ItemServicoRef, valorServico: number, simplesNacional: boolean, cessaoMaoDeObra: boolean): ResultadoTributo {
  if (!cessaoMaoDeObra) {
    return { tributo: "INSS", status: "nao_elegivel", valor: 0, aliquota: null, motivo: "A retenção previdenciária só ocorre mediante cessão de mão de obra ou empreitada — não assinalado para este serviço." };
  }

  const status = statusDeTexto(item.inss);
  if (status !== "elegivel") {
    return { tributo: "INSS", status: status === "condicional" ? "condicional" : "nao_elegivel", valor: 0, aliquota: null, motivo: item.observacaoInss || "Não há previsão legal de retenção previdenciária para este item (IN RFB 971/2009)." };
  }

  if (simplesNacional && !inssValeParaSimplesAnexoIV(item)) {
    return { tributo: "INSS", status: "nao_elegivel", valor: 0, aliquota: null, motivo: "Optantes pelo Simples Nacional estão dispensados da retenção previdenciária, exceto para construção civil, vigilância/limpeza/conservação e advocacia (art. 191 da IN RFB 971/2009; LC 123/2006, art. 18, §5º-C)." };
  }

  return { tributo: "INSS", status: "elegivel", valor: valorServico * 0.11, aliquota: 11, motivo: item.observacaoInss || "Retenção de 11% sobre o valor bruto da nota fiscal (IN RFB 971/2009, art. 112)." };
}

function apurarIss(
  issRef: IssMunicipioRef | null,
  valorServico: number,
  simplesNacional: boolean,
  aliquotaInformadaNaNf?: number
): ResultadoTributo {
  if (!issRef) {
    return { tributo: "ISS", status: "condicional", valor: 0, aliquota: null, motivo: "Não há regra cadastrada para este município e item — consultar a legislação municipal diretamente." };
  }

  if (simplesNacional) {
    if (aliquotaInformadaNaNf === undefined) {
      return { tributo: "ISS", status: "condicional", valor: 0, aliquota: null, motivo: "Prestador é Simples Nacional: a alíquota de ISS a reter é a informada na própria nota fiscal (LC 123/2006, art. 21, §4º, V), não a alíquota padrão do município. Informe a alíquota da NF para calcular." };
    }
    const status = statusDeTexto(issRef.retencao);
    if (status !== "elegivel") {
      return { tributo: "ISS", status, valor: 0, aliquota: aliquotaInformadaNaNf, motivo: issRef.observacao || "Sem retenção de ISS prevista para este item no município do tomador." };
    }
    return { tributo: "ISS", status: "elegivel", valor: (valorServico * aliquotaInformadaNaNf) / 100, aliquota: aliquotaInformadaNaNf, motivo: "Retenção com a alíquota informada na NF do prestador Simples Nacional." };
  }

  const status = statusDeTexto(issRef.retencao);
  if (status !== "elegivel") {
    return { tributo: "ISS", status, valor: 0, aliquota: issRef.aliquota, motivo: issRef.observacao || "Sem retenção de ISS prevista para este item no município do tomador." };
  }
  if (issRef.aliquota === null) {
    return { tributo: "ISS", status: "condicional", valor: 0, aliquota: null, motivo: "Retenção indicada, mas sem alíquota cadastrada — conferir na legislação municipal." };
  }
  return { tributo: "ISS", status: "elegivel", valor: valorServico * issRef.aliquota, aliquota: issRef.aliquota * 100, motivo: issRef.observacao || "Retenção devida conforme legislação municipal do tomador." };
}

export interface ResultadoApuracaoFederal {
  pcc: ResultadoTributo[];
  irrf: ResultadoTributo;
  valorTotalRetido: number;
  atencao: string[];
}

/** Apuração restrita à Tabela Federal (IR-PCC): PIS/COFINS/CSLL e IRRF. Não considera INSS (Previdência Social) nem ISS (por município). */
export function apurarRetencaoFederal(
  item: ItemServicoRef,
  valorServico: number,
  prestadorSimplesNacional: boolean
): ResultadoApuracaoFederal {
  const pcc = aplicarDispensaPcc(apurarPcc(item, valorServico, prestadorSimplesNacional));
  const irrf = apurarIrrf(item, valorServico, prestadorSimplesNacional);
  const valorTotalRetido = pcc.reduce((acc, t) => acc + t.valor, 0) + irrf.valor;

  const atencao: string[] = [];
  if ([...pcc, irrf].some((t) => t.status === "condicional")) {
    atencao.push("Há tributo(s) marcado(s) como condicional — a fonte original indica que depende do caso concreto (objeto exato do serviço na NF/contrato).");
  }
  if (item.observacaoFederal && item.observacaoFederal !== "—") {
    atencao.push(`Observação: ${item.observacaoFederal}`);
  }

  return { pcc, irrf, valorTotalRetido, atencao };
}

/** Apuração completa (Federal + INSS + ISS) — não usada pela tela de Apuração atual (restrita à Tabela Federal), mantida para uma futura visão combinada. */
export function apurarRetencoes(input: ApurarRetencoesInput): ResultadoApuracao {
  const { item, valorServico, prestadorSimplesNacional, cessaoMaoDeObra, issRef, municipioParticularidade, aliquotaIssInformadaNaNf } = input;

  const pcc = aplicarDispensaPcc(apurarPcc(item, valorServico, prestadorSimplesNacional));
  const irrf = apurarIrrf(item, valorServico, prestadorSimplesNacional);
  const inss = apurarInss(item, valorServico, prestadorSimplesNacional, cessaoMaoDeObra);
  const iss = apurarIss(issRef, valorServico, prestadorSimplesNacional, aliquotaIssInformadaNaNf);

  const valorTotalRetido = pcc.reduce((acc, t) => acc + t.valor, 0) + irrf.valor + inss.valor + iss.valor;

  const atencao: string[] = [];
  if ([...pcc, irrf, inss, iss].some((t) => t.status === "condicional")) {
    atencao.push("Há tributo(s) marcado(s) como condicional — a fonte original indica que depende do caso concreto (objeto exato do serviço na NF/contrato).");
  }
  if (municipioParticularidade) {
    atencao.push(`Particularidade do município: ${municipioParticularidade}`);
  }
  if (item.observacaoFederal && item.observacaoFederal !== "—") {
    atencao.push(`Observação (federal): ${item.observacaoFederal}`);
  }

  return { pcc, irrf, inss, iss, valorTotalRetido, atencao };
}
