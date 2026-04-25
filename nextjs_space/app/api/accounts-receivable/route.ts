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
    const items = await prisma.accountReceivable.findMany({ where: { userId }, orderBy: { expectedDate: "asc" } });
    return NextResponse.json(items);
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
    const item = await prisma.accountReceivable.create({
      data: { userId, description: data.description, amount: parseFloat(data.amount), expectedDate: new Date(data.expectedDate), payer: data.payer ?? null, status: data.status ?? "pending", notes: data.notes ?? null },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
