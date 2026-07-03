import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseNFeXml, NFeParseError, type NotaFiscalParseada } from "@/lib/xml/parse-nfe";
import { parseDanfeMercadoria } from "@/lib/pdf/parse-danfe-mercadoria";
import { extrairTextoPdf } from "@/lib/pdf/extrair-texto";
import { detectarTipoDocumento } from "@/lib/pdf/detectar-tipo";
import { processarItensNota } from "@/lib/regras-fiscais";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("arquivos").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const empresaEcotruck = await prisma.empresa.findFirst();
    const resultados: { arquivo: string; ok: boolean; notaFiscalId?: number; erro?: string; avisos?: string[] }[] = [];

    for (const file of files) {
      try {
        let parsed: NotaFiscalParseada;
        let textoBruto: string;
        let avisos: string[] = [];
        const ehPdf = file.name.toLowerCase().endsWith(".pdf");

        if (ehPdf) {
          const buffer = Buffer.from(await file.arrayBuffer());
          textoBruto = await extrairTextoPdf(buffer);
          const tipo = detectarTipoDocumento(textoBruto);
          if (tipo !== "danfe_mercadoria") {
            resultados.push({
              arquivo: file.name,
              ok: false,
              erro: "Este PDF não parece ser uma nota fiscal de mercadoria (DANFE modelo 55). Se for nota de serviço (NFS-e/NFCom), envie pela aba Notas de Serviço.",
            });
            continue;
          }
          const resultado = parseDanfeMercadoria(textoBruto, empresaEcotruck?.cnpj ?? "");
          if ("erro" in resultado) {
            resultados.push({ arquivo: file.name, ok: false, erro: resultado.erro });
            continue;
          }
          parsed = resultado.nota;
          avisos = resultado.avisos;
        } else {
          textoBruto = await file.text();
          parsed = parseNFeXml(textoBruto);
        }

        const existente = await prisma.notaFiscal.findUnique({ where: { chaveAcesso: parsed.chaveAcesso } });
        if (existente) {
          resultados.push({ arquivo: file.name, ok: false, erro: "Nota fiscal já importada anteriormente (chave de acesso duplicada)." });
          continue;
        }

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
            status: avisos.length > 0 ? "Revisão Pendente" : "Processada",
          },
        });

        await processarItensNota(notaFiscal.id, parsed, empresa);

        resultados.push({ arquivo: file.name, ok: true, notaFiscalId: notaFiscal.id, avisos });
      } catch (err) {
        const erro = err instanceof NFeParseError ? err.message : "Erro inesperado ao processar o arquivo.";
        if (!(err instanceof NFeParseError)) console.error("Erro ao processar nota fiscal:", err);
        resultados.push({ arquivo: file.name, ok: false, erro });
      }
    }

    return NextResponse.json({ resultados });
  } catch (err) {
    console.error("Erro no upload de notas fiscais:", err);
    return NextResponse.json({ error: "Erro interno ao processar o upload." }, { status: 500 });
  }
}
