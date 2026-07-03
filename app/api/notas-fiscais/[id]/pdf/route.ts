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
    select: { arquivoPdf: true, numero: true, serie: true },
  });
  if (!nota?.arquivoPdf) {
    return NextResponse.json({ error: "PDF não disponível para esta nota." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(nota.arquivoPdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="NFe-${nota.numero}-${nota.serie}.pdf"`,
    },
  });
}
