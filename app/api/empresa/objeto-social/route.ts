import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { empresaId, descricao, origem } = body;
  if (!empresaId || !descricao) {
    return NextResponse.json({ error: "Informe a descrição da atividade." }, { status: 400 });
  }

  const item = await prisma.objetoSocialItem.create({
    data: { empresaId: Number(empresaId), descricao: String(descricao).trim(), origem: String(origem ?? "").trim() },
  });
  return NextResponse.json({ item });
}
