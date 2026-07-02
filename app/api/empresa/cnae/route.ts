import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { empresaId, codigo, descricao } = body;
  if (!empresaId || !codigo || !descricao) {
    return NextResponse.json({ error: "Informe código e descrição do CNAE." }, { status: 400 });
  }

  const cnae = await prisma.cnaeSecundario.create({
    data: { empresaId: Number(empresaId), codigo: String(codigo).trim(), descricao: String(descricao).trim() },
  });
  return NextResponse.json({ cnae });
}
