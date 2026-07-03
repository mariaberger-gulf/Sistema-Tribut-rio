import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processarNotaServicoPdf } from "@/lib/pdf/processar-nota-servico";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("arquivos").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo PDF enviado." }, { status: 400 });
    }

    const empresa = await prisma.empresa.findFirst();
    const cnpjEcotruck = empresa?.cnpj ?? "";

    const resultados: { arquivo: string; ok: boolean; notaServicoId?: number; erro?: string; status?: string }[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const processado = await processarNotaServicoPdf(buffer, cnpjEcotruck);

        if ("erro" in processado) {
          resultados.push({ arquivo: file.name, ok: false, erro: processado.erro });
          continue;
        }

        const { parseada, texto } = processado;

        if (!parseada.tomadorNome && parseada.tomadorCnpj && empresa && parseada.tomadorCnpj.replace(/\D/g, "") === empresa.cnpj.replace(/\D/g, "")) {
          parseada.tomadorNome = empresa.razaoSocial;
          parseada.tomadorMunicipio = parseada.tomadorMunicipio || empresa.municipio;
        }

        if (parseada.chaveAcesso) {
          const existente = await prisma.notaServico.findFirst({ where: { chaveAcesso: parseada.chaveAcesso } });
          if (existente) {
            resultados.push({ arquivo: file.name, ok: false, erro: "Nota já importada anteriormente (mesma chave de acesso)." });
            continue;
          }
        }

        const nota = await prisma.notaServico.create({
          data: {
            arquivoOrigem: file.name,
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
            textoExtraido: texto,
          },
        });

        resultados.push({ arquivo: file.name, ok: true, notaServicoId: nota.id, status: nota.status });
      } catch (err) {
        console.error("Erro ao processar PDF de serviço:", err);
        resultados.push({ arquivo: file.name, ok: false, erro: "Erro inesperado ao processar o PDF." });
      }
    }

    return NextResponse.json({ resultados });
  } catch (err) {
    console.error("Erro no upload de notas de serviço:", err);
    return NextResponse.json({ error: "Erro interno ao processar o upload." }, { status: 500 });
  }
}
