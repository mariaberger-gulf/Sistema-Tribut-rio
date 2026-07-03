import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseNFeXml, NFeParseError, type NotaFiscalParseada } from "@/lib/xml/parse-nfe";
import { parseDanfeMercadoria } from "@/lib/pdf/parse-danfe-mercadoria";
import { extrairTextoPdf } from "@/lib/pdf/extrair-texto";
import { detectarTipoDocumento } from "@/lib/pdf/detectar-tipo";
import { parseDanfseNacional } from "@/lib/pdf/parse-danfse-nacional";
import { parseNfcom } from "@/lib/pdf/parse-nfcom";
import { parseNfseGenerico } from "@/lib/pdf/parse-nfse-generico";
import type { NotaServicoParseada } from "@/lib/pdf/notas-servico-tipos";
import { processarItensNota } from "@/lib/regras-fiscais";

type Empresa = Awaited<ReturnType<typeof prisma.empresa.findFirst>>;

interface ResultadoItem {
  arquivo: string;
  ok: boolean;
  tipo?: "fiscal" | "servico";
  id?: number;
  erro?: string;
  avisos?: string[];
  status?: string;
}

async function criarNotaFiscal(
  parsed: NotaFiscalParseada,
  textoBruto: string,
  avisos: string[],
  arquivoPdf: Buffer | null
): Promise<{ ok: boolean; id?: number; erro?: string; avisos?: string[] }> {
  const existente = await prisma.notaFiscal.findUnique({ where: { chaveAcesso: parsed.chaveAcesso } });
  if (existente) return { ok: false, erro: "Nota fiscal já importada anteriormente (chave de acesso duplicada)." };

  const empresa = await prisma.empresa.findFirst({
    where: { OR: [{ cnpj: parsed.emitCnpj }, { cnpj: parsed.destCnpj }] },
  });
  if (empresa) {
    if (!parsed.emitNome && empresa.cnpj === parsed.emitCnpj) parsed.emitNome = empresa.razaoSocial;
    if (!parsed.destNome && empresa.cnpj === parsed.destCnpj) parsed.destNome = empresa.razaoSocial;
  }

  const notaFiscal = await prisma.notaFiscal.create({
    data: {
      empresaId: empresa?.id,
      chaveAcesso: parsed.chaveAcesso,
      numero: parsed.numero,
      serie: parsed.serie,
      dataEmissao: parsed.dataEmissao,
      tpNF: parsed.tpNF,
      idDest: parsed.idDest,
      finNFe: parsed.finNFe,
      naturezaOperacao: parsed.naturezaOperacao,
      emitCnpj: parsed.emitCnpj,
      emitNome: parsed.emitNome,
      emitUf: parsed.emitUf,
      emitCrt: parsed.emitCrt,
      destCnpj: parsed.destCnpj,
      destNome: parsed.destNome,
      destUf: parsed.destUf,
      valorProdutos: parsed.valorProdutos,
      valorIcms: parsed.valorIcms,
      valorIpi: parsed.valorIpi,
      valorPis: parsed.valorPis,
      valorCofins: parsed.valorCofins,
      valorTotal: parsed.valorTotal,
      xmlBruto: textoBruto,
      arquivoPdf,
      status: avisos.length > 0 ? "Revisão Pendente" : "Processada",
    },
  });

  await processarItensNota(notaFiscal.id, parsed, empresa);
  return { ok: true, id: notaFiscal.id, avisos };
}

async function criarNotaServico(
  parseada: NotaServicoParseada,
  textoBruto: string,
  arquivoNome: string,
  empresaEcotruck: Empresa,
  arquivoPdf: Buffer | null
): Promise<{ ok: boolean; id?: number; erro?: string; status?: string }> {
  if (!parseada.tomadorNome && parseada.tomadorCnpj && empresaEcotruck && parseada.tomadorCnpj.replace(/\D/g, "") === empresaEcotruck.cnpj.replace(/\D/g, "")) {
    parseada.tomadorNome = empresaEcotruck.razaoSocial;
    parseada.tomadorMunicipio = parseada.tomadorMunicipio || empresaEcotruck.municipio;
  }

  if (parseada.chaveAcesso) {
    const existente = await prisma.notaServico.findFirst({ where: { chaveAcesso: parseada.chaveAcesso } });
    if (existente) return { ok: false, erro: "Nota já importada anteriormente (mesma chave de acesso)." };
  }

  const nota = await prisma.notaServico.create({
    data: {
      arquivoOrigem: arquivoNome,
      tipoDocumento: parseada.tipoDocumento,
      status: parseada.confiavel ? "Confirmada" : "Necessita revisão",
      chaveAcesso: parseada.chaveAcesso,
      numero: parseada.numero,
      dataEmissao: parseada.dataEmissao,
      competencia: parseada.competencia,
      prestadorCnpj: parseada.prestadorCnpj ?? "",
      prestadorNome: parseada.prestadorNome,
      prestadorMunicipio: parseada.prestadorMunicipio,
      prestadorSimplesNacional: parseada.prestadorSimplesNacional,
      tomadorCnpj: parseada.tomadorCnpj ?? "",
      tomadorNome: parseada.tomadorNome,
      tomadorMunicipio: parseada.tomadorMunicipio,
      codigoTributacaoNacional: parseada.codigoTributacaoNacional,
      itemServicoCodigoBase: parseada.itemServicoCodigoBase,
      descricaoServico: parseada.descricaoServico,
      valorServico: parseada.valorServico,
      aliquotaIss: parseada.aliquotaIss,
      issRetido: parseada.issRetido,
      valorIss: parseada.valorIss,
      irrfDeclarado: parseada.irrfDeclarado,
      pccDeclarado: parseada.pccDeclarado,
      valorLiquido: parseada.valorLiquido,
      camposNaoEncontrados: parseada.camposNaoEncontrados,
      textoExtraido: textoBruto,
      arquivoPdf,
    },
  });

  return { ok: true, id: nota.id, status: nota.status };
}

/** Upload único para Notas Fiscais (mercadoria, XML ou PDF/DANFE) e Notas de
 *  Serviço (PDF de NFS-e/NFCom) — o tipo de documento é detectado
 *  automaticamente por arquivo, sem exigir que o usuário escolha o botão certo. */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("arquivos").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const empresa = await prisma.empresa.findFirst();
    const resultados: ResultadoItem[] = [];

    for (const file of files) {
      try {
        const nomeMin = file.name.toLowerCase();

        if (nomeMin.endsWith(".xml")) {
          const textoBruto = await file.text();
          const parsed = parseNFeXml(textoBruto);
          const r = await criarNotaFiscal(parsed, textoBruto, [], null);
          resultados.push({ arquivo: file.name, tipo: "fiscal", ...r });
          continue;
        }

        if (!nomeMin.endsWith(".pdf")) {
          resultados.push({ arquivo: file.name, ok: false, erro: "Formato não suportado — envie um arquivo .xml ou .pdf." });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const textoBruto = await extrairTextoPdf(buffer);
        if (!textoBruto || textoBruto.trim().length < 20) {
          resultados.push({ arquivo: file.name, ok: false, erro: "Não foi possível extrair texto do PDF (pode ser uma imagem escaneada sem camada de texto)." });
          continue;
        }

        const tipoDoc = detectarTipoDocumento(textoBruto);

        if (tipoDoc === "danfe_mercadoria") {
          const resultado = parseDanfeMercadoria(textoBruto, empresa?.cnpj ?? "");
          if ("erro" in resultado) {
            resultados.push({ arquivo: file.name, ok: false, erro: resultado.erro });
            continue;
          }
          const r = await criarNotaFiscal(resultado.nota, textoBruto, resultado.avisos, buffer);
          resultados.push({ arquivo: file.name, tipo: "fiscal", ...r });
          continue;
        }

        const parseada =
          tipoDoc === "danfse_nacional" ? parseDanfseNacional(textoBruto) :
          tipoDoc === "nfcom" ? parseNfcom(textoBruto, empresa?.cnpj ?? "") :
          parseNfseGenerico(textoBruto, empresa?.cnpj ?? "");

        const r = await criarNotaServico(parseada, textoBruto, file.name, empresa, buffer);
        resultados.push({ arquivo: file.name, tipo: "servico", ...r });
      } catch (err) {
        const erro = err instanceof NFeParseError ? err.message : "Erro inesperado ao processar o arquivo.";
        if (!(err instanceof NFeParseError)) console.error("Erro ao processar nota:", err);
        resultados.push({ arquivo: file.name, ok: false, erro });
      }
    }

    return NextResponse.json({ resultados });
  } catch (err) {
    console.error("Erro no upload de notas:", err);
    return NextResponse.json({ error: "Erro interno ao processar o upload." }, { status: 500 });
  }
}
