"use client";
import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900/50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10b981' }}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="font-bold text-xl text-gray-800 dark:text-gray-100">Saldo Inteligente</p>
        </div>

        <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
          {!sent ? (
            <>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Recuperar senha</h2>
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-6 text-sm">Insira seu email para receber as instruções</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800/60" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 rounded-lg text-white font-semibold text-sm" style={{ background: '#10b981' }}>
                  Enviar instruções
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#10b981' }} />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Email enviado!</h2>
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Verifique sua caixa de entrada para redefinir sua senha.</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/50">
            <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
