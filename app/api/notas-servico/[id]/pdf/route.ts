import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notaId = Number(id);
  if (!Number.isInteger(notaId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const nota = await prisma.notaServico.findUnique({
    where: { id: notaId },
    select: { arquivoPdf: true, numero: true, arquivoOrigem: true },
  });
  if (!nota?.arquivoPdf) {
    return NextResponse.json({ error: "PDF não disponível para esta nota." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(nota.arquivoPdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nota.numero || nota.arquivoOrigem}.pdf"`,
    },
  });
}
