import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rows = await prisma.retencaoIssMunicipio.findMany({
    distinct: ["municipio"],
    select: { municipio: true },
    orderBy: { municipio: "asc" },
  });
  return NextResponse.json({ municipios: rows.map((r) => r.municipio) });
}
