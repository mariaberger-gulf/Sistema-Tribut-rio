import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseNFeXml, NFeParseError } from "@/lib/xml/parse-nfe";
import { processarItensNota } from "@/lib/regras-fiscais";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("arquivos").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo XML enviado." }, { status: 400 });
    }

    const resultados: { arquivo: string; ok: boolean; notaFiscalId?: number; erro?: string }[] = [];

    for (const file of files) {
      try {
        const xmlText = await file.text();
        const parsed = parseNFeXml(xmlText);

        const existente = await prisma.notaFiscal.findUnique({ where: { chaveAcesso: parsed.chaveAcesso } });
        if (existente) {
          resultados.push({ arquivo: file.name, ok: false, erro: "Nota fiscal já importada anteriormente (chave de acesso duplicada)." });
          continue;
        }

        const empresa = await prisma.empresa.findFirst({
          where: { OR: [{ cnpj: parsed.emitCnpj }, { cnpj: parsed.destCnpj }] },
        });

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
            xmlBruto: xmlText,
            status: "Processada",
          },
        });

        await processarItensNota(notaFiscal.id, parsed, empresa?.regimeTributario);

        resultados.push({ arquivo: file.name, ok: true, notaFiscalId: notaFiscal.id });
      } catch (err) {
        const erro = err instanceof NFeParseError ? err.message : "Erro inesperado ao processar o XML.";
        if (!(err instanceof NFeParseError)) console.error("Erro ao processar NF-e:", err);
        resultados.push({ arquivo: file.name, ok: false, erro });
      }
    }

    return NextResponse.json({ resultados });
  } catch (err) {
    console.error("Erro no upload de notas fiscais:", err);
    return NextResponse.json({ error: "Erro interno ao processar o upload." }, { status: 500 });
  }
}
