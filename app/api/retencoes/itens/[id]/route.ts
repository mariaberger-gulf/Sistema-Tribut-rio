import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CAMPOS_TEXTO = ["descricao", "pis", "cofins", "csll", "irrf15", "irrf10", "observacaoFederal", "inss", "observacaoInss"] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const body = await request.json();
  const data: Record<string, string> = {};
  for (const campo of CAMPOS_TEXTO) {
    if (typeof body[campo] === "string") data[campo] = body[campo];
  }

  const item = await prisma.itemServicoLC116.update({ where: { id: itemId }, data });
  return NextResponse.json({ item });
}
