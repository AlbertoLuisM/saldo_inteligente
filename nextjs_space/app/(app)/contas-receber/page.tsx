"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, CheckCircle, Receipt } from "lucide-react";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import FormField, { inputClass, selectClass } from "@/components/ui/form-field";
import StatusBadge from "@/components/ui/status-badge";
import EmptyState from "@/components/ui/empty-state";
import toast from "react-hot-toast";

interface AccountReceivable {
  id: string; description: string; amount: number; expectedDate: string;
  payer: string | null; status: string; notes: string | null;
}

const emptyForm = { description:'', amount:'', expectedDate: formatDateInput(new Date()), payer:'', status:'pending', notes:'' };

export default function ContasReceberPage() {
  const [items, setItems] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AccountReceivable | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/accounts-receivable').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(item: AccountReceivable) {
    setEditing(item);
    setForm({ description: item.description, amount: String(item.amount), expectedDate: formatDateInput(item.expectedDate), payer: item.payer ?? '', status: item.status, notes: item.notes ?? '' });
    setShowModal(true);
  }

  async function handleMarkReceived(item: AccountReceivable) {
    await fetch(`/api/accounts-receivable/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, status: 'received' }) });
    toast.success('Conta marcada como recebida!'); load();
  }

  async function handleSave() {
    if (!form.description || !form.amount || !form.expectedDate) { toast.error('Preencha os campos obrigatórios'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/accounts-receivable/${editing.id}` : '/api/accounts-receivable';
      const method = editing ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      toast.success('Conta salva!'); setShowModal(false); load();
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este registro?')) return;
    await fetch(`/api/accounts-receivable/${id}`, { method: 'DELETE' });
    toast.success('Registro excluído'); load();
  }

  const pending = items.filter(i => i.status === 'pending');
  const totalPending = pending.reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">Contas a Receber</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Acompanhe valores a receber</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-white text-xs sm:text-sm font-semibold" style={{ background: '#10b981' }}>
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nova</span> Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Total a receber</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Pendentes</p>
          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-gray-100">{pending.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Recebidos</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#6b7280' }}>{items.filter(i => i.status === 'received').length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Carregando...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma conta a receber" description="Adicione valores que você tem a receber." action={<button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#10b981' }}>Adicionar</button>} />
        ) : (
          <>
            <table className="w-full hidden md:table">
              <thead className="border-b border-gray-100 dark:border-gray-700/50">
                <tr>{['Descrição','Pagador','Data Prevista','Status','Valor','Ações'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 dark:bg-gray-900/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.payer ?? '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(item.expectedDate)}</td>
                    <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
                    <td className="py-3 px-4 text-sm font-semibold" style={{ color: '#10b981' }}>{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {item.status === 'pending' && <button onClick={() => handleMarkReceived(item)} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-green-600" title="Marcar como recebido"><CheckCircle className="w-3.5 h-3.5" /></button>}
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden divide-y divide-gray-100">
              {items.map(item => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.payer ?? '-'}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(item.expectedDate)}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold ml-3 whitespace-nowrap" style={{ color: '#10b981' }}>{formatCurrency(item.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <StatusBadge status={item.status} />
                    <div className="flex items-center gap-1">
                      {item.status === 'pending' && <button onClick={() => handleMarkReceived(item)} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-green-600"><CheckCircle className="w-3.5 h-3.5" /></button>}
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Conta' : 'Nova Conta a Receber'}>
        <div className="space-y-4">
          <FormField label="Descrição *">
            <input className={inputClass} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Ex: Serviço prestado" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Valor (R$) *">
              <input type="number" step="0.01" className={inputClass} value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} placeholder="0,00" />
            </FormField>
            <FormField label="Data prevista *">
              <input type="date" className={inputClass} value={form.expectedDate} onChange={e => setForm(p => ({...p, expectedDate: e.target.value}))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pagador">
              <input className={inputClass} value={form.payer} onChange={e => setForm(p => ({...p, payer: e.target.value}))} placeholder="Ex: Cliente João" />
            </FormField>
            <FormField label="Status">
              <select className={selectClass} value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                <option value="pending">Pendente</option>
                <option value="received">Recebido</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Opcional" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#10b981' }}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
