"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, TrendingUp, User, Mail, Lock } from "lucide-react";

export default function SignupClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("As senhas não coincidem"); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Erro ao criar conta"); return; }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) { router.replace("/login"); } else { router.replace("/dashboard"); }
    } catch {
      setError("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: '#0f172a' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10b981' }}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Saldo Inteligente</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Finanças Pessoais Inteligentes</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Comece sua jornada<br />
            <span style={{ color: '#10b981' }}>financeira hoje.</span>
          </h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Cadastre-se gratuitamente e tome o controle das suas finanças.
          </p>
        </div>
        <div className="space-y-3">
          {['Controle receitas e despesas', 'Gerencie dívidas e metas', 'Relatórios inteligentes'].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-[#0c1222]">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Criar conta</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Preencha os dados para se cadastrar</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required
                  className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm mt-2"
              style={{ background: loading ? '#6ee7b7' : '#10b981' }}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: '#10b981' }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
