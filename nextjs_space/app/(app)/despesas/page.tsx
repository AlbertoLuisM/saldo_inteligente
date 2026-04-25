"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, TrendingDown, Filter } from "lucide-react";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import FormField, { inputClass, selectClass } from "@/components/ui/form-field";
import StatusBadge from "@/components/ui/status-badge";
import EmptyState from "@/components/ui/empty-state";
import toast from "react-hot-toast";

const CATEGORIES = ['Moradia','Alimentação','Transporte','Saúde','Lazer','Educação','Assinaturas','Utilidades','Outros'];
const PAYMENTS = ['Dinheiro','Cartão de Débito','Cartão de Crédito','Pix','Boleto','Transferência'];
const RECURRENCES = [{v:'once',l:'Uma vez'},{v:'monthly',l:'Mensal'},{v:'weekly',l:'Semanal'}];

interface Expense {
  id: string; description: string; amount: number; category: string;
  date: string; recurrence: string; paymentMethod: string | null; notes: string | null;
}

const emptyForm = { description:'', amount:'', category:'Alimentação', date: formatDateInput(new Date()), recurrence:'once', paymentMethod:'Pix', notes:'' };

export default function DespesasPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const q = filterCat ? `?category=${filterCat}` : '';
    fetch(`/api/expenses${q}`).then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, [filterCat]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(item: Expense) {
    setEditing(item);
    setForm({ description: item.description, amount: String(item.amount), category: item.category, date: formatDateInput(item.date), recurrence: item.recurrence, paymentMethod: item.paymentMethod ?? 'Pix', notes: item.notes ?? '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.description || !form.amount || !form.date) { toast.error('Preencha os campos obrigatórios'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/expenses/${editing.id}` : '/api/expenses';
      const method = editing ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      toast.success(editing ? 'Despesa atualizada!' : 'Despesa adicionada!');
      setShowModal(false); load();
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta despesa?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    toast.success('Despesa excluída'); load();
  }

  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">Despesas</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Controle seus gastos e despesas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-white text-xs sm:text-sm font-semibold" style={{ background: '#ef4444' }}>
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nova</span> Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Total de despesas</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>{formatCurrency(total)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Quantidade</p>
          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-gray-100">{items.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Média por despesa</p>
          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-gray-100">{formatCurrency(items.length > 0 ? total / items.length : 0)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Carregando...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={TrendingDown} title="Nenhuma despesa" description="Registre suas despesas para manter o controle financeiro." action={<button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#ef4444' }}>Adicionar Despesa</button>} />
        ) : (
          <>
            <table className="w-full hidden md:table">
              <thead className="border-b border-gray-100 dark:border-gray-700/50">
                <tr>{['Descrição','Categoria','Data','Pagamento','Valor','Ações'].map(h => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 dark:bg-gray-900/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200">{item.description}</td>
                    <td className="py-3 px-4"><span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">{item.category}</span></td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(item.date)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.paymentMethod ?? '-'}</td>
                    <td className="py-3 px-4 text-sm font-semibold" style={{ color: '#ef4444' }}>-{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
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
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">{item.category}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{formatDate(item.date)}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold ml-3 whitespace-nowrap" style={{ color: '#ef4444' }}>-{formatCurrency(item.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.paymentMethod ?? '-'}</span>
                    <div className="flex items-center gap-2">
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Despesa' : 'Nova Despesa'}>
        <div className="space-y-4">
          <FormField label="Descrição *">
            <input className={inputClass} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Ex: Supermercado" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Valor (R$) *">
              <input type="number" step="0.01" className={inputClass} value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} placeholder="0,00" />
            </FormField>
            <FormField label="Data *">
              <input type="date" className={inputClass} value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Categoria">
              <select className={selectClass} value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            </FormField>
            <FormField label="Pagamento">
              <select className={selectClass} value={form.paymentMethod} onChange={e => setForm(p => ({...p, paymentMethod: e.target.value}))}>{PAYMENTS.map(p => <option key={p}>{p}</option>)}</select>
            </FormField>
          </div>
          <FormField label="Recorrência">
            <select className={selectClass} value={form.recurrence} onChange={e => setForm(p => ({...p, recurrence: e.target.value}))}>
              {RECURRENCES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </FormField>
          <FormField label="Observações">
            <textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Opcional" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#ef4444' }}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
