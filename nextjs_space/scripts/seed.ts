import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---- Users ----
  const hashedDemo = await bcrypt.hash("Demo@123", 12);
  const hashedJohn = await bcrypt.hash("johndoe123", 12);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@saldointeligente.com.br" },
    update: {},
    create: { name: "Carlos Silva", email: "demo@saldointeligente.com.br", password: hashedDemo },
  });

  await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: { name: "John Doe", email: "john@doe.com", password: hashedJohn },
  });

  const uid = demoUser.id;
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();

  function d(year: number, month: number, day: number) {
    return new Date(year, month, day);
  }

  // ---- Incomes ----
  const incomesData = [
    // Current month
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo, 5), recurrence: "monthly" },
    { description: "Freelance Design", amount: 2500, category: "Freelance", date: d(yr, mo, 10), recurrence: "once" },
    { description: "Renda de aluguel", amount: 1600, category: "Renda Passiva", date: d(yr, mo, 1), recurrence: "monthly" },
    // Previous months
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 1, 5), recurrence: "monthly" },
    { description: "Consultoria TI", amount: 1800, category: "Freelance", date: d(yr, mo - 1, 15), recurrence: "once" },
    { description: "Renda de aluguel", amount: 1600, category: "Renda Passiva", date: d(yr, mo - 1, 1), recurrence: "monthly" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 2, 5), recurrence: "monthly" },
    { description: "Projeto web", amount: 3200, category: "Freelance", date: d(yr, mo - 2, 20), recurrence: "once" },
    { description: "Renda de aluguel", amount: 1600, category: "Renda Passiva", date: d(yr, mo - 2, 1), recurrence: "monthly" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 3, 5), recurrence: "monthly" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 4, 5), recurrence: "monthly" },
    { description: "Consultoria", amount: 2100, category: "Freelance", date: d(yr, mo - 4, 12), recurrence: "once" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 5, 5), recurrence: "monthly" },
    { description: "Venda de equip.", amount: 1200, category: "Renda Extra", date: d(yr, mo - 5, 8), recurrence: "once" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 6, 5), recurrence: "monthly" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 7, 5), recurrence: "monthly" },
    { description: "Freelance design", amount: 1800, category: "Freelance", date: d(yr, mo - 7, 18), recurrence: "once" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 8, 5), recurrence: "monthly" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 9, 5), recurrence: "monthly" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 10, 5), recurrence: "monthly" },
    { description: "Bônus anual", amount: 5000, category: "Renda Extra", date: d(yr, mo - 10, 20), recurrence: "once" },
    { description: "Salário", amount: 8500, category: "Salário", date: d(yr, mo - 11, 5), recurrence: "monthly" },
  ];

  for (const inc of incomesData) {
    await prisma.income.upsert({
      where: { id: `seed-inc-${uid}-${inc.description}-${inc.date.getTime()}` },
      update: {},
      create: { id: `seed-inc-${uid}-${inc.description}-${inc.date.getTime()}`, userId: uid, ...inc, notes: null },
    });
  }

  // ---- Expenses ----
  const expensesData = [
    // Current month
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 950, category: "Alimentação", date: d(yr, mo, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Combústivel", amount: 480, category: "Transporte", date: d(yr, mo, 8), recurrence: "monthly", paymentMethod: "Cartão de Crédito" },
    { description: "Plano de saúde", amount: 680, category: "Saúde", date: d(yr, mo, 10), recurrence: "monthly", paymentMethod: "Boleto" },
    { description: "Streaming (Netflix/Spotify)", amount: 120, category: "Lazer", date: d(yr, mo, 12), recurrence: "monthly", paymentMethod: "Cartão de Crédito" },
    { description: "Restaurante", amount: 380, category: "Alimentação", date: d(yr, mo, 15), recurrence: "once", paymentMethod: "Cartão de Crédito" },
    { description: "Uber / transporte", amount: 180, category: "Transporte", date: d(yr, mo, 18), recurrence: "once", paymentMethod: "Pix" },
    { description: "Academia", amount: 150, category: "Saúde", date: d(yr, mo, 3), recurrence: "monthly", paymentMethod: "Boleto" },
    // Previous months similar
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 1, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 870, category: "Alimentação", date: d(yr, mo - 1, 6), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Combústivel", amount: 510, category: "Transporte", date: d(yr, mo - 1, 9), recurrence: "monthly", paymentMethod: "Cartão de Crédito" },
    { description: "Plano de saúde", amount: 680, category: "Saúde", date: d(yr, mo - 1, 10), recurrence: "monthly", paymentMethod: "Boleto" },
    { description: "Jantar especial", amount: 320, category: "Alimentação", date: d(yr, mo - 1, 20), recurrence: "once", paymentMethod: "Cartão de Crédito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 2, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 920, category: "Alimentação", date: d(yr, mo - 2, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Curso online", amount: 350, category: "Educação", date: d(yr, mo - 2, 12), recurrence: "once", paymentMethod: "Cartão de Crédito" },
    { description: "Combústivel", amount: 450, category: "Transporte", date: d(yr, mo - 2, 8), recurrence: "monthly", paymentMethod: "Cartão de Crédito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 3, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 890, category: "Alimentação", date: d(yr, mo - 3, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Combústivel", amount: 500, category: "Transporte", date: d(yr, mo - 3, 8), recurrence: "monthly", paymentMethod: "Cartão de Crédito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 4, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 840, category: "Alimentação", date: d(yr, mo - 4, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 5, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 980, category: "Alimentação", date: d(yr, mo - 5, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Passagem aérea", amount: 1200, category: "Lazer", date: d(yr, mo - 5, 15), recurrence: "once", paymentMethod: "Cartão de Crédito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 6, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 900, category: "Alimentação", date: d(yr, mo - 6, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 7, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 860, category: "Alimentação", date: d(yr, mo - 7, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 8, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 930, category: "Alimentação", date: d(yr, mo - 8, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 9, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 870, category: "Alimentação", date: d(yr, mo - 9, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 10, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 910, category: "Alimentação", date: d(yr, mo - 10, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
    { description: "Aluguel", amount: 2200, category: "Moradia", date: d(yr, mo - 11, 1), recurrence: "monthly", paymentMethod: "Transferência" },
    { description: "Supermercado", amount: 850, category: "Alimentação", date: d(yr, mo - 11, 5), recurrence: "monthly", paymentMethod: "Cartão de Débito" },
  ];

  for (const exp of expensesData) {
    await prisma.expense.upsert({
      where: { id: `seed-exp-${uid}-${exp.description}-${exp.date.getTime()}` },
      update: {},
      create: { id: `seed-exp-${uid}-${exp.description}-${exp.date.getTime()}`, userId: uid, ...exp, notes: null },
    });
  }

  // ---- Debts ----
  await prisma.debt.upsert({
    where: { id: `seed-debt-1-${uid}` },
    update: {},
    create: { id: `seed-debt-1-${uid}`, userId: uid, description: "Financiamento automóvel", creditor: "Banco Itaú", originalAmount: 35000, remainingBalance: 22500, interestRate: 1.49, installments: 48, paidInstallments: 16, installmentAmount: 1025.93, dueDate: d(yr + 2, 6, 15), status: "active", notes: null },
  });
  await prisma.debt.upsert({
    where: { id: `seed-debt-2-${uid}` },
    update: {},
    create: { id: `seed-debt-2-${uid}`, userId: uid, description: "Cartão de crédito", creditor: "Bradesco", originalAmount: 8500, remainingBalance: 3200, interestRate: 3.2, installments: 12, paidInstallments: 7, installmentAmount: 864.15, dueDate: d(yr, mo + 2, 10), status: "active", notes: null },
  });
  await prisma.debt.upsert({
    where: { id: `seed-debt-3-${uid}` },
    update: {},
    create: { id: `seed-debt-3-${uid}`, userId: uid, description: "Empréstimo pessoal", creditor: "Nubank", originalAmount: 15000, remainingBalance: 9800, interestRate: 2.1, installments: 24, paidInstallments: 10, installmentAmount: 802.08, dueDate: d(yr + 1, 3, 20), status: "active", notes: null },
  });

  // ---- Accounts Payable ----
  const apData = [
    { id: `seed-ap-1-${uid}`, description: "Conta de luz", amount: 280, dueDate: d(yr, mo, 15), category: "Utilidades", status: "pending" },
    { id: `seed-ap-2-${uid}`, description: "Conta de água", amount: 95, dueDate: d(yr, mo, 18), category: "Utilidades", status: "pending" },
    { id: `seed-ap-3-${uid}`, description: "Internet fibra", amount: 120, dueDate: d(yr, mo, 20), category: "Assinaturas", status: "pending" },
    { id: `seed-ap-4-${uid}`, description: "IPTU parcela", amount: 340, dueDate: d(yr, mo + 1, 5), category: "Moradia", status: "pending" },
    { id: `seed-ap-5-${uid}`, description: "Seguro do carro", amount: 180, dueDate: d(yr, mo - 1, 8), category: "Transporte", status: "paid" },
    { id: `seed-ap-6-${uid}`, description: "Mensalidade escolar", amount: 750, dueDate: d(yr, mo, 5), category: "Educação", status: "paid" },
  ];
  for (const ap of apData) {
    await prisma.accountPayable.upsert({ where: { id: ap.id }, update: {}, create: { ...ap, userId: uid, notes: null } });
  }

  // ---- Accounts Receivable ----
  const arData = [
    { id: `seed-ar-1-${uid}`, description: "Serviço de design", amount: 3500, expectedDate: d(yr, mo, 20), payer: "Empresa ABC", status: "pending" },
    { id: `seed-ar-2-${uid}`, description: "Consultoria técnica", amount: 1800, expectedDate: d(yr, mo + 1, 10), payer: "Startup XYZ", status: "pending" },
    { id: `seed-ar-3-${uid}`, description: "Projeto concluído", amount: 2200, expectedDate: d(yr, mo - 1, 15), payer: "Cliente João", status: "received" },
  ];
  for (const ar of arData) {
    await prisma.accountReceivable.upsert({ where: { id: ar.id }, update: {}, create: { ...ar, userId: uid, notes: null } });
  }

  // ---- Goals ----
  await prisma.goal.upsert({
    where: { id: `seed-goal-1-${uid}` },
    update: {},
    create: { id: `seed-goal-1-${uid}`, userId: uid, title: "Reserva de emergência", targetAmount: 30000, currentAmount: 9750, deadline: d(yr + 1, 11, 31), category: "Reserva de Emergência", description: "6x o salário mensal" },
  });
  await prisma.goal.upsert({
    where: { id: `seed-goal-2-${uid}` },
    update: {},
    create: { id: `seed-goal-2-${uid}`, userId: uid, title: "Viagem de férias", targetAmount: 8000, currentAmount: 5200, deadline: d(yr + 1, 6, 30), category: "Viagem", description: "Férias em Florianópolis" },
  });
  await prisma.goal.upsert({
    where: { id: `seed-goal-3-${uid}` },
    update: {},
    create: { id: `seed-goal-3-${uid}`, userId: uid, title: "Quitar cartão", targetAmount: 3500, currentAmount: 2800, deadline: d(yr, mo + 3, 10), category: "Quitar Dívida", description: "Quitar dívida do Bradesco" },
  });
  await prisma.goal.upsert({
    where: { id: `seed-goal-4-${uid}` },
    update: {},
    create: { id: `seed-goal-4-${uid}`, userId: uid, title: "Investimento mensal", targetAmount: 2000, currentAmount: 1400, deadline: d(yr, mo + 2, 28), category: "Investimento", description: "Fundo de renda variável" },
  });

  // ---- Notifications ----
  const notifData = [
    { id: `seed-notif-1-${uid}`, title: "Conta vencendo em breve", message: "A conta 'Conta de luz' vence em 3 dias. Não esqueça de pagar!", type: "warning", read: false },
    { id: `seed-notif-2-${uid}`, title: "Meta quase atingida!", message: "Você está a 80% de atingir sua meta 'Quitar cartão'. Continue assim!", type: "success", read: false },
    { id: `seed-notif-3-${uid}`, title: "Dívida com juros altos", message: "O cartão de crédito Bradesco tem taxa de 3.2% a.m. Priorize quitar esta dívida.", type: "danger", read: false },
    { id: `seed-notif-4-${uid}`, title: "Resumo do mês", message: "Você poupou R$ 3.750,00 este mês. Sua saúde financeira melhorou 5 pontos!", type: "success", read: true },
    { id: `seed-notif-5-${uid}`, title: "Meta de viagem atualizada", message: "Progresso na meta 'Viagem de férias': 65% concluído.", type: "info", read: true },
  ];
  for (const notif of notifData) {
    await prisma.notification.upsert({ where: { id: notif.id }, update: {}, create: { ...notif, userId: uid } });
  }

  console.log('Seed completed successfully!');
  console.log(`Demo user: demo@saldointeligente.com.br / Demo@123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
