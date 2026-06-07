import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ─── Statistical helpers ──────────────────────────────────────────────────────

function linReg(ys: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, rSquared: 0 };
  const xs = ys.map((_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - xMean) ** 2, 0);
  const sxy = xs.reduce((a, x, i) => a + (x - xMean) * (ys[i] - yMean), 0);
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = yMean - slope * xMean;
  const ssRes = ys.reduce((a, y, i) => a + (y - (intercept + slope * i)) ** 2, 0);
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, rSquared };
}

function stddev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1));
}

function mape(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let sum = 0, count = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] > 0) { sum += Math.abs((actual[i] - predicted[i]) / actual[i]); count++; }
  }
  return count > 0 ? parseFloat(((sum / count) * 100).toFixed(1)) : 0;
}

/**
 * Damped-trend Holt-Winters (Double Exponential Smoothing).
 *
 * The phi (damping) parameter flattens the trend over long horizons,
 * preventing runaway extrapolation when the training window is short.
 * phi = 1.0 → classic linear trend; phi ≈ 0.88 → trend fades to flat.
 *
 * The trend is also hard-capped: the implied annual growth rate cannot
 * exceed ±MAX_ANNUAL_GROWTH, regardless of what the data suggests.
 */
const MAX_ANNUAL_GROWTH = 0.12; // ±12 % per year cap

function holtWinters(
  data: number[],
  alpha: number,
  beta: number,
  horizon: number,
  phi = 0.88,
  ciZ80 = 1.282,
  ciZ95 = 1.96,
) {
  if (data.length === 0) return { fitted: [], forecast: [], lower80: [], upper80: [], lower95: [], upper95: [], level: 0, trend: 0 };

  if (data.length === 1) {
    const f = Array(horizon).fill(data[0]);
    return { fitted: [data[0]], forecast: f, lower80: f, upper80: f, lower95: f, upper95: f, level: data[0], trend: 0 };
  }

  // Initialise level at the average of the first few observations,
  // and trend as the average of first-differences (more robust than
  // using just the first and last point, especially with short series).
  const initN = Math.min(4, data.length);
  let L = data.slice(0, initN).reduce((a, b) => a + b, 0) / initN;
  const diffs: number[] = [];
  for (let i = 1; i < data.length; i++) diffs.push(data[i] - data[i - 1]);
  let T = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  // Cap trend so the implied annual growth never exceeds ±MAX_ANNUAL_GROWTH
  const maxT = L > 0 ? L * MAX_ANNUAL_GROWTH / 12 : Math.abs(T);
  T = Math.max(-maxT, Math.min(maxT, T));

  const fitted: number[] = [];

  for (let t = 1; t < data.length; t++) {
    const prevL = L;
    const prevT = T;
    fitted.push(Math.max(0, prevL + phi * prevT));
    L = alpha * data[t] + (1 - alpha) * (prevL + phi * prevT);
    T = beta * (L - prevL) + (1 - beta) * phi * prevT;
    // Re-apply cap each step so the update never drifts out of bounds
    const maxTStep = L > 0 ? L * MAX_ANNUAL_GROWTH / 12 : Math.abs(T);
    T = Math.max(-maxTStep, Math.min(maxTStep, T));
  }

  // Residual σ
  const residuals = data.slice(1).map((y, i) => y - fitted[i]);
  const σ = stddev(residuals);

  const forecast: number[] = [];
  const lower80: number[] = [];
  const upper80: number[] = [];
  const lower95: number[] = [];
  const upper95: number[] = [];

  // Damped cumulative trend: sum_{j=1}^{h} phi^j
  let phiCum = 0;
  for (let h = 1; h <= horizon; h++) {
    phiCum += Math.pow(phi, h);
    const f = Math.max(0, L + phiCum * T);
    const spread = σ * Math.sqrt(1 + alpha * alpha * h);
    forecast.push(parseFloat(f.toFixed(2)));
    lower80.push(parseFloat(Math.max(0, f - ciZ80 * spread).toFixed(2)));
    upper80.push(parseFloat(Math.max(0, f + ciZ80 * spread).toFixed(2)));
    lower95.push(parseFloat(Math.max(0, f - ciZ95 * spread).toFixed(2)));
    upper95.push(parseFloat(Math.max(0, f + ciZ95 * spread).toFixed(2)));
  }

  return { fitted, forecast, lower80, upper80, lower95, upper95, level: L, trend: T };
}

/**
 * Seasonal indices using ratio-to-moving-average (12-month cycle).
 * Returns array of 12 seasonal multipliers indexed by month (0=Jan, 11=Dec).
 */
function seasonalIndices(data: { month: string; volume: number }[]): number[] | null {
  if (data.length < 13) return null; // need at least 13 months for 12-point MA
  const maLength = 12;
  const centred: number[] = [];
  for (let i = 0; i <= data.length - maLength; i++) {
    const w = data.slice(i, i + maLength).reduce((s, d) => s + d.volume, 0) / maLength;
    centred.push(w);
  }
  // pair each actual with MA
  const byMonth: number[][] = Array.from({ length: 12 }, () => []);
  for (let i = 0; i < centred.length; i++) {
    const actual = data[i + Math.floor(maLength / 2)]?.volume ?? 0;
    if (centred[i] > 0 && actual > 0) {
      const mIdx = new Date(data[i + Math.floor(maLength / 2)].month).getMonth();
      byMonth[mIdx].push(actual / centred[i]);
    }
  }
  const indices = byMonth.map(arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 1.0);
  // Normalise so average = 1
  const avgIdx = indices.reduce((a, b) => a + b, 0) / 12;
  return avgIdx > 0 ? indices.map(s => s / avgIdx) : null;
}

// ─── Route ───────────────────────────────────────────────────────────────────

router.get("/forecast-advanced", async (req: Request, res: Response): Promise<void> => {
  const horizonYears = Math.min(Math.max(parseInt(String(req.query.years ?? "10")), 1), 30);
  const horizonMonths = horizonYears * 12;
  const siteId = req.query.siteId ? String(req.query.siteId) : null;

  // ── Fetch all data in parallel — daily granularity ──
  // sitesRows + siteMonthlyRows are always global (power the "Saturation des sites" tab for all sites)
  const [sitesRows, siteMonthlyRowsDay, monthlyRowsDay, wasteMonthlyRowsDay, revenueRowsDay] = await Promise.all([
    db.execute(sql`SELECT id, name, region, COALESCE(used,0) AS used, COALESCE(capacity,0) AS capacity FROM sites WHERE status='active' ORDER BY name`),
    db.execute(sql`
      SELECT site_id, to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(net),0) AS volume
      FROM discharges WHERE status != 'cancelled'
      GROUP BY site_id, date_trunc('day', ts) ORDER BY site_id, month
    `),
    siteId
      ? db.execute(sql`
          SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS month,
            COALESCE(SUM(net),0) AS volume, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS cnt
          FROM discharges WHERE status != 'cancelled' AND site_id = ${siteId}
          GROUP BY date_trunc('day', ts) ORDER BY 1
        `)
      : db.execute(sql`
          SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS month,
            COALESCE(SUM(net),0) AS volume, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS cnt
          FROM discharges WHERE status != 'cancelled'
          GROUP BY date_trunc('day', ts) ORDER BY 1
        `),
    siteId
      ? db.execute(sql`
          SELECT waste_type, COALESCE(wt.label, d.waste_type) AS label,
            to_char(date_trunc('day', d.ts), 'YYYY-MM-DD') AS month,
            COALESCE(SUM(d.net),0) AS volume
          FROM discharges d LEFT JOIN waste_types wt ON wt.id = d.waste_type
          WHERE d.status != 'cancelled' AND d.site_id = ${siteId}
          GROUP BY d.waste_type, wt.label, date_trunc('day', d.ts) ORDER BY 1, 3
        `)
      : db.execute(sql`
          SELECT waste_type, COALESCE(wt.label, d.waste_type) AS label,
            to_char(date_trunc('day', d.ts), 'YYYY-MM-DD') AS month,
            COALESCE(SUM(d.net),0) AS volume
          FROM discharges d LEFT JOIN waste_types wt ON wt.id = d.waste_type
          WHERE d.status != 'cancelled'
          GROUP BY d.waste_type, wt.label, date_trunc('day', d.ts) ORDER BY 1, 3
        `),
    siteId
      ? db.execute(sql`
          SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS month,
            COALESCE(SUM(total),0) AS revenue
          FROM discharges WHERE status != 'cancelled' AND site_id = ${siteId}
          GROUP BY date_trunc('day', ts) ORDER BY 1
        `)
      : db.execute(sql`
          SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS month,
            COALESCE(SUM(total),0) AS revenue
          FROM discharges WHERE status != 'cancelled'
          GROUP BY date_trunc('day', ts) ORDER BY 1
        `),
  ]);

  const parseRows = (rows: { rows: unknown[] }) =>
  (rows.rows as Record<string, unknown>[])
    .filter(r => r.month != null)
    .map(r => ({
      month: String(r.month),
      volume: parseFloat(String(r.volume ?? 0)),
      revenue: parseFloat(String(r.revenue ?? 0)),
      cnt: parseInt(String(r.cnt ?? 0)),
    }));

  let monthlyData = parseRows(monthlyRowsDay);
  let monthlyRows = monthlyRowsDay;
  let siteMonthlyRows = siteMonthlyRowsDay;
  let wasteMonthlyRows = wasteMonthlyRowsDay;
  let revenueRows = revenueRowsDay;

  // Fallback to hourly if fewer than 7 daily data points
  if (monthlyData.length < 7) {
    const [mr, wmr, rr] = await Promise.all([
      siteId
        ? db.execute(sql`
            SELECT to_char(date_trunc('hour', ts), 'YYYY-MM-DD HH24:00') AS month,
              COALESCE(SUM(net),0) AS volume, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS cnt
            FROM discharges WHERE status != 'cancelled' AND site_id = ${siteId}
            GROUP BY date_trunc('hour', ts) ORDER BY 1
          `)
        : db.execute(sql`
            SELECT to_char(date_trunc('hour', ts), 'YYYY-MM-DD HH24:00') AS month,
              COALESCE(SUM(net),0) AS volume, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS cnt
            FROM discharges WHERE status != 'cancelled'
            GROUP BY date_trunc('hour', ts) ORDER BY 1
          `),
      siteId
        ? db.execute(sql`
            SELECT waste_type, COALESCE(wt.label, d.waste_type) AS label,
              to_char(date_trunc('hour', d.ts), 'YYYY-MM-DD HH24:00') AS month,
              COALESCE(SUM(d.net),0) AS volume
            FROM discharges d LEFT JOIN waste_types wt ON wt.id = d.waste_type
            WHERE d.status != 'cancelled' AND d.site_id = ${siteId}
            GROUP BY d.waste_type, wt.label, date_trunc('hour', d.ts) ORDER BY 1, 3
          `)
        : db.execute(sql`
            SELECT waste_type, COALESCE(wt.label, d.waste_type) AS label,
              to_char(date_trunc('hour', d.ts), 'YYYY-MM-DD HH24:00') AS month,
              COALESCE(SUM(d.net),0) AS volume
            FROM discharges d LEFT JOIN waste_types wt ON wt.id = d.waste_type
            WHERE d.status != 'cancelled'
            GROUP BY d.waste_type, wt.label, date_trunc('hour', d.ts) ORDER BY 1, 3
          `),
      siteId
        ? db.execute(sql`
            SELECT to_char(date_trunc('hour', ts), 'YYYY-MM-DD HH24:00') AS month,
              COALESCE(SUM(total),0) AS revenue
            FROM discharges WHERE status != 'cancelled' AND site_id = ${siteId}
            GROUP BY date_trunc('hour', ts) ORDER BY 1
          `)
        : db.execute(sql`
            SELECT to_char(date_trunc('hour', ts), 'YYYY-MM-DD HH24:00') AS month,
              COALESCE(SUM(total),0) AS revenue
            FROM discharges WHERE status != 'cancelled'
            GROUP BY date_trunc('hour', ts) ORDER BY 1
          `),
    ]);
    monthlyRows = mr;
    wasteMonthlyRows = wmr;
    revenueRows = rr;
    monthlyData = parseRows(monthlyRows);
  }

  // Insufficient data guard — return clear error
  if (monthlyData.length < 3) {
    res.json({ error: "Données insuffisantes pour la prévision — minimum 3 jours de données requis" });
    return;
  }

  const volumes = monthlyData.map(d => d.volume);
  const revenues = monthlyData.map(d => d.revenue);
  const n = volumes.length;

  // ── Linear regression for baseline stats ──
  const volReg = linReg(volumes);
  const revReg = linReg(revenues);

  // ── Holt-Winters (α=0.35, β=0.12) ──
  const hw = holtWinters(volumes, 0.35, 0.12, horizonMonths);
  const hwRev = holtWinters(revenues, 0.35, 0.12, horizonMonths);

  // ── Seasonal indices ──
  const seasonal = seasonalIndices(monthlyData);

  // ── MAPE ──
  const fittedAll = [volumes[0], ...hw.fitted];
  const mapeVal = mape(volumes, fittedAll);

  // ── Trend direction ──
  const annualGrowthRate = hw.level > 0 ? (hw.trend * 12) / hw.level : 0;
  const trendDir = annualGrowthRate > 0.02 ? "hausse" : annualGrowthRate < -0.02 ? "baisse" : "stable";

  // ── Generate monthly forecast series ──
  const rawLastMonth = monthlyData.length > 0
  ? new Date(monthlyData[monthlyData.length - 1].month)
  : new Date();
const lastMonth = isNaN(rawLastMonth.getTime()) ? new Date() : rawLastMonth;

function nextMonthDate(base: Date, offset: number): string {
  const d = new Date(base);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 7) + "-01";
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7) + "-01";
}

  const forecastMonthly = hw.forecast.map((base, i) => {
    const month = nextMonthDate(lastMonth, i + 1);
    const mIdx = new Date(month).getMonth();
    const sAdj = seasonal ? seasonal[mIdx] : 1;
    const baseS = parseFloat((base * sAdj).toFixed(2));
    const lo80S = parseFloat(Math.max(0, hw.lower80[i] * sAdj).toFixed(2));
    const hi80S = parseFloat(Math.max(0, hw.upper80[i] * sAdj).toFixed(2));
    const lo95S = parseFloat(Math.max(0, hw.lower95[i] * sAdj).toFixed(2));
    const hi95S = parseFloat(Math.max(0, hw.upper95[i] * sAdj).toFixed(2));
    const pessimistic = parseFloat(Math.max(0, base * 0.60).toFixed(2));
    const optimistic = parseFloat(Math.max(0, base * 1.45).toFixed(2));
    const revBase = parseFloat((hwRev.forecast[i] ?? 0).toFixed(0));
    return { month, base: baseS, lower80: lo80S, upper80: hi80S, lower95: lo95S, upper95: hi95S, pessimistic, optimistic, revenue: revBase };
  });

  // ── Historical monthly series ──
  const historicalMonthly = monthlyData.map(d => ({
    month: d.month,
    volume: d.volume,
    revenue: d.revenue,
    count: d.cnt,
  }));

  // ── Annual aggregated forecasts ──
  const annualForecasts: { year: number; baseVolume: number; pessimisticVolume: number; optimisticVolume: number; lower95Volume: number; upper95Volume: number; baseRevenue: number; growthVsBase: number }[] = [];
  const targetYears = [1, 2, 3, 5, 10, 15, 20].filter(y => y <= horizonYears);
  for (const yr of targetYears) {
    const startIdx = (yr - 1) * 12;
    const endIdx = yr * 12;
    const slice = forecastMonthly.slice(startIdx, endIdx);
    if (slice.length === 0) continue;
    const baseVol = parseFloat(slice.reduce((s, m) => s + m.base, 0).toFixed(1));
    const histBase = volumes.reduce((a, b) => a + b, 0) / (n || 1) * 12;
    annualForecasts.push({
      year: lastMonth.getFullYear() + yr,
      baseVolume: baseVol,
      pessimisticVolume: parseFloat(slice.reduce((s, m) => s + m.pessimistic, 0).toFixed(1)),
      optimisticVolume: parseFloat(slice.reduce((s, m) => s + m.optimistic, 0).toFixed(1)),
      lower95Volume: parseFloat(slice.reduce((s, m) => s + m.lower95, 0).toFixed(1)),
      upper95Volume: parseFloat(slice.reduce((s, m) => s + m.upper95, 0).toFixed(1)),
      baseRevenue: parseFloat(slice.reduce((s, m) => s + m.revenue, 0).toFixed(0)),
      growthVsBase: histBase > 0 ? parseFloat((((baseVol - histBase) / histBase) * 100).toFixed(1)) : 0,
    });
  }

  // ── Per-site capacity exhaustion ──
  const siteMonthlyMap: Record<string, { month: string; volume: number }[]> = {};
  for (const r of siteMonthlyRows.rows as Record<string, unknown>[]) {
    const sid = String(r.site_id);
    if (!siteMonthlyMap[sid]) siteMonthlyMap[sid] = [];
    siteMonthlyMap[sid].push({ month: String(r.month), volume: parseFloat(String(r.volume ?? 0)) });
  }

  const siteProjections = (sitesRows.rows as Record<string, unknown>[]).map(s => {
    const siteId = String(s.id);
    const siteName = String(s.name);
    const region = String(s.region ?? "");
    const usedMt = parseFloat(String(s.used ?? 0));
    const capacityMt = parseFloat(String(s.capacity ?? 0));
    const siteMonths = siteMonthlyMap[siteId] ?? [];
    const siteVols = siteMonths.map(m => m.volume);
    const hwSite = holtWinters(siteVols, 0.35, 0.12, horizonMonths);
    const avgMonthlyRate = hwSite.forecast.length > 0 ? hwSite.forecast.slice(0, Math.min(3, hwSite.forecast.length)).reduce((a, b) => a + b, 0) / Math.min(3, hwSite.forecast.length) : 0;
    const remaining = Math.max(0, capacityMt - usedMt);
    const pctUsed = capacityMt > 0 ? parseFloat(((usedMt / capacityMt) * 100).toFixed(4)) : 0;

    function yearsUntil(rate: number) {
      if (rate <= 0) return null;
      return parseFloat(((remaining / rate) / 12).toFixed(1));
    }
    const baseYears = yearsUntil(avgMonthlyRate);
    const pessimisticYears = yearsUntil(avgMonthlyRate * 1.45);
    const optimisticYears = yearsUntil(avgMonthlyRate * 0.60);

    return {
      siteId, siteName, region, usedMt, capacityMt, pctUsed,
      monthlyRateMt: parseFloat(avgMonthlyRate.toFixed(2)),
      yearsUntilFull_base: baseYears,
      yearsUntilFull_pessimistic: pessimisticYears,
      yearsUntilFull_optimistic: optimisticYears,
      exhaustionYear_base: baseYears ? Math.round(new Date().getFullYear() + baseYears) : null,
      exhaustionYear_pessimistic: pessimisticYears ? Math.round(new Date().getFullYear() + pessimisticYears) : null,
      exhaustionYear_optimistic: optimisticYears ? Math.round(new Date().getFullYear() + optimisticYears) : null,
      trendMtPerMonth: parseFloat(hwSite.trend.toFixed(3)),
    };
  });

  // ── Per-waste-type trajectories ──
  const wasteMap: Record<string, { label: string; series: { month: string; volume: number }[] }> = {};
  for (const r of wasteMonthlyRows.rows as Record<string, unknown>[]) {
    const wt = String(r.waste_type);
    if (!wasteMap[wt]) wasteMap[wt] = { label: String(r.label ?? wt), series: [] };
    wasteMap[wt].series.push({ month: String(r.month), volume: parseFloat(String(r.volume ?? 0)) });
  }

  const wasteTypeForecast = Object.entries(wasteMap).map(([wasteType, { label, series }]) => {
    const vols = series.map(s => s.volume);
    const hwWt = holtWinters(vols, 0.35, 0.12, 36); // 3 year monthly
    const regWt = linReg(vols);
    // Annual base forecast for target years
    const annualVols = targetYears.map(yr => {
      const slice = hwWt.forecast.slice((yr - 1) * 12, yr * 12);
      return { year: lastMonth.getFullYear() + yr, volume: parseFloat(slice.reduce((a, b) => a + b, 0).toFixed(1)) };
    });
    const avgMonthlyRate = hwWt.forecast.length > 0 ? hwWt.forecast.slice(0, Math.min(6, hwWt.forecast.length)).reduce((a, b) => a + b, 0) / Math.min(6, hwWt.forecast.length) : 0;
    const totalHistVol = vols.reduce((a, b) => a + b, 0);
    const annualRate = avgMonthlyRate * 12;
    return {
      wasteType, label,
      avgMonthlyMt: parseFloat(avgMonthlyRate.toFixed(2)),
      annualForecastMt: parseFloat(annualRate.toFixed(1)),
      trendSlope: parseFloat(regWt.slope.toFixed(3)),
      trendDir: regWt.slope > 0.5 ? "hausse" : regWt.slope < -0.5 ? "baisse" : "stable",
      totalHistoricalMt: parseFloat(totalHistVol.toFixed(2)),
      annualVolumes: annualVols,
    };
  });

  // ── Model summary ──
  const totalCapacity = (sitesRows.rows as Record<string, unknown>[]).reduce((s, r) => s + parseFloat(String(r.capacity ?? 0)), 0) || 180_000_000;
  const totalUsed = (sitesRows.rows as Record<string, unknown>[]).reduce((s, r) => s + parseFloat(String(r.used ?? 0)), 0);

  const modelStats = {
    algorithm: "Holt-Winters Double Smoothing + Linear Regression",
    monthlyDataPoints: n,
    alpha: 0.35,
    beta: 0.12,
    rSquared: parseFloat(volReg.rSquared.toFixed(3)),
    mape: mapeVal,
    trendDirection: trendDir,
    trendMtPerMonth: parseFloat(hw.trend.toFixed(3)),
    annualGrowthRatePct: parseFloat((annualGrowthRate * 100).toFixed(1)),
    currentLevelMt: parseFloat(hw.level.toFixed(2)),
    seasonalPatternDetected: seasonal !== null,
    totalCapacityMt: totalCapacity,
    totalUsedMt: parseFloat(totalUsed.toFixed(2)),
    globalPctUsed: totalCapacity > 0 ? parseFloat(((totalUsed / totalCapacity) * 100).toFixed(4)) : 0,
    revenueGrowthRatePct: parseFloat((revReg.slope / (revReg.intercept || 1) * 12 * 100).toFixed(1)),
  };

  res.json({
    historicalMonthly,
    forecastMonthly,
    annualForecasts,
    siteProjections,
    wasteTypeForecast,
    modelStats,
    horizonYears,
  });
});

export default router;
