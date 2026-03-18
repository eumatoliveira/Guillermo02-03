export function getSandboxKPIs(userId: number) {
  const seed = userId % 10;
  return {
    period: "last_30d",
    occupancyRate: 72 + seed,
    noShowRate: 8 - seed * 0.3,
    confirmationRate: 84 + seed * 0.5,
    leadTimeDays: 2.1 + seed * 0.1,
    grossRevenue: 48000 + seed * 1200,
    netRevenue: 41000 + seed * 1000,
    margin: 22 + seed * 0.5,
    avgTicket: 320 + seed * 10,
    inadimplenciaRate: 3.2 + seed * 0.1,
    fixedExpenseRatio: 31 + seed * 0.4,
    leads: 180 + seed * 8,
    cpl: 22 + seed,
    avgCAC: 140 + seed * 5,
    avgNPS: 8.1 + seed * 0.05,
    avgWait: 11 - seed * 0.2,
    returnRate: 38 + seed,
    slaLeadHours: 1.2 - seed * 0.05,
    promoters: 60 + seed * 2,
    neutrals: 25 + seed,
    detractors: 15 - seed,
  };
}

export function getSandboxChannels(userId: number) {
  const seed = userId % 10;
  return [
    { channel: "Instagram",  leads: 45 + seed * 2, appointments: 38 + seed, revenue: 12000 + seed * 300 },
    { channel: "Google",     leads: 38 + seed,     appointments: 32 + seed, revenue: 10500 + seed * 250 },
    { channel: "Indicacao",  leads: 32 + seed,     appointments: 29 + seed, revenue: 9800 + seed * 200 },
    { channel: "Organico",   leads: 28 + seed,     appointments: 22 + seed, revenue: 7200 + seed * 150 },
    { channel: "Telefone",   leads: 22 + seed,     appointments: 18 + seed, revenue: 5800 + seed * 120 },
    { channel: "Presencial", leads: 15 + seed,     appointments: 14 + seed, revenue: 4600 + seed * 100 },
  ];
}

export function getSandboxAppointments(userId: number, page = 1, limit = 20) {
  const seed = userId % 10;
  const statuses = ["Realizada", "No-Show", "Cancelada", "Confirmada"];
  const channels = ["Instagram", "Google", "Indicacao", "Organico", "Telefone", "Presencial"];
  const professionals = ["Dr. Ana", "Dr. Carlos", "Dra. Beatriz", "Dr. Rafael"];
  const procedures = ["Consulta Padrão", "Retorno", "Avaliação Inicial", "Exame"];
  const items = Array.from({ length: limit }, (_, i) => {
    const idx = (page - 1) * limit + i + seed;
    return {
      id: idx + 1,
      date: new Date(Date.now() - (idx * 86400000)).toISOString().slice(0, 10),
      professional: professionals[idx % professionals.length],
      channel: channels[idx % channels.length],
      procedure: procedures[idx % procedures.length],
      status: statuses[idx % statuses.length],
      revenue: statuses[idx % statuses.length] === "Realizada" ? 280 + (idx % 5) * 40 : 0,
      nps: statuses[idx % statuses.length] === "Realizada" ? 7 + (idx % 4) : null,
      waitMinutes: statuses[idx % statuses.length] === "Realizada" ? 5 + (idx % 15) : null,
      isNewPatient: idx % 3 === 0,
      isReturn: idx % 4 === 1,
    };
  });
  return { data: items, page, limit, total: 300, totalPages: Math.ceil(300 / limit) };
}

export function getSandboxFinance(userId: number) {
  const seed = userId % 10;
  return {
    grossRevenue: 48000 + seed * 1200,
    netRevenue: 41000 + seed * 1000,
    totalCost: 18000 + seed * 400,
    fixedExpenses: 14000 + seed * 300,
    margin: 22 + seed * 0.5,
    ebitda: 9000 + seed * 200,
    avgTicket: 320 + seed * 10,
    inadimplenciaRate: 3.2 + seed * 0.1,
    inadimplenciaLoss: 1500 + seed * 40,
    cancellationLoss: 2200 + seed * 50,
    breakEven: 44 + seed,
    expenseBreakdown: {
      pessoal: Math.round((14000 + seed * 300) * 0.50),
      aluguel: Math.round((14000 + seed * 300) * 0.20),
      equipamentos: Math.round((14000 + seed * 300) * 0.12),
      marketing: Math.round((14000 + seed * 300) * 0.10),
      outros: Math.round((14000 + seed * 300) * 0.08),
    },
  };
}

export function getSandboxNPS(userId: number) {
  const seed = userId % 10;
  const promoters = 60 + seed * 2;
  const neutrals = 25 + seed;
  const detractors = 15 - seed;
  const total = promoters + neutrals + detractors;
  return {
    score: +((promoters - detractors) / total * 10).toFixed(2),
    promoters, neutrals, detractors, total,
    trend: Array.from({ length: 6 }, (_, i) => ({
      week: `Semana ${i + 1}`,
      score: +(8.0 + Math.sin(i + seed) * 0.4).toFixed(1),
    })),
  };
}
