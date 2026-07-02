import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.cnaeSecundario.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
