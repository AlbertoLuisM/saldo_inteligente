"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import FormField, { inputClass, selectClass } from "@/components/ui/form-field";
import EmptyState from "@/components/ui/empty-state";
import toast from "react-hot-toast";

const CATEGORIES = ['Reserva de Emergência','Viagem','Quitar Dívida','Investimento','Imovél','Veículo','Outros'];
const CATEGORY_COLORS: Record<string, string> = {
  'Reserva de Emergência': '#f59e0b',
  'Viagem': '#3b82f6',
  'Quitar Dívida': '#ef4444',
  'Investimento': '#10b981',
  'Imovél': '#8b5cf6',
  'Veículo': '#ec4899',
  'Outros': '#6b7280',
};

interface Goal {
  id: string; title: string; targetAmount: number; currentAmount: number;
  deadline: string; category: string; description: string | null;
}

const emptyForm = { title:'', targetAmount:'', currentAmount:'0', deadline: formatDateInput(new Date(new Date().getFullYear() + 1, 0, 1)), category:'Reserva de Emergência', description:'' };

export default function MetasPage() {
  const [items, setItems] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/goals').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(item: Goal) {
    setEditing(item);
    setForm({ title: item.title, targetAmount: String(item.targetAmount), currentAmount: String(item.currentAmount), deadline: formatDateInput(item.deadline), category: item.category, description: item.description ?? '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title || !form.targetAmount || !form.deadline) { toast.error('Preencha os campos obrigatórios'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/goals/${editing.id}` : '/api/goals';
      const method = editing ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      toast.success(editing ? 'Meta atualizada!' : 'Meta criada!'); setShowModal(false); load();
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta meta?')) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    toast.success('Meta excluída'); load();
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Metas Financeiras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Defina e acompanhe suas metas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#6366f1' }}>
          <Plus className="w-4 h-4" /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Total de metas</p>
          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-gray-100">{items.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Metas ativas</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#6366f1' }}>{items.filter(i => i.currentAmount < i.targetAmount).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Metas concluídas</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>{items.filter(i => i.currentAmount >= i.targetAmount).length}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Carregando...</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Target} title="Nenhuma meta" description="Crie metas financeiras para planejar seu futuro." action={<button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#6366f1' }}>Criar Meta</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => {
            const progress = item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0;
            const color = CATEGORY_COLORS[item.category] ?? '#6b7280';
            const completed = item.currentAmount >= item.targetAmount;
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800/60 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.category}</span>
                      {completed && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">✓ Concluída</span>}
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mt-1">{item.title}</h3>
                    {item.description && <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">{item.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatCurrency(item.currentAmount)}</span>
                    <span className="text-sm font-semibold" style={{ color }}>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2.5 progress-track">
                    <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%`, background: color }} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Meta: {formatCurrency(item.targetAmount)}</p>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Prazo: {formatDate(item.deadline)}</p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Meta' : 'Nova Meta'} size="lg">
        <div className="space-y-4">
          <FormField label="Título da meta *">
            <input className={inputClass} value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="Ex: Reserva de emergência" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Valor alvo (R$) *">
              <input type="number" step="0.01" className={inputClass} value={form.targetAmount} onChange={e => setForm(p => ({...p, targetAmount: e.target.value}))} placeholder="0,00" />
            </FormField>
            <FormField label="Valor atual (R$)">
              <input type="number" step="0.01" className={inputClass} value={form.currentAmount} onChange={e => setForm(p => ({...p, currentAmount: e.target.value}))} placeholder="0,00" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prazo *">
              <input type="date" className={inputClass} value={form.deadline} onChange={e => setForm(p => ({...p, deadline: e.target.value}))} />
            </FormField>
            <FormField label="Categoria">
              <select className={selectClass} value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            </FormField>
          </div>
          <FormField label="Descrição">
            <textarea className={inputClass} rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Opcional" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#6366f1' }}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
