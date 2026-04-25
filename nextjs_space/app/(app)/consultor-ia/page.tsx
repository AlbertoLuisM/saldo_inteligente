"use client";
import { useState, useEffect, useRef } from "react";
import { Bot, Send, TrendingUp, TrendingDown, Target, CreditCard, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "Como posso melhorar minha saúde financeira?",
  "Quais são minhas maiores despesas e como reduzir?",
  "Analise meu progresso nas metas financeiras",
  "O que devo fazer com minhas dívidas?",
  "Crie um plano mensal para economizar mais",
  "Quais gastos posso cortar este mês?",
];

export default function ConsultorIAPage() {
  const [data, setData] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setStreaming(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/consultor-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: err.error || "Desculpe, ocorreu um erro. Tente novamente.",
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });

        const lines = partialRead.split("\n");
        partialRead = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip
            }
          }
        }
      }

      // Handle any remaining data
      if (partialRead.trim()) {
        const remainingLines = partialRead.split("\n");
        for (const line of remainingLines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip
            }
          }
        }
      }

      // If no content was received
      if (!fullContent) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Desculpe, não consegui processar sua solicitação. Tente novamente.",
          };
          return updated;
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Erro de conexão. Verifique sua internet e tente novamente.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#10b981" }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Consultor IA</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
          Análise inteligente e personalizada das suas finanças
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar - hidden on small mobile, shown on tablet+ */}
        <div className="hidden sm:block lg:col-span-1 space-y-3">
          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Resumo Rápido</h3>
            <div className="space-y-2">
              {[
                { icon: TrendingUp, label: "Receitas", value: formatCurrency(data?.totalIncome ?? 0), color: "#10b981" },
                { icon: TrendingDown, label: "Despesas", value: formatCurrency(data?.totalExpenses ?? 0), color: "#ef4444" },
                { icon: Target, label: "Score", value: `${data?.healthScore ?? 0}/100`, color: "#6366f1" },
                { icon: CreditCard, label: "Dívidas", value: formatCurrency(data?.totalDebt ?? 0), color: "#f59e0b" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2 py-1">
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
              Perguntas Sugeridas
            </h3>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={streaming}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div
          className="lg:col-span-3 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex flex-col"
          style={{ height: "68vh", minHeight: 380 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "#10b981" }}
            >
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Consultor Financeiro IA</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Analisa seus dados reais para oferecer sugestões personalizadas
              </p>
            </div>
            {streaming && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analisando...
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Olá! Sou seu Consultor Financeiro 🤖
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 max-w-md mb-6">
                  Analiso seus dados financeiros reais — receitas, despesas, dívidas e metas — para fornecer sugestões personalizadas e ajudar você a tomar decisões melhores.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {QUICK_QUESTIONS.slice(0, 4).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1"
                    style={{ background: "#10b981" }}
                  >
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                {msg.role === "user" ? (
                  <div
                    className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed"
                    style={{
                      background: "#10b981",
                      color: "white",
                      borderRadius: "18px 18px 4px 18px",
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="max-w-full md:max-w-2xl lg:max-w-3xl px-5 py-4 text-sm leading-relaxed bg-[#f8fafc] text-gray-700 dark:bg-gray-700/80 dark:text-gray-100"
                    style={{
                      borderRadius: "18px 18px 18px 4px",
                    }}
                  >
                    {msg.content ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-headings:font-bold prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1 prose-p:my-2 prose-p:text-gray-700 dark:prose-p:text-gray-200 prose-strong:text-gray-700 dark:prose-strong:text-gray-100 prose-li:my-0.5 prose-li:text-gray-700 dark:prose-li:text-gray-200 prose-hr:my-3 prose-hr:border-gray-200 dark:prose-hr:border-gray-600">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2 text-gray-400 dark:text-gray-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Analisando seus dados...
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder="Pergunte sobre suas finanças..."
                disabled={streaming}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 disabled:opacity-50 disabled:bg-gray-50 dark:bg-gray-900/50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-opacity disabled:opacity-50"
                style={{ background: "#10b981" }}
              >
                {streaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2 text-center">
              As sugestões são baseadas nos seus dados registrados. Consulte um profissional para decisões financeiras importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
