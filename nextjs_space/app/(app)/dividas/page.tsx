"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, CreditCard, Calculator } from "lucide-react";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import FormField, { inputClass, selectClass } from "@/components/ui/form-field";
import StatusBadge from "@/components/ui/status-badge";
import EmptyState from "@/components/ui/empty-state";
import toast from "react-hot-toast";

interface Debt {
  id: string; description: string; creditor: string; originalAmount: number;
  remainingBalance: number; interestRate: number; installments: number;
  paidInstallments: number; installmentAmount: number | null; dueDate: string; status: string; notes: string | null;
}

const emptyForm = { description:'', creditor:'', originalAmount:'', remainingBalance:'', interestRate:'0', installments:'1', paidInstallments:'0', installmentAmount:'', dueDate: formatDateInput(new Date()), status:'active', notes:'' };

/** Calcula parcela (Tabela Price / PMT) e valor final com juros compostos */
function calcDebt(principal: number, ratePercent: number, n: number) {
  if (principal <= 0 || n <= 0) return { installment: 0, total: 0, totalInterest: 0 };
  if (ratePercent <= 0) return { installment: principal / n, total: principal, totalInterest: 0 };
  const r = ratePercent / 100;
  const installment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = installment * n;
  return { installment, total, totalInterest: total - principal };
}

export default function DividasPage() {
  const [items, setItems] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/debts').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(item: Debt) {
    setEditing(item);
    setForm({ description: item.description, creditor: item.creditor, originalAmount: String(item.originalAmount), remainingBalance: String(item.remainingBalance), interestRate: String(item.interestRate), installments: String(item.installments), paidInstallments: String(item.paidInstallments), installmentAmount: item.installmentAmount != null ? String(item.installmentAmount) : '', dueDate: formatDateInput(item.dueDate), status: item.status, notes: item.notes ?? '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.description || !form.originalAmount) { toast.error('Preencha os campos obrigatórios'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/debts/${editing.id}` : '/api/debts';
      const method = editing ? 'PUT' : 'POST';
      // Se o campo de parcela está vazio, preenche automaticamente com o cálculo PMT
      const formToSend = { ...form };
      if (!formToSend.installmentAmount && formCalc.installment > 0) {
        formToSend.installmentAmount = formCalc.installment.toFixed(2);
      }
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formToSend) });
      toast.success(editing ? 'Dívida atualizada!' : 'Dívida adicionada!');
      setShowModal(false); load();
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta dívida?')) return;
    await fetch(`/api/debts/${id}`, { method: 'DELETE' });
    toast.success('Dívida excluída'); load();
  }

  // Cálculo automático no formulário
  const formCalc = useMemo(() => {
    const p = parseFloat(form.originalAmount) || 0;
    const r = parseFloat(form.interestRate) || 0;
    const n = parseInt(form.installments) || 1;
    return calcDebt(p, r, n);
  }, [form.originalAmount, form.interestRate, form.installments]);

  const totalDebt = items.filter(i => i.status === 'active').reduce((s, i) => s + i.remainingBalance, 0);
  const now = new Date();

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Dívidas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Acompanhe e gerencie suas dívidas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#f59e0b' }}>
          <Plus className="w-4 h-4" /> Nova Dívida
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Dívida total ativa</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>{formatCurrency(totalDebt)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Total de dívidas</p>
          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-gray-100">{items.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Dívidas vencidas</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>{items.filter(i => i.status === 'active' && new Date(i.dueDate) < now).length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Carregando...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhuma dívida" description="Registre suas dívidas para acompanhar o progresso de pagamento." action={<button onClick={openNew} className="px-4 py-2 rounded-lg text-white text-sm" style={{ background: '#f59e0b' }}>Adicionar Dívida</button>} />
        ) : items.map(item => {
          const progress = item.originalAmount > 0 ? ((item.originalAmount - item.remainingBalance) / item.originalAmount) * 100 : 0;
          const overdue = item.status === 'active' && new Date(item.dueDate) < now;
          return (
            <div key={item.id} className={`bg-white dark:bg-gray-800/60 rounded-xl p-5 border shadow-sm ${overdue ? 'border-red-200' : 'border-gray-100 dark:border-gray-700/50'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{item.description}</h3>
                    {overdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">Vencida</span>}
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">Credor: {item.creditor} • Vencimento: {formatDate(item.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(item.remainingBalance)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">de {formatCurrency(item.originalAmount)}</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">
                  <span>{item.paidInstallments}/{item.installments} parcelas pagas • Parcela: {formatCurrency(item.installmentAmount != null ? item.installmentAmount : calcDebt(item.originalAmount, item.interestRate, item.installments).installment)}</span>
                  <span>{progress.toFixed(0)}% pago</span>
                </div>
                <div className="w-full h-2 progress-track">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(100, progress)}%`, background: progress > 60 ? '#10b981' : '#f59e0b' }} />
                </div>
              </div>
              {item.interestRate > 0 && (() => {
                const c = calcDebt(item.originalAmount, item.interestRate, item.installments);
                return (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-3">
                    <span>Juros: {item.interestRate}% a.m.</span>
                    <span>Valor final: <strong className="text-gray-600 dark:text-gray-300">{formatCurrency(c.total)}</strong></span>
                    <span>Total juros: <strong style={{ color: '#ef4444' }}>{formatCurrency(c.totalInterest)}</strong></span>
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <button onClick={() => openEdit(item)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900/50">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => handleDelete(item.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Dívida' : 'Nova Dívida'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Descrição *">
              <input className={inputClass} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Ex: Empréstimo banco" />
            </FormField>
            <FormField label="Credor *">
              <input className={inputClass} value={form.creditor} onChange={e => setForm(p => ({...p, creditor: e.target.value}))} placeholder="Ex: Banco Itaú" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Valor original (R$) *">
              <input type="number" step="0.01" className={inputClass} value={form.originalAmount} onChange={e => setForm(p => ({...p, originalAmount: e.target.value}))} placeholder="0,00" />
            </FormField>
            <FormField label="Saldo restante (R$) *">
              <input type="number" step="0.01" className={inputClass} value={form.remainingBalance} onChange={e => setForm(p => ({...p, remainingBalance: e.target.value}))} placeholder="0,00" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormField label="Juros (% a.m.)">
              <input type="number" step="0.01" className={inputClass} value={form.interestRate} onChange={e => setForm(p => ({...p, interestRate: e.target.value}))} />
            </FormField>
            <FormField label="Total parcelas">
              <input type="number" className={inputClass} value={form.installments} onChange={e => setForm(p => ({...p, installments: e.target.value}))} />
            </FormField>
            <FormField label="Parcelas pagas">
              <input type="number" className={inputClass} value={form.paidInstallments} onChange={e => setForm(p => ({...p, paidInstallments: e.target.value}))} />
            </FormField>
          </div>
          {/* Cálculo automático */}
          {parseFloat(form.originalAmount) > 0 && parseInt(form.installments) > 0 && (
            <div className="rounded-xl p-4 border border-amber-200" style={{ background: '#fffbeb' }}>
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4" style={{ color: '#f59e0b' }} />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cálculo automático (Tabela Price)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Valor da parcela</p>
                  <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>{formatCurrency(formCalc.installment)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Valor final total</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrency(formCalc.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Total de juros</p>
                  <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{formatCurrency(formCalc.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">% juros sobre valor</p>
                  <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
                    {parseFloat(form.originalAmount) > 0 ? ((formCalc.totalInterest / parseFloat(form.originalAmount)) * 100).toFixed(1) : '0.0'}%
                  </p>
                </div>
              </div>
              {!form.installmentAmount && formCalc.installment > 0 && (
                <button
                  type="button"
                  onClick={() => setForm(p => ({...p, installmentAmount: formCalc.installment.toFixed(2)}))}
                  className="mt-3 text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-amber-100 transition-colors"
                  style={{ borderColor: '#f59e0b', color: '#b45309' }}
                >
                  Usar valor calculado como parcela
                </button>
              )}
            </div>
          )}
          <FormField label="Valor da parcela (R$)">
            <input type="number" step="0.01" className={inputClass} value={form.installmentAmount} onChange={e => setForm(p => ({...p, installmentAmount: e.target.value}))} placeholder={formCalc.installment > 0 ? `Calculado: ${formCalc.installment.toFixed(2)}` : '0,00'} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Data de vencimento">
              <input type="date" className={inputClass} value={form.dueDate} onChange={e => setForm(p => ({...p, dueDate: e.target.value}))} />
            </FormField>
            <FormField label="Status">
              <select className={selectClass} value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                <option value="active">Ativo</option>
                <option value="paid_off">Quitado</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea className={inputClass} rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Opcional" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#f59e0b' }}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
