/**
 * Full coverage tests for mockData engine
 * Covers: dimension aggregations, time-series, filters, KPI edge cases, getFilterOptions
 */
import { describe, expect, it } from "vitest";
import {
  applyFilters,
  computeByChannel,
  computeByProcedure,
  computeByProfessional,
  computeByUnit,
  computeByWeekday,
  computeKPIs,
  computeMonthlyTrend,
  computeWeeklyTrend,
  defaultFilters,
  getFilterOptions,
  type Appointment,
  type Filters,
} from "./mockData";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeAppt(overrides: Partial<Appointment> = {}): Appointment {
  return {
    date: "2025-03-01",
    weekday: "Sat",
    professional: "Dr. Silva",
    channel: "Google",
    unit: "Jardins",
    procedure: "Botox",
    status: "Realizada",
    severity: "P1",
    revenue: 1000,
    cost: 300,
    nps: 9,
    waitMinutes: 10,
    isReturn: false,
    leadSource: "Google",
    cac: 200,
    slotCapacity: 1,
    wasConfirmed: true,
    firstContactAt: "2025-02-28T09:00:00.000Z",
    confirmedAt: "2025-02-28T10:00:00.000Z",
    scheduledAt: "2025-03-01T09:00:00.000Z",
    firstResponseAt: "2025-02-28T09:30:00.000Z",
    cancellationHoursBefore: null,
    cancellationLoss: 0,
    inadimplenciaLoss: 20,
    estornoLoss: 10,
    fixedExpenseAllocated: 150,
    adSpend: 100,
    isNewPatient: false,
    ...overrides,
  };
}

// ─── computeKPIs — edge cases ─────────────────────────────────────────────────

describe("computeKPIs — edge cases", () => {
  it("returns all-zero KPIs for empty dataset", () => {
    const kpis = computeKPIs([]);
    expect(kpis.total).toBe(0);
    expect(kpis.grossRevenue).toBe(0);
    expect(kpis.avgTicket).toBe(0);
    expect(kpis.noShowRate).toBe(0);
    expect(kpis.occupancyRate).toBe(0);
    expect(kpis.confirmationRate).toBe(0);
    expect(kpis.avgNPS).toBe(0);
    expect(kpis.avgCAC).toBe(0);
    expect(kpis.cpl).toBe(0);
    expect(kpis.leadTimeDays).toBe(0);
    expect(kpis.slaLeadHours).toBe(0);
    expect(kpis.margin).toBe(0);
  });

  it("counts total, realized, no-shows and canceled correctly", () => {
    const data = [
      makeAppt({ status: "Realizada" }),
      makeAppt({ status: "Realizada" }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ status: "Cancelada", revenue: 0, nps: null }),
      makeAppt({ status: "Confirmada", revenue: 0, nps: null }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.total).toBe(5);
    expect(kpis.realized).toBe(2);
    expect(kpis.noShows).toBe(1);
    expect(kpis.canceled).toBe(1);
  });

  it("noShowRate = (no-shows / total) × 100", () => {
    const data = [
      makeAppt({ status: "Realizada" }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.noShowRate).toBeCloseTo(75, 1);
  });

  it("grossRevenue is sum of realized revenues only", () => {
    const data = [
      makeAppt({ status: "Realizada", revenue: 500 }),
      makeAppt({ status: "Realizada", revenue: 300 }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ status: "Cancelada", revenue: 0, nps: null }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.grossRevenue).toBe(800);
  });

  it("avgTicket = grossRevenue / realized count", () => {
    const data = [
      makeAppt({ status: "Realizada", revenue: 600 }),
      makeAppt({ status: "Realizada", revenue: 400 }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.avgTicket).toBe(500);
  });

  it("avgTicket is 0 when no realized appointments", () => {
    const data = [makeAppt({ status: "No-Show", revenue: 0, nps: null })];
    const kpis = computeKPIs(data);
    expect(kpis.avgTicket).toBe(0);
  });

  it("margin = (ebitda / netRevenue) × 100", () => {
    const appt = makeAppt({
      revenue: 1000,
      cost: 200,
      inadimplenciaLoss: 0,
      estornoLoss: 0,
      cancellationLoss: 0,
      fixedExpenseAllocated: 100,
    });
    const kpis = computeKPIs([appt]);
    // netRevenue = 1000, ebitda = 1000 - 200 - 100 = 700
    expect(kpis.netRevenue).toBeCloseTo(1000, 1);
    expect(kpis.ebitda).toBeCloseTo(700, 1);
    expect(kpis.margin).toBeCloseTo(70, 1);
  });

  it("margin is 0 when netRevenue is 0", () => {
    const appt = makeAppt({
      revenue: 0,
      status: "No-Show",
      nps: null,
      inadimplenciaLoss: 0,
      estornoLoss: 0,
      cancellationLoss: 0,
    });
    const kpis = computeKPIs([appt]);
    expect(kpis.margin).toBe(0);
  });

  it("avgNPS averages only non-null realized NPS scores", () => {
    const data = [
      makeAppt({ nps: 10 }),
      makeAppt({ nps: 8 }),
      makeAppt({ nps: null, status: "Realizada" }), // null excluded
      makeAppt({ status: "No-Show", revenue: 0, nps: null }), // non-realized excluded
    ];
    const kpis = computeKPIs(data);
    expect(kpis.avgNPS).toBeCloseTo(9, 5);
  });

  it("promoters/neutrals/detractors split NPS scores correctly", () => {
    const data = [
      makeAppt({ nps: 10 }),  // promoter (>=9)
      makeAppt({ nps: 9 }),   // promoter (>=9)
      makeAppt({ nps: 8 }),   // neutral  (7-8)
      makeAppt({ nps: 7 }),   // neutral  (7-8)
      makeAppt({ nps: 6 }),   // detractor (<7)
      makeAppt({ nps: 4 }),   // detractor (<7)
    ];
    const kpis = computeKPIs(data);
    expect(kpis.promoters).toBe(2);
    expect(kpis.neutrals).toBe(2);
    expect(kpis.detractors).toBe(2);
  });

  it("complaints = floor(scores < 5 × 0.3)", () => {
    const data = [
      makeAppt({ nps: 4 }),
      makeAppt({ nps: 3 }),
      makeAppt({ nps: 2 }),
      makeAppt({ nps: 9 }),
    ];
    const kpis = computeKPIs(data);
    // 3 scores < 5 → floor(3 * 0.3) = floor(0.9) = 0
    expect(kpis.complaints).toBe(0);
  });

  it("leads counts isNewPatient=true across ALL statuses", () => {
    const data = [
      makeAppt({ isNewPatient: true, status: "Realizada" }),
      makeAppt({ isNewPatient: true, status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ isNewPatient: false }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.leads).toBe(2);
  });

  it("convertedNewPatients counts isNewPatient=true only for Realizada", () => {
    const data = [
      makeAppt({ isNewPatient: true, status: "Realizada" }),
      makeAppt({ isNewPatient: true, status: "No-Show", revenue: 0, nps: null }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.leads).toBe(2);
    // Only 1 converted (Realizada)
    expect(kpis.avgCAC).toBeGreaterThan(0); // totalAdSpend / 1
  });

  it("cpl = totalAdSpend / leads (0 when no leads)", () => {
    const data = [makeAppt({ isNewPatient: false, adSpend: 500 })];
    const kpis = computeKPIs(data);
    expect(kpis.leads).toBe(0);
    expect(kpis.cpl).toBe(0);
  });

  it("returnRate = isReturn realized / total realized × 100", () => {
    const data = [
      makeAppt({ isReturn: true }),
      makeAppt({ isReturn: true }),
      makeAppt({ isReturn: false }),
      makeAppt({ isReturn: false }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.returnRate).toBeCloseTo(50, 1);
  });

  it("returnRate is 0 when no realized appointments", () => {
    const data = [makeAppt({ status: "No-Show", revenue: 0, nps: null })];
    const kpis = computeKPIs(data);
    expect(kpis.returnRate).toBe(0);
  });

  it("capacityAvailable is sum of all slotCapacity", () => {
    const data = [
      makeAppt({ slotCapacity: 1 }),
      makeAppt({ slotCapacity: 2 }),
      makeAppt({ slotCapacity: 1 }),
    ];
    const kpis = computeKPIs(data);
    expect(kpis.capacityAvailable).toBe(4);
  });

  it("lostCapacityRate includes no-shows and cancellations < 24h", () => {
    const data = [
      makeAppt({ status: "Realizada" }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ status: "Cancelada", revenue: 0, nps: null, cancellationHoursBefore: 10 }),
      makeAppt({ status: "Cancelada", revenue: 0, nps: null, cancellationHoursBefore: 48 }),
    ];
    const kpis = computeKPIs(data);
    // (1 no-show + 1 cancel<24h) / 4 total = 50%
    expect(kpis.lostCapacityRate).toBeCloseTo(50, 1);
  });

  it("breakEven is 0 when fixedExpenses is 0", () => {
    const data = [makeAppt({ fixedExpenseAllocated: 0 })];
    const kpis = computeKPIs(data);
    expect(kpis.breakEven).toBe(0);
  });

  it("slaLeadHours divides total response time by confirmed with responses", () => {
    // firstContactAt → firstResponseAt diff = 0.5h (30 min)
    const appt = makeAppt({
      wasConfirmed: true,
      firstContactAt: "2025-03-01T09:00:00.000Z",
      firstResponseAt: "2025-03-01T09:30:00.000Z",
      confirmedAt: "2025-03-01T10:00:00.000Z",
    });
    const kpis = computeKPIs([appt]);
    expect(kpis.slaLeadHours).toBeCloseTo(0.5, 3);
  });

  it("leadTimeDays uses confirmedAt minus firstContactAt in days", () => {
    // firstContactAt = March 1, confirmedAt = March 4 → 3 days
    const appt = makeAppt({
      wasConfirmed: true,
      firstContactAt: "2025-03-01T09:00:00.000Z",
      confirmedAt: "2025-03-04T09:00:00.000Z",
    });
    const kpis = computeKPIs([appt]);
    expect(kpis.leadTimeDays).toBeCloseTo(3, 0);
  });
});

// ─── computeByChannel ────────────────────────────────────────────────────────

describe("computeByChannel", () => {
  it("returns one entry per unique channel in data", () => {
    const data = [
      makeAppt({ channel: "Google" }),
      makeAppt({ channel: "Instagram" }),
      makeAppt({ channel: "Google" }),
    ];
    const result = computeByChannel(data);
    const names = result.map((r) => r.name);
    expect(names).toContain("Google");
    expect(names).toContain("Instagram");
    expect(names).not.toContain("Indicação");
  });

  it("falls back to all channels when data is empty", () => {
    const result = computeByChannel([]);
    expect(result.length).toBeGreaterThan(0);
  });

  it("each channel entry has correct totals", () => {
    const data = [
      makeAppt({ channel: "Google", revenue: 500 }),
      makeAppt({ channel: "Google", revenue: 300 }),
      makeAppt({ channel: "Instagram", revenue: 400 }),
    ];
    const result = computeByChannel(data);
    const google = result.find((r) => r.name === "Google")!;
    const instagram = result.find((r) => r.name === "Instagram")!;
    expect(google.total).toBe(2);
    expect(google.grossRevenue).toBe(800);
    expect(instagram.total).toBe(1);
    expect(instagram.grossRevenue).toBe(400);
  });

  it("channel totals sum to dataset total", () => {
    const data = [
      makeAppt({ channel: "Google" }),
      makeAppt({ channel: "Google" }),
      makeAppt({ channel: "Instagram" }),
      makeAppt({ channel: "Indicação" }),
    ];
    const result = computeByChannel(data);
    const channelTotal = result.reduce((sum, r) => sum + r.total, 0);
    expect(channelTotal).toBe(data.length);
  });

  it("KPIs within each channel are independent from other channels", () => {
    const googleNoShow = makeAppt({ channel: "Google", status: "No-Show", revenue: 0, nps: null });
    const googleRealized = makeAppt({ channel: "Google", status: "Realizada" });
    const instagramRealized = makeAppt({ channel: "Instagram", status: "Realizada" });
    const data = [googleNoShow, googleRealized, instagramRealized];
    const result = computeByChannel(data);
    const google = result.find((r) => r.name === "Google")!;
    const instagram = result.find((r) => r.name === "Instagram")!;
    expect(google.noShowRate).toBeCloseTo(50, 1);
    expect(instagram.noShowRate).toBe(0);
  });
});

// ─── computeByProfessional ───────────────────────────────────────────────────

describe("computeByProfessional", () => {
  it("returns one entry per unique professional", () => {
    const data = [
      makeAppt({ professional: "Dr. Silva" }),
      makeAppt({ professional: "Dra. Ana" }),
      makeAppt({ professional: "Dr. Silva" }),
    ];
    const result = computeByProfessional(data);
    const names = result.map((r) => r.name);
    expect(names).toContain("Dr. Silva");
    expect(names).toContain("Dra. Ana");
  });

  it("falls back to default professionals for empty data", () => {
    const result = computeByProfessional([]);
    expect(result.length).toBeGreaterThan(0);
  });

  it("revenue per professional is correct", () => {
    const data = [
      makeAppt({ professional: "Dr. Silva", revenue: 700 }),
      makeAppt({ professional: "Dr. Silva", revenue: 300 }),
      makeAppt({ professional: "Dra. Ana", revenue: 1000 }),
    ];
    const result = computeByProfessional(data);
    const silva = result.find((r) => r.name === "Dr. Silva")!;
    const ana = result.find((r) => r.name === "Dra. Ana")!;
    expect(silva.grossRevenue).toBe(1000);
    expect(ana.grossRevenue).toBe(1000);
  });

  it("professional totals sum to dataset total", () => {
    const data = [
      makeAppt({ professional: "Dr. Silva" }),
      makeAppt({ professional: "Dr. Costa" }),
      makeAppt({ professional: "Dra. Ana" }),
    ];
    const result = computeByProfessional(data);
    const total = result.reduce((sum, r) => sum + r.total, 0);
    expect(total).toBe(data.length);
  });

  it("noShowRate per professional is isolated", () => {
    const data = [
      makeAppt({ professional: "Dr. Silva", status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ professional: "Dr. Silva", status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ professional: "Dra. Ana", status: "Realizada" }),
    ];
    const result = computeByProfessional(data);
    const silva = result.find((r) => r.name === "Dr. Silva")!;
    const ana = result.find((r) => r.name === "Dra. Ana")!;
    expect(silva.noShowRate).toBeCloseTo(100, 1);
    expect(ana.noShowRate).toBe(0);
  });

  it("NPS per professional excludes other professionals' scores", () => {
    const data = [
      makeAppt({ professional: "Dr. Silva", nps: 10 }),
      makeAppt({ professional: "Dra. Ana", nps: 6 }),
    ];
    const result = computeByProfessional(data);
    const silva = result.find((r) => r.name === "Dr. Silva")!;
    const ana = result.find((r) => r.name === "Dra. Ana")!;
    expect(silva.avgNPS).toBeCloseTo(10, 5);
    expect(ana.avgNPS).toBeCloseTo(6, 5);
  });
});

// ─── computeByProcedure ──────────────────────────────────────────────────────

describe("computeByProcedure", () => {
  it("returns one entry per unique procedure", () => {
    const data = [
      makeAppt({ procedure: "Botox" }),
      makeAppt({ procedure: "Laser" }),
      makeAppt({ procedure: "Botox" }),
    ];
    const result = computeByProcedure(data);
    const names = result.map((r) => r.name);
    expect(names).toContain("Botox");
    expect(names).toContain("Laser");
    expect(names).not.toContain("Peeling");
  });

  it("falls back to default procedures for empty data", () => {
    const result = computeByProcedure([]);
    expect(result.length).toBeGreaterThan(0);
  });

  it("revenue per procedure is correct", () => {
    const data = [
      makeAppt({ procedure: "Botox", revenue: 850 }),
      makeAppt({ procedure: "Botox", revenue: 900 }),
      makeAppt({ procedure: "Laser", revenue: 650 }),
    ];
    const result = computeByProcedure(data);
    const botox = result.find((r) => r.name === "Botox")!;
    const laser = result.find((r) => r.name === "Laser")!;
    expect(botox.grossRevenue).toBe(1750);
    expect(laser.grossRevenue).toBe(650);
  });

  it("procedure totals sum to dataset total", () => {
    const data = [
      makeAppt({ procedure: "Botox" }),
      makeAppt({ procedure: "Laser" }),
      makeAppt({ procedure: "Peeling" }),
    ];
    const result = computeByProcedure(data);
    const total = result.reduce((sum, r) => sum + r.total, 0);
    expect(total).toBe(data.length);
  });

  it("KPIs per procedure are independent", () => {
    const data = [
      makeAppt({ procedure: "Botox", status: "Realizada", revenue: 850 }),
      makeAppt({ procedure: "Botox", status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ procedure: "Laser", status: "Realizada", revenue: 650 }),
    ];
    const result = computeByProcedure(data);
    const botox = result.find((r) => r.name === "Botox")!;
    expect(botox.noShowRate).toBeCloseTo(50, 1);
    expect(botox.grossRevenue).toBe(850);
  });
});

// ─── computeByUnit ───────────────────────────────────────────────────────────

describe("computeByUnit — complete", () => {
  it("occupancy rate per unit is independent", () => {
    const data = [
      makeAppt({ unit: "Jardins", status: "Realizada", slotCapacity: 1 }),
      makeAppt({ unit: "Jardins", status: "No-Show", revenue: 0, nps: null, slotCapacity: 1 }),
      makeAppt({ unit: "Paulista", status: "Realizada", slotCapacity: 1 }),
    ];
    const result = computeByUnit(data);
    const jardins = result.find((r) => r.name === "Jardins")!;
    const paulista = result.find((r) => r.name === "Paulista")!;
    expect(jardins.occupancyRate).toBeLessThan(paulista.occupancyRate);
  });

  it("revenue per unit is summed correctly", () => {
    const data = [
      makeAppt({ unit: "Jardins", revenue: 500 }),
      makeAppt({ unit: "Jardins", revenue: 500 }),
      makeAppt({ unit: "Paulista", revenue: 900 }),
    ];
    const result = computeByUnit(data);
    const jardins = result.find((r) => r.name === "Jardins")!;
    const paulista = result.find((r) => r.name === "Paulista")!;
    expect(jardins.grossRevenue).toBe(1000);
    expect(paulista.grossRevenue).toBe(900);
  });

  it("NPS per unit excludes other units", () => {
    const data = [
      makeAppt({ unit: "Jardins", nps: 10 }),
      makeAppt({ unit: "Paulista", nps: 5 }),
    ];
    const result = computeByUnit(data);
    const jardins = result.find((r) => r.name === "Jardins")!;
    const paulista = result.find((r) => r.name === "Paulista")!;
    expect(jardins.avgNPS).toBeCloseTo(10, 5);
    expect(paulista.avgNPS).toBeCloseTo(5, 5);
  });

  it("no-show rate per unit is isolated", () => {
    const data = [
      makeAppt({ unit: "Jardins", status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ unit: "Jardins", status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ unit: "Paulista", status: "Realizada" }),
    ];
    const result = computeByUnit(data);
    const jardins = result.find((r) => r.name === "Jardins")!;
    const paulista = result.find((r) => r.name === "Paulista")!;
    expect(jardins.noShowRate).toBeCloseTo(100, 1);
    expect(paulista.noShowRate).toBe(0);
  });
});

// ─── computeByWeekday ────────────────────────────────────────────────────────

describe("computeByWeekday", () => {
  it("always returns exactly 7 entries (one per weekday)", () => {
    const result = computeByWeekday([]);
    expect(result.length).toBe(7);
  });

  it("weekday names are the 3-letter abbreviations", () => {
    const result = computeByWeekday([]);
    const names = result.map((r) => r.name);
    expect(names).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("groups appointments by weekday correctly", () => {
    const data = [
      makeAppt({ weekday: "Mon", revenue: 400 }),
      makeAppt({ weekday: "Mon", revenue: 600 }),
      makeAppt({ weekday: "Fri", revenue: 800 }),
    ];
    const result = computeByWeekday(data);
    const mon = result.find((r) => r.name === "Mon")!;
    const fri = result.find((r) => r.name === "Fri")!;
    const wed = result.find((r) => r.name === "Wed")!;
    expect(mon.total).toBe(2);
    expect(mon.grossRevenue).toBe(1000);
    expect(fri.total).toBe(1);
    expect(wed.total).toBe(0);
  });

  it("weekdays with no appointments return zero KPIs", () => {
    const result = computeByWeekday([]);
    result.forEach((day) => {
      expect(day.total).toBe(0);
      expect(day.grossRevenue).toBe(0);
    });
  });
});

// ─── computeWeeklyTrend ──────────────────────────────────────────────────────

describe("computeWeeklyTrend", () => {
  it("returns empty array for empty data", () => {
    expect(computeWeeklyTrend([])).toEqual([]);
  });

  it("groups appointments into 7-day windows", () => {
    const data: Appointment[] = [];
    // 14 days = 2 weeks
    for (let i = 0; i < 14; i++) {
      const d = new Date("2025-03-14");
      d.setDate(d.getDate() - i);
      data.push(makeAppt({ date: d.toISOString().split("T")[0] }));
    }
    const result = computeWeeklyTrend(data);
    expect(result.length).toBe(2);
  });

  it("returns at most 8 weeks of data", () => {
    const data: Appointment[] = [];
    // 70 days = 10 weeks
    for (let i = 0; i < 70; i++) {
      const d = new Date("2025-03-14");
      d.setDate(d.getDate() - i);
      data.push(makeAppt({ date: d.toISOString().split("T")[0] }));
    }
    const result = computeWeeklyTrend(data);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("each week entry has a label and valid KPIs", () => {
    const data = [
      makeAppt({ date: "2025-03-01" }),
      makeAppt({ date: "2025-03-02" }),
    ];
    const result = computeWeeklyTrend(data);
    expect(result.length).toBe(1);
    expect(result[0].label).toBeTruthy();
    expect(result[0].total).toBe(2);
  });

  it("revenue aggregates correctly within each week", () => {
    const week1 = [
      makeAppt({ date: "2025-03-01", revenue: 500 }),
      makeAppt({ date: "2025-03-03", revenue: 500 }),
    ];
    const week2 = [
      makeAppt({ date: "2025-03-08", revenue: 1000 }),
    ];
    const result = computeWeeklyTrend([...week1, ...week2]);
    const [w1, w2] = result;
    expect(w1.grossRevenue).toBe(1000);
    expect(w2.grossRevenue).toBe(1000);
  });

  it("single appointment returns one week", () => {
    const result = computeWeeklyTrend([makeAppt({ date: "2025-03-01" })]);
    expect(result.length).toBe(1);
    expect(result[0].total).toBe(1);
  });
});

// ─── computeMonthlyTrend ─────────────────────────────────────────────────────

describe("computeMonthlyTrend", () => {
  it("returns empty array for empty data", () => {
    expect(computeMonthlyTrend([])).toEqual([]);
  });

  it("groups appointments by calendar month", () => {
    const data = [
      makeAppt({ date: "2025-01-15" }),
      makeAppt({ date: "2025-01-20" }),
      makeAppt({ date: "2025-02-10" }),
    ];
    const result = computeMonthlyTrend(data);
    expect(result.length).toBe(2);
    expect(result[0].total).toBe(2);
    expect(result[1].total).toBe(1);
  });

  it("uses Portuguese month name abbreviations", () => {
    const portugueseMonths = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const data = [
      makeAppt({ date: "2025-01-01" }),
      makeAppt({ date: "2025-06-01" }),
      makeAppt({ date: "2025-12-01" }),
    ];
    const result = computeMonthlyTrend(data);
    const labels = result.map((r) => r.label);
    expect(labels[0]).toBe(portugueseMonths[0]); // Jan
    expect(labels[1]).toBe(portugueseMonths[5]); // Jun
    expect(labels[2]).toBe(portugueseMonths[11]); // Dez
  });

  it("returns months sorted chronologically", () => {
    const data = [
      makeAppt({ date: "2025-03-01" }),
      makeAppt({ date: "2025-01-01" }),
      makeAppt({ date: "2025-02-01" }),
    ];
    const result = computeMonthlyTrend(data);
    expect(result[0].label).toBe("Jan");
    expect(result[1].label).toBe("Fev");
    expect(result[2].label).toBe("Mar");
  });

  it("handles data spanning multiple years", () => {
    const data = [
      makeAppt({ date: "2024-12-01" }),
      makeAppt({ date: "2025-01-01" }),
    ];
    const result = computeMonthlyTrend(data);
    expect(result.length).toBe(2);
    expect(result[0].label).toBe("Dez");
    expect(result[1].label).toBe("Jan");
  });

  it("single month dataset returns one entry", () => {
    const data = [
      makeAppt({ date: "2025-03-01" }),
      makeAppt({ date: "2025-03-15" }),
    ];
    const result = computeMonthlyTrend(data);
    expect(result.length).toBe(1);
    expect(result[0].total).toBe(2);
  });

  it("revenue sums correctly per month", () => {
    const data = [
      makeAppt({ date: "2025-01-01", revenue: 400 }),
      makeAppt({ date: "2025-01-15", revenue: 600 }),
      makeAppt({ date: "2025-02-01", revenue: 1200 }),
    ];
    const result = computeMonthlyTrend(data);
    expect(result[0].grossRevenue).toBe(1000); // Jan
    expect(result[1].grossRevenue).toBe(1200); // Fev
  });
});

// ─── applyFilters — edge cases ───────────────────────────────────────────────

describe("applyFilters — edge cases", () => {
  const baseFilters: Filters = { ...defaultFilters };

  it("returns empty array when input is empty", () => {
    const result = applyFilters([], baseFilters);
    expect(result).toHaveLength(0);
  });

  it("no filters applied returns all appointments within period", () => {
    const data = [makeAppt(), makeAppt(), makeAppt()];
    const result = applyFilters(data, baseFilters);
    expect(result.length).toBe(data.length);
  });

  it("procedure filter matches exact procedure name", () => {
    const data = [
      makeAppt({ procedure: "Botox" }),
      makeAppt({ procedure: "Laser" }),
      makeAppt({ procedure: "Laser" }),
    ];
    const result = applyFilters(data, { ...baseFilters, procedure: "Laser" });
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.procedure === "Laser")).toBe(true);
  });

  it("status filter matches exact status", () => {
    const data = [
      makeAppt({ status: "Realizada" }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
    ];
    const result = applyFilters(data, { ...baseFilters, status: "No-Show" });
    expect(result).toHaveLength(2);
  });

  it("severity filter matches exact severity", () => {
    const data = [
      makeAppt({ severity: "P1" }),
      makeAppt({ severity: "P2" }),
      makeAppt({ severity: "P3" }),
    ];
    const result = applyFilters(data, { ...baseFilters, severity: "P2" });
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("P2");
  });

  it("channel 'Outros' alias matches Outros, Telefone, Presencial", () => {
    const data = [
      makeAppt({ channel: "Outros" }),
      makeAppt({ channel: "Telefone" }),
      makeAppt({ channel: "Presencial" }),
      makeAppt({ channel: "Google" }),
      makeAppt({ channel: "Instagram" }),
    ];
    const result = applyFilters(data, { ...baseFilters, channel: "Outros" });
    expect(result).toHaveLength(3);
    expect(result.every((a) => ["Outros", "Telefone", "Presencial"].includes(a.channel))).toBe(true);
  });

  it("channel 'Whatsapp' alias matches Whatsapp, WhatsApp, Telefone", () => {
    const data = [
      makeAppt({ channel: "Whatsapp" }),
      makeAppt({ channel: "WhatsApp" }),
      makeAppt({ channel: "Telefone" }),
      makeAppt({ channel: "Google" }),
    ];
    const result = applyFilters(data, { ...baseFilters, channel: "Whatsapp" });
    expect(result).toHaveLength(3);
  });

  it("multiple filters combine with AND logic", () => {
    const data = [
      makeAppt({ channel: "Google", professional: "Dr. Silva", procedure: "Botox" }),
      makeAppt({ channel: "Google", professional: "Dra. Ana", procedure: "Botox" }),
      makeAppt({ channel: "Instagram", professional: "Dr. Silva", procedure: "Botox" }),
    ];
    const result = applyFilters(data, {
      ...baseFilters,
      channel: "Google",
      professional: "Dr. Silva",
      procedure: "Botox",
    });
    expect(result).toHaveLength(1);
    expect(result[0].professional).toBe("Dr. Silva");
    expect(result[0].channel).toBe("Google");
  });

  it("unit filter matches exact unit", () => {
    const data = [
      makeAppt({ unit: "Jardins" }),
      makeAppt({ unit: "Paulista" }),
    ];
    const result = applyFilters(data, { ...baseFilters, unit: "Paulista" });
    expect(result).toHaveLength(1);
    expect(result[0].unit).toBe("Paulista");
  });

  it("returns no appointments when filters match nothing", () => {
    const data = [makeAppt({ channel: "Google" }), makeAppt({ channel: "Instagram" })];
    const result = applyFilters(data, { ...baseFilters, channel: "Indicação" });
    expect(result).toHaveLength(0);
  });

  it("period 7d only includes appointments from the last 7 days", () => {
    // Reference date: the max date in the dataset
    const today = "2025-03-14";
    const old = "2025-02-01"; // >7 days before today
    const recent = "2025-03-10"; // within 7 days
    const data = [
      makeAppt({ date: today }),
      makeAppt({ date: recent }),
      makeAppt({ date: old }),
    ];
    const result = applyFilters(data, { ...baseFilters, period: "7d" });
    expect(result.every((a) => a.date >= "2025-03-07")).toBe(true);
    expect(result.some((a) => a.date === old)).toBe(false);
  });
});

// ─── getFilterOptions ────────────────────────────────────────────────────────

describe("getFilterOptions", () => {
  it("returns all unique channels from data", () => {
    const data = [
      makeAppt({ channel: "Google" }),
      makeAppt({ channel: "Instagram" }),
      makeAppt({ channel: "Google" }),
    ];
    const opts = getFilterOptions(data);
    expect(opts.channels).toContain("Google");
    expect(opts.channels).toContain("Instagram");
    // No duplicates
    expect(new Set(opts.channels).size).toBe(opts.channels.length);
  });

  it("returns all unique professionals from data", () => {
    const data = [
      makeAppt({ professional: "Dr. Silva" }),
      makeAppt({ professional: "Dra. Ana" }),
    ];
    const opts = getFilterOptions(data);
    expect(opts.professionals).toContain("Dr. Silva");
    expect(opts.professionals).toContain("Dra. Ana");
  });

  it("returns all unique procedures from data", () => {
    const data = [
      makeAppt({ procedure: "Botox" }),
      makeAppt({ procedure: "Laser" }),
    ];
    const opts = getFilterOptions(data);
    expect(opts.procedures).toContain("Botox");
    expect(opts.procedures).toContain("Laser");
    expect(opts.procedures).not.toContain("Peeling");
  });

  it("returns all unique units from data", () => {
    const data = [makeAppt({ unit: "Jardins" }), makeAppt({ unit: "Paulista" })];
    const opts = getFilterOptions(data);
    expect(opts.units).toContain("Jardins");
    expect(opts.units).toContain("Paulista");
  });

  it("returns all unique statuses from data", () => {
    const data = [
      makeAppt({ status: "Realizada" }),
      makeAppt({ status: "No-Show", revenue: 0, nps: null }),
    ];
    const opts = getFilterOptions(data);
    expect(opts.statuses).toContain("Realizada");
    expect(opts.statuses).toContain("No-Show");
  });

  it("returns all unique severities from data", () => {
    const data = [makeAppt({ severity: "P1" }), makeAppt({ severity: "P3" })];
    const opts = getFilterOptions(data);
    expect(opts.severities).toContain("P1");
    expect(opts.severities).toContain("P3");
  });

  it("falls back to defaults when data is empty", () => {
    const opts = getFilterOptions([]);
    expect(opts.channels.length).toBeGreaterThan(0);
    expect(opts.professionals.length).toBeGreaterThan(0);
    expect(opts.procedures.length).toBeGreaterThan(0);
    expect(opts.units.length).toBeGreaterThan(0);
  });

  it("values are sorted alphabetically", () => {
    const data = [
      makeAppt({ channel: "Instagram" }),
      makeAppt({ channel: "Google" }),
      makeAppt({ channel: "Indicação" }),
    ];
    const opts = getFilterOptions(data);
    const sorted = [...opts.channels].sort((a, b) => a.localeCompare(b));
    expect(opts.channels).toEqual(sorted);
  });
});
