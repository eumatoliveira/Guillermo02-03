export type KpiSourceMode = "integrated" | "fallback";

export type KpiMeta = {
  label: string;
  formula: string;
  howToCalculate: string;
  sources: string[];
  fields: string[];
  note?: string;
};

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sourceSet(mode: KpiSourceMode, preferred: string[]): string[] {
  if (mode === "integrated") return preferred;
  return ["Fallback interno do dashboard (dados simulados de desenvolvimento)", ...preferred];
}

function makeMeta(label: string, mode: KpiSourceMode): KpiMeta {
  const key = normalizeLabel(label);

  if (key.includes("nps por")) {
    return {
      label,
      formula: "NPS por Profissional = Média das notas do formulário pós-consulta, segmentada por profissional",
      howToCalculate: "Filtre as respostas do profissional no período, some as notas válidas e divida pela quantidade de respostas válidas.",
      sources: sourceSet(mode, ["Pesquisa NPS / WhatsApp / formulário de satisfação", "Tabela consolidada com professionalId"]),
      fields: ["score", "professionalId", "responseAt", "unit"],
    };
  }

  if (key.includes("nps")) {
    return {
      label,
      formula: "NPS Geral = Média das notas coletadas no período (escala 0–10). Distinto do NPS clássico (Promotores − Detratores).",
      howToCalculate: "Some as notas válidas do período e divida pelo total de respostas válidas. O resultado é a nota média de 0 a 10, não o NPS clássico de −100 a 100.",
      sources: sourceSet(mode, ["Pesquisa NPS / WhatsApp / formulário de satisfação", "Tabela de respostas NPS consolidada"]),
      fields: ["score", "responseAt", "unit"],
    };
  }

  if (key.includes("ocupacao") || key.includes("ociosidade")) {
    return {
      label,
      formula: key.includes("ociosidade")
        ? "Ociosidade (%) = 100 − Taxa de Ocupação"
        : "Ocupação (%) = Consultas realizadas ÷ Capacidade disponível × 100",
      howToCalculate: key.includes("ociosidade")
        ? "Calcule a taxa de ocupação do período e subtraia de 100%. O resultado representa a capacidade ociosa da clínica."
        : "Some as consultas realizadas no período, some a capacidade disponível dos slots/profissionais/unidades e divida realizadas por capacidade.",
      sources: sourceSet(mode, ["Agenda / CRM de agenda", "Cadastro de capacidade por profissional/slot/unidade"]),
      fields: ["status", "scheduledAt", "professionalId", "unit", "slotCapacity"],
    };
  }

  if (key.includes("confirmacoes")) {
    return {
      label,
      formula: "Confirmações (%) = Agendamentos confirmados ÷ Total agendado × 100",
      howToCalculate: "Conte os agendamentos confirmados no período e divida pelo total agendado no mesmo recorte.",
      sources: sourceSet(mode, ["CRM / agenda / WhatsApp", "Histórico de confirmação"]),
      fields: ["status", "confirmedAt", "scheduledAt", "channel", "professionalId"],
    };
  }

  if (key.includes("perda de capacidade")) {
    return {
      label,
      formula: "Perda de Capacidade (%) = (No-shows + Cancelamentos < 24h) ÷ Total agendado × 100",
      howToCalculate: "Some as faltas e os cancelamentos feitos com menos de 24h de antecedência, e divida pelo total de consultas agendadas no período.",
      sources: sourceSet(mode, ["Agenda / CRM", "Histórico de cancelamento com timestamp"]),
      fields: ["status", "scheduledAt", "canceledAt", "cancellationHoursBefore"],
    };
  }

  if (key.includes("no show por canal")) {
    return {
      label,
      formula: "No-show por Canal (%) = No-shows do canal ÷ Agendados do canal × 100",
      howToCalculate: "Filtre pelo canal desejado, conte as faltas e divida pelo total de agendamentos daquele canal no período.",
      sources: sourceSet(mode, ["Agenda / CRM", "Origem do lead / canal"]),
      fields: ["status", "channel", "scheduledAt"],
    };
  }

  if (key.includes("no show") || key.includes("noshow")) {
    return {
      label,
      formula: "No-Show (%) = Consultas faltadas ÷ Consultas agendadas × 100",
      howToCalculate: "Conte os agendamentos com status de falta no período e divida pelo total de agendamentos do mesmo recorte.",
      sources: sourceSet(mode, ["Agenda / recepção / CRM", "Histórico de status da consulta"]),
      fields: ["status", "scheduledAt", "channel", "professionalId", "unit"],
    };
  }

  if (key.includes("consultas realizadas")) {
    return {
      label,
      formula: "Consultas Realizadas = Total de consultas efetivamente realizadas no período",
      howToCalculate: "Conte somente as consultas com status 'realizado' no recorte de tempo selecionado.",
      sources: sourceSet(mode, ["Agenda / CRM", "Histórico de atendimentos"]),
      fields: ["status", "performedAt", "professionalId", "unit"],
    };
  }

  if (key.includes("custo") && key.includes("no show")) {
    return {
      label,
      formula: "Custo Estimado do No-Show = Nº de no-shows × Ticket médio do período",
      howToCalculate: "Conte os no-shows do período e multiplique pelo ticket médio observado no mesmo recorte.",
      sources: sourceSet(mode, ["Agenda / CRM", "Financeiro / ticket médio"]),
      fields: ["status", "ticketMedio", "scheduledAt"],
    };
  }

  if (key.includes("lead time")) {
    return {
      label,
      formula: "Lead Time = Média de dias entre o primeiro contato e a confirmação do agendamento",
      howToCalculate: "Subtraia a data do primeiro contato da data de confirmação do agendamento e consolide a média no recorte selecionado.",
      sources: sourceSet(mode, ["Kommo / CRM / agenda", "Histórico de interações"]),
      fields: ["leadId", "createdAt", "confirmedAt", "channel"],
    };
  }

  if (key.includes("faturamento bruto")) {
    return {
      label,
      formula: "Faturamento Bruto = Soma de todos os recebimentos do mês, antes de deduções",
      howToCalculate: "Some todos os recebimentos do período antes de aplicar cancelamentos, estornos ou baixas por inadimplência.",
      sources: sourceSet(mode, ["Asaas / ERP / financeiro principal"]),
      fields: ["amount", "confirmedAt", "status", "billingPeriod"],
    };
  }

  if (key.includes("receita liquida")) {
    return {
      label,
      formula: "Receita Líquida = Faturamento Bruto − Cancelamentos − Inadimplência − Estornos",
      howToCalculate: "Parta do faturamento bruto do período e desconte cancelamentos, inadimplência e estornos do mesmo recorte.",
      sources: sourceSet(mode, ["Asaas / ERP / financeiro principal", "Recebíveis / cancelamentos / estornos"]),
      fields: ["grossAmount", "cancellationAmount", "defaultAmount", "chargebackAmount", "confirmedAt"],
    };
  }

  if (key.includes("ebitda")) {
    return {
      label,
      formula: "EBITDA = Receita Líquida − CMV − Despesas variáveis − Despesas fixas pro-rata",
      howToCalculate: "Parta da receita líquida do período, subtraia o CMV, as despesas variáveis e a parcela fixa proporcional ao período.",
      sources: sourceSet(mode, ["Asaas / ERP / DRE gerencial", "Centro de custos / despesas operacionais"]),
      fields: ["netRevenue", "cmv", "variableCosts", "fixedCosts", "competenceDate"],
    };
  }

  if (key.includes("margem por servico") || key.includes("margem por procedimento")) {
    return {
      label,
      formula: "Margem por Serviço (%) = (Receita do serviço − Custo direto com insumo e repasse) ÷ Receita × 100",
      howToCalculate: "Agrupe por serviço ou procedimento, desconte insumos e repasses diretos, e divida o resultado pela receita do próprio serviço.",
      sources: sourceSet(mode, ["Financeiro / ERP", "CRM / agenda / cadastro de serviços"]),
      fields: ["serviceId", "revenue", "directCost", "repasse", "performedAt"],
    };
  }

  if (key.includes("margem por medico")) {
    return {
      label,
      formula: "Margem por Médico (%) = (Receita gerada − Repasse contratual − Custo hora proporcional) ÷ Receita × 100",
      howToCalculate: "Agrupe por profissional, desconte o repasse contratual e o custo hora proporcional, e divida pela receita gerada.",
      sources: sourceSet(mode, ["Financeiro / ERP", "CRM / agenda / cadastro de profissionais"]),
      fields: ["professionalId", "revenue", "repasse", "hourCost", "performedAt"],
    };
  }

  if (key.includes("margem")) {
    return {
      label,
      formula: "Margem Líquida (%) = Lucro Líquido ÷ Receita Líquida × 100",
      howToCalculate: "Calcule o lucro líquido do período, divida pela receita líquida do mesmo recorte e multiplique por 100.",
      sources: sourceSet(mode, ["Asaas / ERP / centro de custos", "Cadastro de repasse, custo direto e custo hora"]),
      fields: ["profit", "netRevenue", "expenseType", "competenceDate"],
    };
  }

  if (key.includes("ticket")) {
    return {
      label,
      formula: "Ticket Médio = Receita Total ÷ Nº de consultas realizadas no período",
      howToCalculate: "Some a receita total do período e divida pelo total de consultas realizadas no mesmo recorte.",
      sources: sourceSet(mode, ["Asaas / ERP / financeiro", "Agenda / consultas realizadas"]),
      fields: ["grossRevenue", "realizedCount", "procedureId", "professionalId"],
    };
  }

  if (key.includes("inadimpl")) {
    return {
      label,
      formula: "Inadimplência (%) = Valores não pagos ÷ Total faturado × 100",
      howToCalculate: "Some os valores em aberto ou vencidos e divida pelo total faturado no mesmo recorte.",
      sources: sourceSet(mode, ["Asaas / recebíveis", "Financeiro / faturamento"]),
      fields: ["unpaidAmount", "grossRevenue", "dueAt", "paidAt"],
      note: "Faixas de referência: P1 (meta) < 4% | P2: 4% a 8% | P3: > 8%.",
    };
  }

  if (key.includes("despesas fixas")) {
    return {
      label,
      formula: "Despesas Fixas / Receita (%) = Total de despesas fixas ÷ Receita Líquida × 100",
      howToCalculate: "Some as despesas fixas do período e divida pela receita líquida do mesmo recorte.",
      sources: sourceSet(mode, ["ERP / centro de custos", "Financeiro / receita líquida"]),
      fields: ["fixedCosts", "netRevenue", "competenceDate"],
      note: "Faixas de referência: P1 (meta) < 45% | P2: 45% a 60% | P3: > 60%.",
    };
  }

  if (key.includes("forecast")) {
    return {
      label,
      formula: "Forecast de Receita = Consultas confirmadas na agenda × Ticket médio histórico por procedimento",
      howToCalculate: "Conte as consultas confirmadas futuras, aplique o ticket médio histórico por procedimento e some o valor projetado.",
      sources: sourceSet(mode, ["Agenda / CRM", "Financeiro histórico por procedimento"]),
      fields: ["confirmedAppointments", "procedureId", "historicalAvgTicket"],
    };
  }

  if (key.includes("posicao de caixa") || key.includes("caixa")) {
    return {
      label,
      formula: "Posição de Caixa = Saldo atual + Entradas previstas − Saídas previstas",
      howToCalculate: "Some o saldo atual com as entradas previstas e desconte as saídas previstas do período.",
      sources: sourceSet(mode, ["Tesouraria / ERP / financeiro", "Fluxo de caixa previsto"]),
      fields: ["cashBalance", "projectedInflows", "projectedOutflows", "competenceDate"],
      note: "Faixas de referência: P1 (meta) sempre positivo | P2: projeção negativa | P3: caixa negativo.",
    };
  }

  if (key.includes("break even") || key.includes("break-even")) {
    return {
      label,
      formula: "Break-even = Despesas Fixas Totais ÷ Margem de Contribuição Média (%)",
      howToCalculate: "Calcule a margem de contribuição média por atendimento, divida as despesas fixas por essa margem e compare com a receita atual.",
      sources: sourceSet(mode, ["Financeiro / ERP", "Custos variáveis e ticket médio"]),
      fields: ["fixedCosts", "avgTicket", "variableCosts", "competenceDate"],
      note: "Break-even monetário = Despesas Fixas ÷ Margem de Contribuição monetária por atendimento (ticket − custos variáveis).",
    };
  }

  if (key.includes("cpl")) {
    return {
      label,
      formula: "CPL = Total investido no canal ÷ Leads gerados no período",
      howToCalculate: "Some o investimento do canal no período e divida pelo número de leads gerados pelo mesmo canal.",
      sources: sourceSet(mode, ["Meta Ads / Google Ads", "CRM / captação por canal"]),
      fields: ["channel", "adSpend", "leadId", "createdAt"],
    };
  }

  if (key.includes("conversao") && key.includes("consulta")) {
    return {
      label,
      formula: "Conversão Lead → Consulta Realizada (%) = Consultas realizadas ÷ Total de leads × 100",
      howToCalculate: "Conte as consultas efetivamente realizadas originadas de leads do período e divida pelo total de leads.",
      sources: sourceSet(mode, ["CRM / agenda", "Histórico do funil"]),
      fields: ["leadId", "status", "performedAt", "channel"],
    };
  }

  if (key.includes("conversao") && key.includes("agendamento")) {
    return {
      label,
      formula: "Conversão Lead → Agendamento (%) = Agendamentos confirmados ÷ Total de leads × 100",
      howToCalculate: "Conte os agendamentos confirmados do período e divida pelo total de leads gerados no mesmo recorte.",
      sources: sourceSet(mode, ["CRM / agenda", "Histórico do funil"]),
      fields: ["leadId", "confirmedAt", "channel"],
    };
  }

  if (key.includes("cac")) {
    return {
      label,
      formula: "CAC = Investimento no canal ÷ Novos pacientes originados do canal no período",
      howToCalculate: "Some o investimento do canal no período e divida pelo total de novos pacientes convertidos e atribuídos ao mesmo canal.",
      sources: sourceSet(mode, ["Meta Ads / Google Ads / CRM", "Kommo / funil comercial / conversões"]),
      fields: ["adSpend", "customerId", "convertedAt", "channel"],
    };
  }

  if (key.includes("ltv") && key.includes("cac")) {
    return {
      label,
      formula: "LTV / CAC = LTV ÷ CAC  |  LTV = Ticket Médio × Frequência de retorno × Meses de retenção",
      howToCalculate: "Calcule o LTV do paciente pela recorrência média e divida pelo CAC do mesmo recorte ou canal.",
      sources: sourceSet(mode, ["Financeiro / contratos / recorrência", "CRM / ads / conversões"]),
      fields: ["avgTicket", "returnFrequency", "retentionMonths", "cac", "channel"],
    };
  }

  if (key.includes("ltv")) {
    return {
      label,
      formula: "LTV = Ticket Médio × Frequência de retorno × Meses de retenção",
      howToCalculate: "Calcule o ticket médio da base, estime a frequência de retorno e multiplique pelo tempo médio de retenção.",
      sources: sourceSet(mode, ["Financeiro / contratos / histórico de recorrência", "CRM / agenda / renovações"]),
      fields: ["avgTicket", "returnFrequency", "retentionMonths", "customerId"],
    };
  }

  if (key.includes("roi")) {
    return {
      label,
      formula: "ROI (%) = (Receita atribuída ao canal − Investimento no canal) ÷ Investimento × 100",
      howToCalculate: "Atribua a receita ao canal correto, subtraia o investimento daquele canal e divida pelo valor investido.",
      sources: sourceSet(mode, ["Meta Ads / Google Ads / Analytics", "CRM / financeiro com atribuição por canal"]),
      fields: ["attributedRevenue", "investment", "utmSource", "channel"],
    };
  }

  if (key.includes("leads")) {
    return {
      label,
      formula: "Leads = Volume total de leads qualificados por canal no período",
      howToCalculate: "Conte os leads qualificados do período, agrupando por canal quando o card exigir segmentação.",
      sources: sourceSet(mode, ["Kommo / CRM / captação", "Histórico de interações"]),
      fields: ["leadId", "createdAt", "qualified", "channel"],
    };
  }

  if (key.includes("retorno") || key.includes("fidelizacao") || key.includes("recorrencia")) {
    return {
      label,
      formula: "Taxa de Retorno (%) = Pacientes que retornam em até N dias após a 1ª consulta ÷ Base elegível × 100",
      howToCalculate: "Defina a base elegível da primeira consulta e divida os pacientes que retornaram no período pelo total elegível.",
      sources: sourceSet(mode, ["CRM / agenda", "Histórico do paciente"]),
      fields: ["customerId", "firstAppointmentAt", "returnAppointmentAt", "professionalId"],
    };
  }

  if (key.includes("sla de resposta ao lead")) {
    return {
      label,
      formula: "SLA de Resposta ao Lead = Tempo médio entre o 1º contato do lead e a resposta da recepção",
      howToCalculate: "Subtraia o timestamp do primeiro contato do timestamp da primeira resposta válida e consolide a média do período.",
      sources: sourceSet(mode, ["Kommo / CRM / WhatsApp / recepção", "Histórico de interações"]),
      fields: ["leadId", "createdAt", "firstResponseAt", "channel"],
    };
  }

  if (key.includes("espera")) {
    return {
      label,
      formula: "Tempo Médio de Espera = Hora de atendimento real − Hora agendada (média do período)",
      howToCalculate: "Subtraia a hora agendada da hora real de atendimento em cada consulta e calcule a média do período.",
      sources: sourceSet(mode, ["Agenda / recepção", "Logs operacionais com timestamp"]),
      fields: ["scheduledAt", "startedAt", "professionalId", "unit"],
    };
  }

  if (key.includes("valuation") || key.includes("multiplo") || key.includes("payback") || key.includes("m a")) {
    return {
      label,
      formula: key.includes("valuation")
        ? "Valuation = EBITDA normalizado × Múltiplo ajustado"
        : key.includes("payback")
          ? "Payback = Investimento ÷ EBITDA-alvo"
          : "Múltiplo estimado = Múltiplo base + Ajustes dinâmicos de risco e crescimento",
      howToCalculate: "Normalize o EBITDA LTM, aplique ajustes de risco e crescimento, e calcule os cenários de valuation e payback.",
      sources: sourceSet(mode, ["Financeiro consolidado / DRE / rede multi-unidade", "Camada analítica de valuation do Control Tower"]),
      fields: ["ebitdaLtm", "normalizedEbitda", "adjustedMultiple", "targetInvestment", "synergy"],
    };
  }

  return {
    label,
    formula: "Indicador calculado a partir do recorte atual do dashboard",
    howToCalculate: "Aplique os filtros ativos, identifique a base do indicador e consolide o valor segundo a regra de negócio definida para o módulo.",
    sources: sourceSet(mode, ["Control Tower / integrações conectadas ao cliente"]),
    fields: ["period", "unit", "channel", "professionalId"],
    note: "Consulte a documentação do módulo para detalhes da fórmula específica deste indicador.",
  };
}

export function resolveKpiMeta(label: string, mode: KpiSourceMode): KpiMeta {
  return makeMeta(label, mode);
}
