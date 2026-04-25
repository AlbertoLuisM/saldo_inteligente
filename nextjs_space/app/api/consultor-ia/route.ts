import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { buildConsultorReply, createSsePayloadChunks } from "@/lib/consultor-ia";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { messages: userMessages } = await request.json();
    const latestUserMessage =
      [...(userMessages ?? [])]
        .reverse()
        .find((message: { role?: string; content?: string }) => message.role === "user")
        ?.content ?? "";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const start3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const [
      incomes,
      expenses,
      lastMonthIncomes,
      lastMonthExpenses,
      debts,
      goals,
      accountsPayable,
      accountsReceivable,
      recentIncomes,
      recentExpenses,
    ] = await Promise.all([
      prisma.income.findMany({ where: { userId, date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.income.findMany({ where: { userId, date: { gte: startLastMonth, lte: endLastMonth } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: startLastMonth, lte: endLastMonth } } }),
      prisma.debt.findMany({ where: { userId } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.accountPayable.findMany({ where: { userId, status: { not: "paid" } } }),
      prisma.accountReceivable.findMany({ where: { userId, status: { not: "received" } } }),
      prisma.income.findMany({
        where: { userId, date: { gte: start3MonthsAgo } },
        orderBy: { date: "desc" },
        take: 20,
      }),
      prisma.expense.findMany({
        where: { userId, date: { gte: start3MonthsAgo } },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

    const responseText = buildConsultorReply({
      now,
      question: latestUserMessage,
      incomes,
      expenses,
      lastMonthIncomes,
      lastMonthExpenses,
      debts,
      goals,
      accountsPayable,
      accountsReceivable,
      recentIncomes,
      recentExpenses,
    });

    const chunks = createSsePayloadChunks(responseText);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          const payload = JSON.stringify({
            choices: [{ delta: { content: chunk } }],
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Consultor IA error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
    });
  }
}
