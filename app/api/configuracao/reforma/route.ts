import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const configuracao =
    (await prisma.configuracaoReforma.findUnique({ where: { id: 1 } })) ??
    (await prisma.configuracaoReforma.create({ data: { id: 1, aliquotaPadraoCbs: 8.8, aliquotaPadraoIbs: 17.7 } }));
  return NextResponse.json({ configuracao });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const aliquotaPadraoCbs = Number(body.aliquotaPadraoCbs);
  const aliquotaPadraoIbs = Number(body.aliquotaPadraoIbs);

  if (!Number.isFinite(aliquotaPadraoCbs) || !Number.isFinite(aliquotaPadraoIbs)) {
    return NextResponse.json({ error: "Alíquotas inválidas." }, { status: 400 });
  }

  const configuracao = await prisma.configuracaoReforma.upsert({
    where: { id: 1 },
    update: { aliquotaPadraoCbs, aliquotaPadraoIbs },
    create: { id: 1, aliquotaPadraoCbs, aliquotaPadraoIbs },
  });

  return NextResponse.json({ configuracao });
}
