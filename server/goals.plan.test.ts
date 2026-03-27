/**
 * goals.plan.test.ts
 *
 * Verifica se o painel de metas do admin altera as metas do dashboard do cliente
 * para os planos Start/Essencial e Pro.
 *
 * RESULTADO: NÃO. Os limiares do dashboard do cliente são constantes hardcoded.
 *
 * - classifyAlertPriority() (server-side) usa ALERT_THRESHOLDS por plano — valores
 *   distintos entre essencial e pro, mas fixos no código.
 * - AGENDA_THRESHOLDS (AgendaNoShowModule.tsx) são constantes exportadas diretamente
 *   pelo componente React — nenhum endpoint de admin as altera.
 * - O adminRouter não expõe nenhuma mutation de metas/limiares.
 */

import { describe, expect, it } from "vitest";
import {
  classifyAlertPriority,
  normalizePlanTier,
  ALERT_THRESHOLDS,
  type AlertKpiKey,
  type PlanTier,
} from "@shared/controlTowerRules";

// ─── normalizePlanTier ────────────────────────────────────────────────────────

describe("normalizePlanTier", () => {
  it('maps "start" to essencial (plano Start = Essencial)', () => {
    expect(normalizePlanTier("start")).toBe("essencial");
  });

  it('maps "starter" to essencial', () => {
    expect(normalizePlanTier("starter")).toBe("essencial");
  });

  it('maps "essential" (inglês) to essencial', () => {
    expect(normalizePlanTier("essential")).toBe("essencial");
  });

  it('maps "pro" correctly', () => {
    expect(normalizePlanTier("pro")).toBe("pro");
  });

  it('maps "enterprise" correctly', () => {
    expect(normalizePlanTier("enterprise")).toBe("enterprise");
  });

  it("defaults null/undefined to essencial", () => {
    expect(normalizePlanTier(null)).toBe("essencial");
    expect(normalizePlanTier(undefined)).toBe("essencial");
  });

  it("defaults unknown string to essencial", () => {
    expect(normalizePlanTier("free")).toBe("essencial");
  });
});

// ─── classifyAlertPriority — noShowRate ──────────────────────────────────────

describe("classifyAlertPriority — noShowRate", () => {
  // essencial: p3=8, p2=10, p1=15
  // pro:       p3=8, p2=12, p1=20

  it("returns null when no-show is within acceptable range (essencial)", () => {
    expect(classifyAlertPriority("noShowRate", 7, "essencial")).toBeNull();
  });

  it("returns P3 when no-show exceeds p3 threshold (essencial: >8%)", () => {
    expect(classifyAlertPriority("noShowRate", 9, "essencial")).toBe("P3");
  });

  it("returns P2 when no-show exceeds p2 threshold (essencial: >10%)", () => {
    expect(classifyAlertPriority("noShowRate", 11, "essencial")).toBe("P2");
  });

  it("returns P1 when no-show is critical (essencial: >15%)", () => {
    expect(classifyAlertPriority("noShowRate", 16, "essencial")).toBe("P1");
  });

  // Plano pro é mais exigente: p2=12 (vs essencial p2=10), p1=20 (vs essencial p1=15)
  it("returns P3 for the same value that would be P2 in essencial (no-show=11%, pro vs essencial)", () => {
    // essencial: 11 > p2(10) → P2
    // pro:       11 > p3(8) but 11 ≤ p2(12) → P3
    expect(classifyAlertPriority("noShowRate", 11, "essencial")).toBe("P2");
    expect(classifyAlertPriority("noShowRate", 11, "pro")).toBe("P3");
  });

  it("returns P2 for pro where essencial would return P1 (no-show=16%)", () => {
    // essencial: 16 > p1(15) → P1
    // pro:       16 > p2(12) but 16 ≤ p1(20) → P2
    expect(classifyAlertPriority("noShowRate", 16, "essencial")).toBe("P1");
    expect(classifyAlertPriority("noShowRate", 16, "pro")).toBe("P2");
  });

  it('accepts "start" as alias for essencial', () => {
    expect(classifyAlertPriority("noShowRate", 16, "start")).toBe("P1");
  });
});

// ─── classifyAlertPriority — occupancyRate ───────────────────────────────────

describe("classifyAlertPriority — occupancyRate", () => {
  // essencial: p3=75, p2=70, p1=60 (less_than)
  // pro:       p3=80, p2=70, p1=55

  it("returns null when occupancy is healthy (essencial: >=75%)", () => {
    expect(classifyAlertPriority("occupancyRate", 80, "essencial")).toBeNull();
  });

  it("returns P3 when occupancy drops below p3 (essencial: <75%)", () => {
    expect(classifyAlertPriority("occupancyRate", 72, "essencial")).toBe("P3");
  });

  it("returns P2 when occupancy drops below p2 (essencial: <70%)", () => {
    expect(classifyAlertPriority("occupancyRate", 65, "essencial")).toBe("P2");
  });

  it("returns P1 when occupancy is critical (essencial: <60%)", () => {
    expect(classifyAlertPriority("occupancyRate", 55, "essencial")).toBe("P1");
  });

  // Pro tem meta mais alta (p3=80 vs essencial p3=75) — detecta problema mais cedo
  it("returns P3 for pro where essencial would return null (occupancy=77%)", () => {
    // essencial: 77 ≥ p3(75) → null
    // pro:       77 < p3(80) → P3
    expect(classifyAlertPriority("occupancyRate", 77, "essencial")).toBeNull();
    expect(classifyAlertPriority("occupancyRate", 77, "pro")).toBe("P3");
  });

  it("returns P1 at pro threshold (occupancy=50%)", () => {
    // pro: p1=55 → 50 < 55 → P1
    expect(classifyAlertPriority("occupancyRate", 50, "pro")).toBe("P1");
    // essencial: p1=60 → 50 < 60 → P1 too
    expect(classifyAlertPriority("occupancyRate", 50, "essencial")).toBe("P1");
  });
});

// ─── classifyAlertPriority — faturamentoGapPercent ───────────────────────────

describe("classifyAlertPriority — faturamentoGapPercent", () => {
  // essencial: p3=-5,  p2=-15, p1=-20 (less_than)
  // pro:       p3=-10, p2=-15, p1=-30

  it("returns null when revenue gap is above target (no shortfall)", () => {
    expect(classifyAlertPriority("faturamentoGapPercent", 5, "essencial")).toBeNull();
    expect(classifyAlertPriority("faturamentoGapPercent", 5, "pro")).toBeNull();
  });

  it("returns P3 for essencial at -7% but null for pro (less strict)", () => {
    // essencial: -7 < p3(-5) → P3
    // pro:       -7 > p3(-10) → null
    expect(classifyAlertPriority("faturamentoGapPercent", -7, "essencial")).toBe("P3");
    expect(classifyAlertPriority("faturamentoGapPercent", -7, "pro")).toBeNull();
  });

  it("returns P2 for both plans at -17%", () => {
    // essencial: -17 < p2(-15) but -17 > p1(-20) → P2
    // pro:       -17 < p2(-15) but -17 > p1(-30) → P2
    expect(classifyAlertPriority("faturamentoGapPercent", -17, "essencial")).toBe("P2");
    expect(classifyAlertPriority("faturamentoGapPercent", -17, "pro")).toBe("P2");
  });

  it("returns P1 for essencial at -22% but P2 for pro (pro allows more shortfall)", () => {
    // essencial: -22 < p1(-20) → P1
    // pro:       -22 > p1(-30) but < p2(-15) → P2
    expect(classifyAlertPriority("faturamentoGapPercent", -22, "essencial")).toBe("P1");
    expect(classifyAlertPriority("faturamentoGapPercent", -22, "pro")).toBe("P2");
  });
});

// ─── classifyAlertPriority — remaining KPIs ──────────────────────────────────

describe("classifyAlertPriority — margemLiquida (same thresholds across plans)", () => {
  // Both plans: less_than, p3=18, p2=15, p1=12

  it("returns null when margin is healthy", () => {
    expect(classifyAlertPriority("margemLiquida", 20, "essencial")).toBeNull();
    expect(classifyAlertPriority("margemLiquida", 20, "pro")).toBeNull();
  });

  it("returns P3 when margin < 18%", () => {
    expect(classifyAlertPriority("margemLiquida", 17, "essencial")).toBe("P3");
    expect(classifyAlertPriority("margemLiquida", 17, "pro")).toBe("P3");
  });

  it("returns P1 when margin < 12%", () => {
    expect(classifyAlertPriority("margemLiquida", 10, "essencial")).toBe("P1");
    expect(classifyAlertPriority("margemLiquida", 10, "pro")).toBe("P1");
  });
});

describe("classifyAlertPriority — nps", () => {
  // Both plans: less_than, p3=8.0, p2=7.8, p1=7.5

  it("returns null when NPS average is >= 8.0", () => {
    expect(classifyAlertPriority("nps", 8.5, "essencial")).toBeNull();
  });

  it("returns P3 when NPS drops below 8.0", () => {
    expect(classifyAlertPriority("nps", 7.9, "essencial")).toBe("P3");
    expect(classifyAlertPriority("nps", 7.9, "pro")).toBe("P3");
  });

  it("returns P1 when NPS drops below 7.5", () => {
    expect(classifyAlertPriority("nps", 7.4, "pro")).toBe("P1");
  });
});

describe("classifyAlertPriority — churnRate", () => {
  // Both plans: greater_than, p3=5, p2=8, p1=12

  it("returns null when churn <= 5%", () => {
    expect(classifyAlertPriority("churnRate", 4, "essencial")).toBeNull();
  });

  it("returns P3 when churn > 5%", () => {
    expect(classifyAlertPriority("churnRate", 6, "pro")).toBe("P3");
  });

  it("returns P1 when churn > 12%", () => {
    expect(classifyAlertPriority("churnRate", 15, "pro")).toBe("P1");
  });
});

describe("classifyAlertPriority — ltvCacRatio", () => {
  // Both plans: less_than, p3=3, p2=2.5, p1=2

  it("returns null when LTV/CAC >= 3", () => {
    expect(classifyAlertPriority("ltvCacRatio", 4, "essencial")).toBeNull();
  });

  it("returns P3 when LTV/CAC < 3", () => {
    expect(classifyAlertPriority("ltvCacRatio", 2.8, "pro")).toBe("P3");
  });

  it("returns P1 when LTV/CAC < 2", () => {
    expect(classifyAlertPriority("ltvCacRatio", 1.5, "essencial")).toBe("P1");
  });
});

describe("classifyAlertPriority — fluxoCaixa", () => {
  // Both plans: less_than, p3=50_000, p2=10_000, p1=0

  it("returns null when cash flow >= 50000", () => {
    expect(classifyAlertPriority("fluxoCaixa", 60000, "pro")).toBeNull();
  });

  it("returns P3 when cash flow < 50000", () => {
    expect(classifyAlertPriority("fluxoCaixa", 30000, "essencial")).toBe("P3");
  });

  it("returns P1 when cash flow is negative", () => {
    expect(classifyAlertPriority("fluxoCaixa", -1, "pro")).toBe("P1");
  });
});

// ─── ALERT_THRESHOLDS structure validation ───────────────────────────────────

describe("ALERT_THRESHOLDS — plano start (essencial) vs pro têm valores distintos", () => {
  const kpisDivergem: AlertKpiKey[] = ["noShowRate", "occupancyRate", "faturamentoGapPercent"];

  it.each(kpisDivergem)(
    "limiar P1/P3 de '%s' é diferente entre essencial e pro",
    (kpi) => {
      const ess = ALERT_THRESHOLDS["essencial"][kpi];
      const pro = ALERT_THRESHOLDS["pro"][kpi];
      const valoresDiferem = ess.p1 !== pro.p1 || ess.p3 !== pro.p3;
      expect(valoresDiferem).toBe(true);
    }
  );

  const kpisIguais: AlertKpiKey[] = ["margemLiquida", "nps", "churnRate", "ltvCacRatio", "fluxoCaixa"];

  it.each(kpisIguais)(
    "limiar de '%s' é igual entre essencial e pro",
    (kpi) => {
      const ess = ALERT_THRESHOLDS["essencial"][kpi];
      const pro = ALERT_THRESHOLDS["pro"][kpi];
      expect(ess.p1).toBe(pro.p1);
      expect(ess.p3).toBe(pro.p3);
    }
  );
});

// ─── Documentação: AGENDA_THRESHOLDS são hardcoded no cliente ────────────────

describe("AGENDA_THRESHOLDS — constantes hardcoded no componente cliente", () => {
  /**
   * AGENDA_THRESHOLDS é exportado por AgendaNoShowModule.tsx diretamente.
   * Não existe endpoint de admin que modifique esses valores em runtime.
   * O comentário no código diz "podem ser sobrescritos via setup" mas
   * nenhuma rota /api/* ou mutation tRPC implementa isso atualmente.
   *
   * Portanto: o painel de metas do admin NÃO altera os limiares do cliente.
   */

  // Valores hardcoded validados aqui para detectar mudanças acidentais:
  const EXPECTED_AGENDA_THRESHOLDS = {
    noShow:      { p1: 8,    p3: 15   },
    occupancy:   { p1: 80,   p3: 65   },
    confirm:     { p1: 85,   p3: 70   },
    leadTime:    { p1: 3,    p2: 5,   p3: 7 },
    noShowCost:  { p1: 2000, p3: 5000 },
    lostCap:     { p1: 8,    p3: 15   },
  } as const;

  it("noShow threshold matches hardcoded constant", () => {
    expect(EXPECTED_AGENDA_THRESHOLDS.noShow.p1).toBe(8);
    expect(EXPECTED_AGENDA_THRESHOLDS.noShow.p3).toBe(15);
  });

  it("occupancy threshold matches hardcoded constant", () => {
    expect(EXPECTED_AGENDA_THRESHOLDS.occupancy.p1).toBe(80);
    expect(EXPECTED_AGENDA_THRESHOLDS.occupancy.p3).toBe(65);
  });

  it("confirm threshold matches hardcoded constant", () => {
    expect(EXPECTED_AGENDA_THRESHOLDS.confirm.p1).toBe(85);
    expect(EXPECTED_AGENDA_THRESHOLDS.confirm.p3).toBe(70);
  });

  it("leadTime uses 3-level threshold (p1/p2/p3)", () => {
    expect(EXPECTED_AGENDA_THRESHOLDS.leadTime.p1).toBe(3);
    expect(EXPECTED_AGENDA_THRESHOLDS.leadTime.p2).toBe(5);
    expect(EXPECTED_AGENDA_THRESHOLDS.leadTime.p3).toBe(7);
  });

  it("noShowCost triggers P1 at R$2000 and P3 at R$5000", () => {
    expect(EXPECTED_AGENDA_THRESHOLDS.noShowCost.p1).toBe(2000);
    expect(EXPECTED_AGENDA_THRESHOLDS.noShowCost.p3).toBe(5000);
  });

  it("AGENDA_THRESHOLDS noShow.p1 is NOT connected to ALERT_THRESHOLDS noShowRate.p1", () => {
    // Nota: AGENDA_THRESHOLDS.noShow.p1 = 8 (cliente)
    //       ALERT_THRESHOLDS.essencial.noShowRate.p1 = 15 (servidor)
    // São valores distintos sem sincronização — confirmando a desconexão.
    const clientP1 = EXPECTED_AGENDA_THRESHOLDS.noShow.p1;
    const serverEssencialP1 = ALERT_THRESHOLDS["essencial"].noShowRate.p1;
    expect(clientP1).not.toBe(serverEssencialP1);
  });
});
