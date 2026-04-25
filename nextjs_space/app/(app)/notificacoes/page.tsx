"use client";
import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Notification {
  id: string; title: string; message: string; type: string; read: boolean; createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: any; bg: string; text: string; iconColor: string }> = {
  info: { icon: Info, bg: '#eff6ff', text: '#1e40af', iconColor: '#3b82f6' },
  warning: { icon: AlertTriangle, bg: '#fefce8', text: '#92400e', iconColor: '#f59e0b' },
  danger: { icon: AlertCircle, bg: '#fff1f2', text: '#991b1b', iconColor: '#ef4444' },
  success: { icon: CheckCircle, bg: '#f0fdf4', text: '#065f46', iconColor: '#10b981' },
};

export default function NotificacoesPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) });
    load();
  }

  async function markAllRead() {
    await fetch('/api/notifications/all', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) });
    toast.success('Todas as notificações marcadas como lidas'); load();
  }

  const unread = items.filter(i => !i.read).length;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Notificações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">{unread > 0 ? `${unread} não lida(s)` : 'Tudo em dia!'}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50">
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#f0fdf4' }}>
            <Bell className="w-8 h-8" style={{ color: '#10b981' }} />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Sem notificações</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Você será notificado sobre contas a vencer e metas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className={`bg-white dark:bg-gray-800/60 rounded-xl p-4 border shadow-sm flex items-start gap-4 transition-all ${
                item.read ? 'border-gray-100 dark:border-gray-700/50 opacity-70' : 'border-gray-200 dark:border-gray-700'
              }`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                  <Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{item.title}</p>
                    {!item.read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10b981' }} />}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">{item.message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{formatDate(item.createdAt)}</p>
                </div>
                {!item.read && (
                  <button onClick={() => markRead(item.id)} className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 flex-shrink-0">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
