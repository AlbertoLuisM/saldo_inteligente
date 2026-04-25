import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const userId = (session.user as any).id as string;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const month = searchParams.get("month");

    const where: any = { userId };
    if (category) where.category = category;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
    }

    const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
    return NextResponse.json(expenses);
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
    const expense = await prisma.expense.create({
      data: { userId, description: data.description, amount: parseFloat(data.amount), category: data.category, date: new Date(data.date), recurrence: data.recurrence ?? "once", paymentMethod: data.paymentMethod ?? null, notes: data.notes ?? null },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
