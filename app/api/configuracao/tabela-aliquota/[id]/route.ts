import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.descricao === "string") data.descricao = body.descricao;
  if (typeof body.categoria === "string") data.categoria = body.categoria;
  if (typeof body.prefixoNcm === "string") data.prefixoNcm = body.prefixoNcm;
  if (typeof body.seletivo === "boolean") data.seletivo = body.seletivo;
  if (body.aliquotaSeletivo !== undefined) data.aliquotaSeletivo = Number(body.aliquotaSeletivo) || 0;
  if (typeof body.ativo === "boolean") data.ativo = body.ativo;

  const item = await prisma.tabelaAliquota.update({ where: { id: itemId }, data });
  return NextResponse.json({ item });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  await prisma.tabelaAliquota.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
