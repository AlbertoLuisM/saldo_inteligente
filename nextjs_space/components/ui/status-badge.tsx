interface Props { status: string; }

const configs: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendente', bg: '#fef3c7', text: '#92400e' },
  paid: { label: 'Pago', bg: '#d1fae5', text: '#065f46' },
  received: { label: 'Recebido', bg: '#d1fae5', text: '#065f46' },
  overdue: { label: 'Vencido', bg: '#fee2e2', text: '#991b1b' },
  active: { label: 'Ativo', bg: '#dbeafe', text: '#1e40af' },
  paid_off: { label: 'Quitado', bg: '#d1fae5', text: '#065f46' },
  once: { label: 'Uma vez', bg: '#f3f4f6', text: '#374151' },
  monthly: { label: 'Mensal', bg: '#ede9fe', text: '#4c1d95' },
  weekly: { label: 'Semanal', bg: '#cffafe', text: '#164e63' },
};

export default function StatusBadge({ status }: Props) {
  const cfg = configs[status] ?? { label: status, bg: '#f3f4f6', text: '#374151' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}
