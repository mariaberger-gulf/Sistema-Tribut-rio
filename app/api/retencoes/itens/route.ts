import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const itens = await prisma.itemServicoLC116.findMany({
    where: q
      ? {
          OR: [
            { codigo: { contains: q, mode: "insensitive" } },
            { descricao: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { codigo: "asc" },
    take: 50,
  });

  return NextResponse.json({ itens });
}
