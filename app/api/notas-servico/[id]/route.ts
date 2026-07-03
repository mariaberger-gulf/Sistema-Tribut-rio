import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apurarRetencaoFederal } from "@/lib/retencoes-fonte/apurar";

const CAMPOS_EDITAVEIS = [
  "numero", "competencia", "prestadorCnpj", "prestadorNome", "prestadorMunicipio",
  "prestadorSimplesNacional", "tomadorCnpj", "tomadorNome", "tomadorMunicipio",
  "itemServicoCodigoBase", "descricaoServico", "valorServico", "aliquotaIss",
  "issRetido", "valorIss", "irrfDeclarado", "pccDeclarado", "valorLiquido", "status",
] as const;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notaId = Number(id);
  if (!Number.isInteger(notaId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const nota = await prisma.notaServico.findUnique({ where: { id: notaId } });
  if (!nota) return NextResponse.json({ error: "Nota não encontrada." }, { status: 404 });

  let apuracao = null;
  let itemServico = null;
  if (nota.itemServicoCodigoBase && nota.valorServico !== null) {
    itemServico = await prisma.itemServicoLC116.findFirst({ where: { codigoBase: nota.itemServicoCodigoBase } });
    if (itemServico) {
      apuracao = apurarRetencaoFederal(itemServico, nota.valorServico, nota.prestadorSimplesNacional);
    }
  }

  return NextResponse.json({ nota, itemServico, apuracao });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notaId = Number(id);
  if (!Number.isInteger(notaId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITAVEIS) {
    if (body[campo] !== undefined) data[campo] = body[campo];
  }

  const nota = await prisma.notaServico.update({ where: { id: notaId }, data });
  return NextResponse.json({ nota });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notaId = Number(id);
  if (!Number.isInteger(notaId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

  await prisma.notaServico.delete({ where: { id: notaId } });
  return NextResponse.json({ ok: true });
}
