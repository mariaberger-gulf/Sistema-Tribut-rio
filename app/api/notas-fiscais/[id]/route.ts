import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notaFiscalId = Number(id);
  if (!Number.isInteger(notaFiscalId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const nota = await prisma.notaFiscal.findUnique({
    where: { id: notaFiscalId },
    include: {
      empresa: true,
      itens: {
        orderBy: { numeroItem: "asc" },
        include: {
          validacoes: true,
          creditos: true,
          simulacoes: { orderBy: { anoReferencia: "asc" } },
        },
      },
    },
  });

  if (!nota) {
    return NextResponse.json({ error: "Nota fiscal não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ nota });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notaFiscalId = Number(id);
  if (!Number.isInteger(notaFiscalId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  await prisma.notaFiscal.delete({ where: { id: notaFiscalId } });
  return NextResponse.json({ ok: true });
}
