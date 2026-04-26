"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, Mail, Save } from "lucide-react";
import { inputClass } from "@/components/ui/form-field";
import toast from "react-hot-toast";

export default function ConfiguracoesPage() {
  const { data: session } = useSession() || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session?.user?.name ?? '');
      setEmail(session?.user?.email ?? '');
    }
  }, [session]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error();
      toast.success('Perfil atualizado!');
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Gerencie seu perfil e preferências</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Informações Pessoais</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                  <input className={`${inputClass} pl-10`} value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                  <input className={`${inputClass} pl-10 bg-gray-50 dark:bg-gray-900/50`} value={email} disabled />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">O email não pode ser alterado</p>
              </div>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#10b981' }}>
                <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Preferências</h2>
            <div className="space-y-4">
              {[
                { label: 'Moeda', value: 'Real Brasileiro (R$)' },
                { label: 'Idioma', value: 'Português (Brasil)' },
                { label: 'Formato de data', value: 'DD/MM/AAAA' },
              ].map(pref => (
                <div key={pref.label} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-b-0">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{pref.label}</span>
                  <span className="shrink-0 rounded-lg bg-gray-100 px-3 py-1 text-right text-sm font-medium text-gray-800 dark:bg-gray-900/70 dark:text-gray-100 dark:ring-1 dark:ring-gray-700/70">{pref.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Foto do Perfil</h2>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4" style={{ background: '#10b981' }}>
                {name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">{email}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">Notificações por Email</h2>
            <div className="space-y-3">
              {[
                'Contas vencendo',
                'Metas atingidas',
                'Resumo mensal',
                'Alertas de gastos',
              ].map(item => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{item}</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5 after:bg-white dark:bg-gray-800/60 after:rounded-full after:h-4 after:w-4 after:transition-all"
                      style={{ background: '#10b981' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
