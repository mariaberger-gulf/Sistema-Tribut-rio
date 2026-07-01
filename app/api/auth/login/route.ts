import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Preencha e-mail e senha." }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!usuario) {
      return NextResponse.json({ error: "E-mail não encontrado." }, { status: 401 });
    }

    if (usuario.status !== "Ativo") {
      return NextResponse.json(
        { error: "Usuário inativo. Contate o administrador." },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(String(password), usuario.senhaHash);
    if (!valid) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    await createSession({
      userId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      funcao: usuario.funcao,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
