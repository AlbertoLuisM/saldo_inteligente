import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const userId = (session.user as any).id as string;
    const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { deadline: "asc" } });
    return NextResponse.json(goals);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const userId = (session.user as any).id as string;
    const data = await req.json();
    const goal = await prisma.goal.create({
      data: { userId, title: data.title, targetAmount: parseFloat(data.targetAmount), currentAmount: parseFloat(data.currentAmount ?? 0), deadline: new Date(data.deadline), category: data.category, description: data.description ?? null },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
