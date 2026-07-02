import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apurarRetencaoFederal } from "@/lib/retencoes-fonte/apurar";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { itemCodigo, valorServico, prestadorSimplesNacional } = body;

  if (!itemCodigo || !valorServico) {
    return NextResponse.json({ error: "Informe o item de serviço e o valor do serviço." }, { status: 400 });
  }

  const item = await prisma.itemServicoLC116.findUnique({ where: { codigo: String(itemCodigo) } });
  if (!item) {
    return NextResponse.json({ error: "Item de serviço não encontrado." }, { status: 404 });
  }

  const resultado = apurarRetencaoFederal(item, Number(valorServico), Boolean(prestadorSimplesNacional));

  return NextResponse.json({ item, resultado });
}
