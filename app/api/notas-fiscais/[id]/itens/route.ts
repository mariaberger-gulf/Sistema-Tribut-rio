import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reprocessarItem } from "@/lib/regras-fiscais";

const CAMPOS_ITEM_PADRAO = {
  codigoProduto: "",
  descricao: "",
  ncm: "",
  cest: "",
  cfop: "",
  unidade: "UN",
  quantidade: 0,
  valorUnitario: 0,
  valorProduto: 0,
  origem: 0,
  cst: "",
  csosn: "",
  modBC: 0,
  icmsBase: 0,
  icmsAliquota: 0,
  icmsValor: 0,
  icmsStBase: 0,
  icmsStAliquota: 0,
  icmsStValor: 0,
  fcpAliquota: 0,
  ipiCst: "",
  ipiBase: 0,
  ipiAliquota: 0,
  ipiValor: 0,
  pisCst: "",
  pisBase: 0,
  pisAliquota: 0,
  pisValor: 0,
  cofinsCst: "",
  cofinsBase: 0,
  cofinsAliquota: 0,
  cofinsValor: 0,
} as const;

const CAMPOS_EDITAVEIS = Object.keys(CAMPOS_ITEM_PADRAO) as (keyof typeof CAMPOS_ITEM_PADRAO)[];

/** Adiciona um item manualmente a uma nota fiscal já existente — usada quando
 *  a leitura automática do PDF não conseguiu extrair a linha do produto. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notaFiscalId = Number(id);
  if (!Number.isInteger(notaFiscalId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const nota = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  if (!nota) return NextResponse.json({ error: "Nota fiscal não encontrada." }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = { ...CAMPOS_ITEM_PADRAO };
  for (const campo of CAMPOS_EDITAVEIS) {
    if (body[campo] !== undefined) data[campo] = body[campo];
  }

  const ultimoItem = await prisma.itemNotaFiscal.findFirst({
    where: { notaFiscalId },
    orderBy: { numeroItem: "desc" },
  });

  const item = await prisma.itemNotaFiscal.create({
    data: { ...data, notaFiscalId, numeroItem: (ultimoItem?.numeroItem ?? 0) + 1 } as never,
  });

  await reprocessarItem(item.id);

  const itemCompleto = await prisma.itemNotaFiscal.findUnique({
    where: { id: item.id },
    include: { validacoes: true, creditos: true, simulacoes: { orderBy: { anoReferencia: "asc" } } },
  });

  return NextResponse.json({ item: itemCompleto });
}
