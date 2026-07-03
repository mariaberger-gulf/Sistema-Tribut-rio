import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reprocessarItem } from "@/lib/regras-fiscais";

const CAMPOS_EDITAVEIS = [
  "codigoProduto", "descricao", "ncm", "cest", "cfop", "unidade",
  "quantidade", "valorUnitario", "valorProduto",
  "origem", "cst", "csosn", "modBC",
  "icmsBase", "icmsAliquota", "icmsValor",
  "icmsStBase", "icmsStAliquota", "icmsStValor", "fcpAliquota",
  "ipiCst", "ipiBase", "ipiAliquota", "ipiValor",
  "pisCst", "pisBase", "pisAliquota", "pisValor",
  "cofinsCst", "cofinsBase", "cofinsAliquota", "cofinsValor",
] as const;

/** Edita um item de nota fiscal já existente e reprocessa classificação,
 *  crédito e simulação da reforma para refletir os novos dados. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const notaFiscalId = Number(id);
  const itemNotaFiscalId = Number(itemId);
  if (!Number.isInteger(notaFiscalId) || !Number.isInteger(itemNotaFiscalId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const itemExistente = await prisma.itemNotaFiscal.findUnique({ where: { id: itemNotaFiscalId } });
  if (!itemExistente || itemExistente.notaFiscalId !== notaFiscalId) {
    return NextResponse.json({ error: "Item não encontrado nesta nota fiscal." }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITAVEIS) {
    if (body[campo] !== undefined) data[campo] = body[campo];
  }

  await prisma.itemNotaFiscal.update({ where: { id: itemNotaFiscalId }, data });
  await reprocessarItem(itemNotaFiscalId);

  const itemAtualizado = await prisma.itemNotaFiscal.findUnique({
    where: { id: itemNotaFiscalId },
    include: { validacoes: true, creditos: true, simulacoes: { orderBy: { anoReferencia: "asc" } } },
  });

  return NextResponse.json({ item: itemAtualizado });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const notaFiscalId = Number(id);
  const itemNotaFiscalId = Number(itemId);
  if (!Number.isInteger(notaFiscalId) || !Number.isInteger(itemNotaFiscalId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const itemExistente = await prisma.itemNotaFiscal.findUnique({ where: { id: itemNotaFiscalId } });
  if (!itemExistente || itemExistente.notaFiscalId !== notaFiscalId) {
    return NextResponse.json({ error: "Item não encontrado nesta nota fiscal." }, { status: 404 });
  }

  await prisma.itemNotaFiscal.delete({ where: { id: itemNotaFiscalId } });
  return NextResponse.json({ ok: true });
}
