import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const empresa = await prisma.empresa.findFirst({
    include: {
      cnaesSecundarios: { orderBy: { codigo: "asc" } },
      objetoSocial: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json({ empresa });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "ID da empresa não informado." }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const campo of ["razaoSocial", "nomeFantasia", "municipio", "uf", "regimeTributario", "cnaePrincipalCodigo", "cnaePrincipalDescricao"]) {
    if (typeof rest[campo] === "string") data[campo] = rest[campo];
  }

  const empresa = await prisma.empresa.update({ where: { id: Number(id) }, data });
  return NextResponse.json({ empresa });
}
