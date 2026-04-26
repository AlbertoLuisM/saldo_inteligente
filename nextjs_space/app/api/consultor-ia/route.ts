import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import type {
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";

import { authOptions } from "@/lib/auth-options";
import {
  buildConsultorLlmInput,
  buildConsultorReply,
  CONSULTOR_IA_SYSTEM_PROMPT,
  createSsePayloadChunks,
} from "@/lib/consultor-ia";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function createSseDelta(content: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function createDoneEvent() {
  return "data: [DONE]\n\n";
}

function supportsGpt5Parameters(model: string) {
  return model.startsWith("gpt-5");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { messages: userMessages } = await request.json();
    const messages = Array.isArray(userMessages)
      ? userMessages
          .filter((message: { role?: string; content?: string }) =>
            (message.role === "user" || message.role === "assistant") && typeof message.content === "string"
          )
          .slice(-8)
      : [];
    const latestUserMessage =
      [...messages]
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

    const consultorContext = {
      now,
      question: latestUserMessage,
      messages,
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
    };

    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const encoder = new TextEncoder();
      const model = process.env.OPENAI_MODEL || "gpt-5.5";
      const requestOptions: ResponseCreateParamsStreaming = {
        model,
        instructions: CONSULTOR_IA_SYSTEM_PROMPT,
        input: buildConsultorLlmInput(consultorContext),
        stream: true,
        max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 1400),
      };

      if (supportsGpt5Parameters(model)) {
        requestOptions.reasoning = {
          effort: (process.env.OPENAI_REASONING_EFFORT || "low") as "none" | "minimal" | "low" | "medium" | "high" | "xhigh",
        };
        requestOptions.text = {
          verbosity: (process.env.OPENAI_TEXT_VERBOSITY || "medium") as "low" | "medium" | "high",
        };
      }

      const openaiStream = await client.responses.create(requestOptions);

      const stream = new ReadableStream({
        async start(controller) {
          let sentContent = false;

          try {
            for await (const event of openaiStream as AsyncIterable<ResponseStreamEvent>) {
              if (event.type === "response.output_text.delta" && event.delta) {
                sentContent = true;
                controller.enqueue(encoder.encode(createSseDelta(event.delta)));
              }

              if (event.type === "error") {
                throw new Error(event.message || "OpenAI stream error");
              }
            }

            controller.enqueue(encoder.encode(createDoneEvent()));
            controller.close();
          } catch (error) {
            console.error("Consultor IA OpenAI stream error:", error);

            if (!sentContent) {
              const fallbackText = buildConsultorReply(consultorContext);
              for (const chunk of createSsePayloadChunks(fallbackText)) {
                controller.enqueue(encoder.encode(createSseDelta(chunk)));
              }
            } else {
              controller.enqueue(encoder.encode(createSseDelta("\n\nTive uma instabilidade ao concluir a resposta. Se quiser, me envie a pergunta de novo que eu continuo daqui.")));
            }

            controller.enqueue(encoder.encode(createDoneEvent()));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const responseText = buildConsultorReply(consultorContext);

    const chunks = createSsePayloadChunks(responseText);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(createSseDelta(chunk)));
        }
        controller.enqueue(encoder.encode(createDoneEvent()));
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
