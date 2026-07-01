import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tabela = await prisma.tabelaAliquota.findMany({ orderBy: { prefixoNcm: "asc" } });
  return NextResponse.json({ tabela });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { prefixoNcm, descricao, categoria, seletivo, aliquotaSeletivo } = body;

  if (typeof prefixoNcm !== "string" || !descricao || !categoria) {
    return NextResponse.json({ error: "Preencha prefixo do NCM, descrição e categoria." }, { status: 400 });
  }

  const item = await prisma.tabelaAliquota.create({
    data: {
      prefixoNcm,
      descricao,
      categoria,
      seletivo: Boolean(seletivo),
      aliquotaSeletivo: Number(aliquotaSeletivo) || 0,
    },
  });

  return NextResponse.json({ item });
}
