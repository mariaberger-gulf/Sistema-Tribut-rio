import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const notas = await prisma.notaServico.findMany({
    orderBy: [{ dataEmissao: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, arquivoOrigem: true, tipoDocumento: true, status: true, numero: true,
      dataEmissao: true, prestadorNome: true, prestadorCnpj: true, valorServico: true,
      itemServicoCodigoBase: true,
    },
  });
  return NextResponse.json({ notas });
}
