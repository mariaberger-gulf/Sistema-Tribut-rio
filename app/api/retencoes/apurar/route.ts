import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apurarRetencoes } from "@/lib/retencoes-fonte/apurar";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    itemCodigo,
    municipio,
    valorServico,
    prestadorSimplesNacional,
    cessaoMaoDeObra,
    aliquotaIssInformadaNaNf,
  } = body;

  if (!itemCodigo || !municipio || !valorServico) {
    return NextResponse.json({ error: "Informe o item de serviço, o município e o valor do serviço." }, { status: 400 });
  }

  const item = await prisma.itemServicoLC116.findUnique({ where: { codigo: String(itemCodigo) } });
  if (!item) {
    return NextResponse.json({ error: "Item de serviço não encontrado." }, { status: 404 });
  }

  const [issRef, particularidade] = await Promise.all([
    prisma.retencaoIssMunicipio.findUnique({
      where: { municipio_codigoBase: { municipio: String(municipio), codigoBase: item.codigoBase } },
    }),
    prisma.municipioParticularidade.findUnique({ where: { municipio: String(municipio) } }),
  ]);

  const resultado = apurarRetencoes({
    item,
    valorServico: Number(valorServico),
    prestadorSimplesNacional: Boolean(prestadorSimplesNacional),
    cessaoMaoDeObra: Boolean(cessaoMaoDeObra),
    issRef: issRef ? { aliquota: issRef.aliquota, retencao: issRef.retencao, observacao: issRef.observacao } : null,
    municipioParticularidade: particularidade?.particularidade ?? null,
    aliquotaIssInformadaNaNf: aliquotaIssInformadaNaNf !== undefined && aliquotaIssInformadaNaNf !== ""
      ? Number(aliquotaIssInformadaNaNf)
      : undefined,
  });

  return NextResponse.json({ item, resultado });
}
