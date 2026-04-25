"use client";
import { useState } from "react";
import { Shield, Lock, Eye, EyeOff, Monitor, LogOut } from "lucide-react";
import { inputClass } from "@/components/ui/form-field";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";

export default function SegurancaPage() {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChangePassword() {
    if (!current || !newPwd || !confirm) { toast.error('Preencha todos os campos'); return; }
    if (newPwd !== confirm) { toast.error('As novas senhas não coincidem'); return; }
    if (newPwd.length < 6) { toast.error('A nova senha deve ter pelo menos 6 caracteres'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/user/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: current, newPassword: newPwd }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao alterar senha'); return; }
      toast.success('Senha alterada com sucesso!');
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch { toast.error('Erro ao alterar senha'); } finally { setSaving(false); }
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Segurança</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Gerencie a segurança da sua conta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5" style={{ color: '#10b981' }} />
            <h2 className="font-semibold text-gray-700 dark:text-gray-200">Alterar Senha</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Senha atual</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} className={`${inputClass} pr-10`} value={current} onChange={e => setCurrent(e.target.value)} placeholder="Sua senha atual" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Nova senha</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} className={`${inputClass} pr-10`} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Confirmar nova senha</label>
              <input type="password" className={inputClass} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a nova senha" />
            </div>
            <button onClick={handleChangePassword} disabled={saving} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#10b981' }}>
              {saving ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-5 h-5" style={{ color: '#6366f1' }} />
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">Sessão Ativa</h2>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#f0fdf4' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sessão atual</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Navegador • Agora</p>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 dark:hover:bg-red-900/30">
              <LogOut className="w-4 h-4" /> Encerrar sessão
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" style={{ color: '#f59e0b' }} />
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">Dicas de Segurança</h2>
            </div>
            <div className="space-y-2">
              {[
                'Use uma senha forte com letras, números e símbolos',
                'Não compartilhe sua senha com ninguém',
                'Faça logout em dispositivos compartilhados',
                'Atualize sua senha regularmente',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#10b981' }} />
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
