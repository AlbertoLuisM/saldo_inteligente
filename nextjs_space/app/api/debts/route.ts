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
    const debts = await prisma.debt.findMany({ where: { userId }, orderBy: { dueDate: "asc" } });
    return NextResponse.json(debts);
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
    const debt = await prisma.debt.create({
      data: {
        userId,
        description: data.description,
        creditor: data.creditor,
        originalAmount: parseFloat(data.originalAmount),
        remainingBalance: parseFloat(data.remainingBalance),
        interestRate: parseFloat(data.interestRate ?? 0),
        installments: parseInt(data.installments ?? 1),
        paidInstallments: parseInt(data.paidInstallments ?? 0),
        installmentAmount: data.installmentAmount ? parseFloat(data.installmentAmount) : null,
        dueDate: new Date(data.dueDate),
        status: data.status ?? "active",
        notes: data.notes ?? null,
      },
    });
    return NextResponse.json(debt, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
