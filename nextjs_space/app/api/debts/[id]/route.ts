import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const userId = (session.user as any).id as string;
    const data = await req.json();
    await prisma.debt.updateMany({
      where: { id: params.id, userId },
      data: {
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
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const userId = (session.user as any).id as string;
    await prisma.debt.deleteMany({ where: { id: params.id, userId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
