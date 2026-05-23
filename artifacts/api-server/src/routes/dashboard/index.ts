import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql, SQL } from "drizzle-orm";
import analyticsRouter from "./analytics.js";
import forecastAdvancedRouter from "./forecast-advanced.js";
import statsAdvancedRouter from "./stats-advanced.js";

const router = Router();
router.use(analyticsRouter);
router.use(forecastAdvancedRouter);
router.use(statsAdvancedRouter);

function parseFilters(query: Request["query"]): SQL[] {
  const { dateFrom, dateTo, wasteType, site } = query;
  const conds: SQL[] = [];
  if (dateFrom && typeof dateFrom === "string") {
    conds.push(sql`d.ts >= ${new Date(dateFrom)}`);
  }
  if (dateTo && typeof dateTo === "string") {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conds.push(sql`d.ts <= ${end}`);
  }
  if (wasteType && typeof wasteType === "string" && wasteType.toLowerCase() !== "all") {
    conds.push(sql`d.waste_type = ${wasteType}`);
  }
  if (site && typeof site === "string" && site.toLowerCase() !== "all") {
    conds.push(sql`d.site_id = ${site}`);
  }
  return conds;
}

/** Same as parseFilters but without the `d.` table alias — for queries that reference `discharges` directly */
function parseFiltersNoAlias(query: Request["query"]): SQL[] {
  const { dateFrom, dateTo, wasteType, site } = query;
  const conds: SQL[] = [];
  if (dateFrom && typeof dateFrom === "string") {
    conds.push(sql`ts >= ${new Date(dateFrom)}`);
  }
  if (dateTo && typeof dateTo === "string") {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conds.push(sql`ts <= ${end}`);
  }
  if (wasteType && typeof wasteType === "string" && wasteType.toLowerCase() !== "all") {
    conds.push(sql`waste_type = ${wasteType}`);
  }
  if (site && typeof site === "string" && site.toLowerCase() !== "all") {
    conds.push(sql`site_id = ${site}`);
  }
  return conds;
}

function buildSqlWhere(userConds: SQL[], base: SQL = sql`d.status != 'cancelled'`): SQL {
  const all: SQL[] = [base, ...userConds];
  return sql`WHERE ${sql.join(all, sql` AND `)}`;
}

// GET /api/dashboard/kpis
router.get("/kpis", async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Build user filter conditions using no-alias version (queries reference discharges directly)
  const userConds = parseFiltersNoAlias(req.query);
  const hasFilters = userConds.length > 0;

  const buildKpiWhere = (periodConds: SQL[]): SQL => {
    const all: SQL[] = [sql`status != 'cancelled'`, ...periodConds, ...userConds];
    return sql`WHERE ${sql.join(all, sql` AND `)}`;
  };

  const curMonthWhere = buildKpiWhere([sql`ts >= ${curMonthStart}`]);
  const prevMonthWhere = buildKpiWhere([sql`ts >= ${prevMonthStart}`, sql`ts <= ${prevMonthEnd}`]);
  const todayWhere = buildKpiWhere([sql`ts >= ${todayStart}`]);
  const settlementWhere = buildKpiWhere([sql`ts >= ${curMonthStart}`]);
  const allTimeWhere = hasFilters ? buildKpiWhere([]) : sql`WHERE status != 'cancelled'`;

  const [curMonth, prevMonth, todayOps, capacityRow, settlementRow] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(net), 0) AS total FROM discharges ${curMonthWhere}`),
    db.execute(sql`SELECT COALESCE(SUM(net), 0) AS total FROM discharges ${prevMonthWhere}`),
    db.execute(sql`SELECT COUNT(DISTINCT truck) AS cnt FROM discharges ${todayWhere}`),
    db.execute(sql`
      SELECT COALESCE(SUM(used), 0) AS used, COALESCE(SUM(capacity), 0) AS capacity
      FROM sites
      WHERE status = 'active'
    `),
    db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('settled','paid') THEN net ELSE 0 END), 0) AS settled,
        COALESCE(SUM(net), 0) AS total
      FROM discharges
      ${settlementWhere}
    `),
  ]);

  const curMon = parseFloat(String(curMonth.rows[0]?.total ?? 0));
  const prevMon = parseFloat(String(prevMonth.rows[0]?.total ?? 0));
  const wasteTrend = prevMon > 0 ? ((curMon - prevMon) / prevMon) * 100 : 0;

  const usedCap = parseFloat(String(capacityRow.rows[0]?.used ?? 0));
  const maxCap = parseFloat(String(capacityRow.rows[0]?.capacity ?? 1));
  const capacityUsedPercent = maxCap > 0 ? (usedCap / maxCap) * 100 : 0;

  const settledVol = parseFloat(String(settlementRow.rows[0]?.settled ?? 0));
  const totalVol = parseFloat(String(settlementRow.rows[0]?.total ?? 0));
  const settlementRate = totalVol > 0 ? (settledVol / totalVol) * 100 : 0;

  const prevSettlement = 72.4;

  // Filtered global KPIs
  const [totalRevenueRow, totalDischargesRow, invoiceRow] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(total),0) AS rev, COALESCE(SUM(net),0) AS wt FROM discharges ${allTimeWhere}`),
    db.execute(sql`SELECT COUNT(*) AS cnt FROM discharges ${allTimeWhere}`),
    db.execute(sql`SELECT COALESCE(SUM(total_amount-paid_amount),0) AS outstanding, COUNT(*) FILTER (WHERE status='overdue') AS overdue FROM invoices`),
  ]);

  const totalRev = parseFloat(String(totalRevenueRow.rows[0]?.rev ?? 0));
  const totalWt = parseFloat(String(totalRevenueRow.rows[0]?.wt ?? 0));
  const totalDischarges = parseInt(String(totalDischargesRow.rows[0]?.cnt ?? 0));
  const outstanding = parseFloat(String(invoiceRow.rows[0]?.outstanding ?? 0));
  const overdueCount = parseInt(String(invoiceRow.rows[0]?.overdue ?? 0));

  res.json({
    totalWasteCurrentMonth: parseFloat(curMon.toFixed(2)),
    totalWasteLastMonth: parseFloat(prevMon.toFixed(2)),
    wasteTrend: parseFloat(wasteTrend.toFixed(1)),
    activeOperationsToday: parseInt(String(todayOps.rows[0]?.cnt ?? 0)),
    capacityUsedPercent: parseFloat(capacityUsedPercent.toFixed(4)),
    diversionRate: parseFloat(settlementRate.toFixed(1)),
    diversionRateTrend: parseFloat((settlementRate - prevSettlement).toFixed(1)),
    totalRevenue: parseFloat(totalRev.toFixed(0)),
    totalDischarges,
    avgNetWeightMt: totalDischarges > 0 ? parseFloat((totalWt / totalDischarges).toFixed(2)) : 0,
    revenuePerTonne: totalWt > 0 ? parseFloat((totalRev / totalWt).toFixed(0)) : 0,
    outstandingInvoicesTotal: parseFloat(outstanding.toFixed(0)),
    overdueInvoicesCount: overdueCount,
  });
});

// GET /api/dashboard/timeseries
router.get("/timeseries", async (req: Request, res: Response): Promise<void> => {
  const rawGranularity = req.query.granularity;
  const gran = rawGranularity === "weekly" ? "week" : "day";
  const userConds = parseFilters(req.query);
  const whereClause = buildSqlWhere(userConds);

  // date_trunc first arg must be a literal, not a bound param — use sql.raw for our controlled value
  const granLit = sql.raw(`'${gran}'`);
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc(${granLit}, d.ts), 'YYYY-MM-DD') AS date,
      COALESCE(SUM(d.net), 0) AS "weightMt"
    FROM discharges d
    ${whereClause}
    GROUP BY date_trunc(${granLit}, d.ts)
    ORDER BY date_trunc(${granLit}, d.ts)
  `);

  res.json(
    rows.rows.map((r: Record<string, unknown>) => ({
      date: r.date,
      weightMt: parseFloat(parseFloat(String(r.weightMt ?? 0)).toFixed(2)),
    }))
  );
});

// GET /api/dashboard/waste-categories
router.get("/waste-categories", async (req: Request, res: Response): Promise<void> => {
  const userConds = parseFilters(req.query);
  const whereClause = buildSqlWhere(userConds);

  const rows = await db.execute(sql`
    SELECT
      COALESCE(wt.label, d.waste_type) AS category,
      COALESCE(SUM(d.net), 0) AS collected,
      COALESCE(SUM(CASE WHEN d.status IN ('settled','paid') THEN d.net ELSE 0 END), 0) AS treated
    FROM discharges d
    LEFT JOIN waste_types wt ON wt.id = d.waste_type
    ${whereClause}
    GROUP BY d.waste_type, wt.label
    ORDER BY d.waste_type
  `);

  res.json(
    rows.rows.map((r: Record<string, unknown>) => ({
      category: r.category,
      collected: parseFloat(parseFloat(String(r.collected ?? 0)).toFixed(2)),
      treated: parseFloat(parseFloat(String(r.treated ?? 0)).toFixed(2)),
    }))
  );
});

// GET /api/dashboard/treatment-methods
router.get("/treatment-methods", async (req: Request, res: Response): Promise<void> => {
  const userConds = parseFilters(req.query);
  const whereClause = buildSqlWhere(userConds);

  const [rows, totalResult] = await Promise.all([
    db.execute(sql`
      SELECT
        d.pay_method AS method,
        COALESCE(SUM(d.net), 0) AS value
      FROM discharges d
      ${whereClause}
      GROUP BY d.pay_method
      ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(d.net), 0) AS total
      FROM discharges d
      ${whereClause}
    `),
  ]);

  const total = parseFloat(String(totalResult.rows[0]?.total ?? 1));

  res.json(
    rows.rows.map((r: Record<string, unknown>) => {
      const val = parseFloat(parseFloat(String(r.value ?? 0)).toFixed(2));
      return {
        method: String(r.method ?? "unknown"),
        value: val,
        percent: parseFloat(((val / total) * 100).toFixed(1)),
      };
    })
  );
});

// GET /api/dashboard/forecast
router.get("/forecast", async (req: Request, res: Response): Promise<void> => {
  const forecastMonths = parseInt(String(req.query.months ?? "12"));

  const [sitesRows, monthlyRows, siteMonthlyRows, revenueRows] = await Promise.all([
    db.execute(sql`
      SELECT id, name, COALESCE(used,0) AS used, COALESCE(capacity,0) AS capacity
      FROM sites WHERE status = 'active' ORDER BY name
    `),
    db.execute(sql`
      SELECT
        to_char(date_trunc('month', ts), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(net), 0) AS volume
      FROM discharges WHERE status != 'cancelled'
      GROUP BY date_trunc('month', ts)
      ORDER BY date_trunc('month', ts)
    `),
    db.execute(sql`
      SELECT
        site_id,
        to_char(date_trunc('month', ts), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(net), 0) AS volume
      FROM discharges WHERE status != 'cancelled'
      GROUP BY site_id, date_trunc('month', ts)
      ORDER BY site_id, month
    `),
    db.execute(sql`
      SELECT
        to_char(date_trunc('month', ts), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(total), 0) AS revenue
      FROM discharges WHERE status != 'cancelled'
      GROUP BY date_trunc('month', ts)
      ORDER BY date_trunc('month', ts)
    `),
  ]);

  const totalUsed = (sitesRows.rows as Record<string, unknown>[]).reduce((s, r) => s + parseFloat(String(r.used ?? 0)), 0);
  const capacityMax = (sitesRows.rows as Record<string, unknown>[]).reduce((s, r) => s + parseFloat(String(r.capacity ?? 0)), 0) || 180000000;

  const monthlyData = (monthlyRows.rows as Record<string, unknown>[]).map((r) => ({
    month: String(r.month),
    volume: parseFloat(String(r.volume ?? 0)),
  }));

  // Aggregate monthly volume for regression
  const n = Math.min(monthlyData.length, 6);
  const recent = monthlyData.slice(-n).map((m) => m.volume);
  const avgMonthly = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const xs = recent.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / (n || 1);
  const yMean = avgMonthly;
  const slopeDenom = xs.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);
  const slope = slopeDenom > 0
    ? xs.reduce((acc, x, i) => acc + (x - xMean) * (recent[i] - yMean), 0) / slopeDenom
    : 0;

  let cumulative = totalUsed;
  const historical = monthlyData.map((m) => {
    cumulative += m.volume;
    return { date: m.month, cumulativeVolume: parseFloat(cumulative.toFixed(2)), isForecast: false };
  });

  const forecast = [];
  const lastDate = historical.length > 0 ? new Date(historical[historical.length - 1].date) : new Date();
  let forecastCumulative = cumulative;
  let warningMonths: number | null = null;
  let willExceed = false;

  for (let i = 1; i <= forecastMonths; i++) {
    const projectedMonthly = Math.max(0, avgMonthly + slope * i);
    forecastCumulative += projectedMonthly;
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    forecast.push({ date: forecastDate.toISOString().slice(0, 10), cumulativeVolume: parseFloat(forecastCumulative.toFixed(2)), isForecast: true });
    if (!willExceed && forecastCumulative >= capacityMax) { willExceed = true; warningMonths = i; }
  }

  // Per-site projections
  const siteMonthlyMap: Record<string, number[]> = {};
  for (const r of siteMonthlyRows.rows as Record<string, unknown>[]) {
    const sid = String(r.site_id);
    if (!siteMonthlyMap[sid]) siteMonthlyMap[sid] = [];
    siteMonthlyMap[sid].push(parseFloat(String(r.volume ?? 0)));
  }

  const siteProjections = (sitesRows.rows as Record<string, unknown>[]).map((s) => {
    const siteId = String(s.id);
    const siteName = String(s.name);
    const usedMt = parseFloat(String(s.used ?? 0));
    const capacityMt = parseFloat(String(s.capacity ?? 0));
    const pctUsed = capacityMt > 0 ? parseFloat(((usedMt / capacityMt) * 100).toFixed(4)) : 0;
    const months = siteMonthlyMap[siteId] ?? [];
    const monthlyRateMt = months.length > 0
      ? parseFloat((months.reduce((a, b) => a + b, 0) / months.length).toFixed(2))
      : 0;
    const remaining = capacityMt - usedMt;
    const yearsUntilFull = monthlyRateMt > 0
      ? parseFloat(((remaining / monthlyRateMt) / 12).toFixed(1))
      : 9999;
    return { siteId, siteName, usedMt, capacityMt, pctUsed, monthlyRateMt, yearsUntilFull };
  });

  // Revenue historical + forecast
  const revenueData = (revenueRows.rows as Record<string, unknown>[]).map((r) => ({
    month: String(r.month),
    revenue: parseFloat(String(r.revenue ?? 0)),
  }));
  const revenueHistorical = revenueData.map((r) => ({ date: r.month, revenue: r.revenue, isForecast: false }));

  const avgRevenue = revenueData.length > 0
    ? revenueData.slice(-Math.min(3, revenueData.length)).reduce((a, b) => a + b.revenue, 0) / Math.min(3, revenueData.length)
    : 0;

  const revenueForecast = [];
  const lastRevDate = revenueHistorical.length > 0 ? new Date(revenueHistorical[revenueHistorical.length - 1].date) : new Date();
  for (let i = 1; i <= forecastMonths; i++) {
    const fd = new Date(lastRevDate);
    fd.setMonth(fd.getMonth() + i);
    revenueForecast.push({ date: fd.toISOString().slice(0, 10), revenue: parseFloat((avgRevenue * (1 + 0.005 * i)).toFixed(0)), isForecast: true });
  }

  res.json({
    historicalPoints: historical,
    forecastPoints: forecast,
    capacityMaxMt: capacityMax,
    warningMonths,
    willExceedCapacity: willExceed,
    siteProjections,
    revenueHistorical,
    revenueForecast,
  });
});

// GET /api/dashboard/logs
router.get("/logs", async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"));
  const pageSize = parseInt(String(req.query.pageSize ?? "20"));
  const offset = (page - 1) * pageSize;
  const userConds = parseFilters(req.query);
  // Logs show all statuses — no base status filter
  const whereClause = userConds.length > 0
    ? sql`WHERE ${sql.join(userConds, sql` AND `)}`
    : sql``;

  const [countResult, logsResult] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) AS cnt FROM discharges d ${whereClause}`),
    db.execute(sql`
      SELECT d.id, d.ts, d.site_id, d.client_name, d.truck, d.waste_type,
             wt.label AS waste_label, d.gross, d.tare, d.net, d.total,
             d.status, d.pay_method, d.op_type, d.correction_reason
      FROM discharges d
      LEFT JOIN waste_types wt ON wt.id = d.waste_type
      ${whereClause}
      ORDER BY d.ts DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
  ]);

  res.json({
    logs: logsResult.rows.map((l: Record<string, unknown>) => ({
      id: l.id,
      timestamp: l.ts,
      weightMt: parseFloat(String(l.net ?? 0)),
      wasteType: l.waste_label ?? l.waste_type,
      wasteCode: l.waste_type,
      truckId: l.truck,
      site: l.site_id,
      treatmentStatus: l.status,
      treatmentMethod: l.op_type,
      clientName: l.client_name,
      payMethod: l.pay_method,
      gross: parseFloat(String(l.gross ?? 0)),
      tare: parseFloat(String(l.tare ?? 0)),
      total: parseFloat(String(l.total ?? 0)),
      correctionReason: l.correction_reason,
    })),
    total: parseInt(String(countResult.rows[0]?.cnt ?? 0)),
    page,
    pageSize,
  });
});

// POST /api/dashboard/ai-insights
router.post("/ai-insights", async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    overdueRow,
    debtorsRow,
    totalRevenueRow,
    cancellationRow,
    baselineCancellationRow,
    correctionReasonRow,
    weightLimitRow,
    siteRevenueRow,
    sitesCapacityRow,
    siteMonthlyRateRow,
    operatorCancelRow,
    wasteRevenueRow,
  ] = await Promise.all([
    // Overdue & unpaid invoices — summary
    db.execute(sql`
      SELECT
        COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS outstanding,
        COUNT(*) FILTER (WHERE i.status = 'overdue') AS overdue_count,
        COUNT(*) FILTER (WHERE i.status = 'pending') AS pending_count
      FROM invoices i
      WHERE i.status IN ('overdue', 'pending')
    `),
    // Top debtors list
    db.execute(sql`
      SELECT c.name, ROUND((i.total_amount - i.paid_amount)::numeric, 0) AS owed
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.status IN ('overdue', 'pending')
      ORDER BY (i.total_amount - i.paid_amount) DESC
      LIMIT 3
    `),
    // Total revenue (for relative finance threshold)
    db.execute(sql`
      SELECT COALESCE(SUM(total), 0) AS total_rev
      FROM discharges
      WHERE status != 'cancelled'
    `),
    // 30-day cancellation rate + top cancelled operator
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(*) AS total,
        MODE() WITHIN GROUP (ORDER BY CASE WHEN status = 'cancelled' THEN op_id END) AS top_cancel_op
      FROM discharges
      WHERE ts >= ${thirtyDaysAgo}
    `),
    // 90-day baseline cancellation rate (for dynamic threshold)
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(*) AS total
      FROM discharges
      WHERE ts >= ${ninetyDaysAgo}
    `),
    // Most frequent correction_reason in last 30 days
    db.execute(sql`
      SELECT correction_reason, COUNT(*) AS cnt
      FROM discharges
      WHERE ts >= ${thirtyDaysAgo}
        AND correction_reason IS NOT NULL
        AND correction_reason != ''
      GROUP BY correction_reason
      ORDER BY cnt DESC
      LIMIT 1
    `),
    // Clients approaching or over annual weight limit
    db.execute(sql`
      SELECT c.name, c.weight_limit_year,
        COALESCE(SUM(d.net), 0) AS discharged_t
      FROM clients c
      JOIN discharges d ON d.client_id = c.id
      WHERE c.weight_limit_year > 0 AND d.status != 'cancelled'
      GROUP BY c.id, c.name, c.weight_limit_year
      HAVING COALESCE(SUM(d.net), 0) >= (c.weight_limit_year * 0.7)
      ORDER BY (COALESCE(SUM(d.net), 0) / c.weight_limit_year) DESC
      LIMIT 3
    `),
    // Site performance: revenue per tonne (ordered by rev_per_t for gap calc)
    db.execute(sql`
      SELECT d.site_id, s.name,
        COALESCE(SUM(d.net), 0) AS total_t,
        COALESCE(SUM(d.total), 0) AS total_rev,
        CASE WHEN SUM(d.net) > 0 THEN ROUND((SUM(d.total)/SUM(d.net))::numeric, 0) ELSE 0 END AS rev_per_t
      FROM discharges d
      JOIN sites s ON s.id = d.site_id
      WHERE d.status != 'cancelled'
      GROUP BY d.site_id, s.name
      ORDER BY rev_per_t DESC
    `),
    // Sites capacity data for dynamic capacity analysis
    db.execute(sql`
      SELECT id, name,
        COALESCE(capacity, 0) AS capacity,
        COALESCE(used, 0) AS used
      FROM sites
      WHERE status = 'active'
      ORDER BY name
    `),
    // Average monthly discharge volume per site (for yearsUntilFull)
    db.execute(sql`
      SELECT site_id,
        COALESCE(SUM(net), 0) /
          GREATEST(
            EXTRACT(EPOCH FROM (MAX(ts) - MIN(ts))) / 2592000,
            1
          ) AS monthly_rate_t
      FROM discharges
      WHERE status != 'cancelled'
      GROUP BY site_id
    `),
    // Operator with highest cancellation rate (30 days)
    db.execute(sql`
      SELECT op_id,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(*) AS total,
        ROUND((COUNT(*) FILTER (WHERE status = 'cancelled') * 100.0 / COUNT(*))::numeric, 1) AS cancel_rate
      FROM discharges
      WHERE ts >= ${thirtyDaysAgo} AND op_id IS NOT NULL
      GROUP BY op_id
      HAVING COUNT(*) >= 3
      ORDER BY cancel_rate DESC
      LIMIT 1
    `),
    // Revenue by waste type (ordered by rev_per_t for gap calc)
    db.execute(sql`
      SELECT wt.label, d.waste_type,
        COALESCE(SUM(d.net), 0) AS total_t,
        COALESCE(SUM(d.total), 0) AS total_rev,
        CASE WHEN SUM(d.net) > 0 THEN ROUND((SUM(d.total)/SUM(d.net))::numeric, 0) ELSE 0 END AS rev_per_t
      FROM discharges d
      LEFT JOIN waste_types wt ON wt.id = d.waste_type
      WHERE d.status != 'cancelled'
      GROUP BY d.waste_type, wt.label
      ORDER BY rev_per_t DESC
    `),
  ]);

  // ── Finance ──────────────────────────────────────────────────────────────────
  const overdue = overdueRow.rows[0] as Record<string, unknown>;
  const debtors = debtorsRow.rows as Record<string, unknown>[];
  const outstandingAmt = parseFloat(String(overdue?.outstanding ?? 0));
  const overdueCount = parseInt(String(overdue?.overdue_count ?? 0));
  const debtorList = debtors.map((d) => `${String(d.name ?? "Unknown")} (${Number(d.owed ?? 0).toLocaleString("fr-DZ")} DZD)`).join(", ");

  const totalRev = parseFloat(String((totalRevenueRow.rows[0] as Record<string, unknown>)?.total_rev ?? 0));
  const outstandingPct = totalRev > 0 ? (outstandingAmt / totalRev) * 100 : 0;
  const financeSeverity = outstandingPct > 10 ? "critical" : outstandingPct > 5 ? "warning" : "info";

  // ── Operations ───────────────────────────────────────────────────────────────
  const cancellation = cancellationRow.rows[0] as Record<string, unknown>;
  const baseline = baselineCancellationRow.rows[0] as Record<string, unknown>;
  const opCancel = operatorCancelRow.rows[0] as Record<string, unknown> | undefined;
  const topCorrection = correctionReasonRow.rows[0] as Record<string, unknown> | undefined;

  const cancelledCount = parseInt(String(cancellation?.cancelled ?? 0));
  const totalCount = parseInt(String(cancellation?.total ?? 1));
  const cancellationRate = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;

  const baselineCancelled = parseInt(String(baseline?.cancelled ?? 0));
  const baselineTotal = parseInt(String(baseline?.total ?? 1));
  const baselineRate = baselineTotal > 0 ? (baselineCancelled / baselineTotal) * 100 : 0;
  // Dynamic threshold: warn if current 30-day rate exceeds 90-day baseline by 5pp or 50% relative
  const cancelThresholdExceeded = cancellationRate > baselineRate + 5 || cancellationRate > baselineRate * 1.5;
  const opCancelRate = parseFloat(String(opCancel?.cancel_rate ?? 0));
  const opCancelId = String(opCancel?.op_id ?? "");
  const topCorrectionReason = topCorrection ? String(topCorrection.correction_reason ?? "") : null;
  const topCorrectionCount = topCorrection ? parseInt(String(topCorrection.cnt ?? 0)) : 0;

  // ── Compliance ───────────────────────────────────────────────────────────────
  const weightLimitClients = weightLimitRow.rows as Record<string, unknown>[];

  // ── Revenue by site ───────────────────────────────────────────────────────────
  const siteRevRows = siteRevenueRow.rows as Record<string, unknown>[];
  // Ordered by rev_per_t DESC — top is best performer
  const topSiteByRpt = siteRevRows[0];
  const bottomSiteByRpt = siteRevRows[siteRevRows.length - 1];
  const topRpt = parseFloat(String(topSiteByRpt?.rev_per_t ?? 0));
  const bottomRpt = parseFloat(String(bottomSiteByRpt?.rev_per_t ?? 0));
  const rptGapPct = topRpt > 0 && bottomRpt < topRpt
    ? parseFloat(((topRpt - bottomRpt) / topRpt * 100).toFixed(0))
    : 0;
  // Best revenue site (by total_rev) for metric display
  const topRevSite = [...siteRevRows].sort((a, b) => parseFloat(String(b.total_rev ?? 0)) - parseFloat(String(a.total_rev ?? 0)))[0];

  // ── Revenue by waste type ─────────────────────────────────────────────────────
  const wasteRevRows = wasteRevenueRow.rows as Record<string, unknown>[];
  // Ordered by rev_per_t DESC
  const topWaste = wasteRevRows[0];
  const bottomWaste = wasteRevRows[wasteRevRows.length - 1];
  const wasteRptGap = topWaste && bottomWaste && topWaste.waste_type !== bottomWaste.waste_type
    ? parseFloat(String(topWaste.rev_per_t ?? 0)) - parseFloat(String(bottomWaste.rev_per_t ?? 0))
    : 0;

  // ── Capacity ─────────────────────────────────────────────────────────────────
  const sitesCapacity = sitesCapacityRow.rows as Record<string, unknown>[];
  const monthlyRateMap: Record<string, number> = {};
  for (const r of siteMonthlyRateRow.rows as Record<string, unknown>[]) {
    monthlyRateMap[String(r.site_id)] = parseFloat(String(r.monthly_rate_t ?? 0));
  }

  const siteCapacityDetails = sitesCapacity.map((s) => {
    const capacity = parseFloat(String(s.capacity ?? 0));
    const used = parseFloat(String(s.used ?? 0));
    const pctUsed = capacity > 0 ? (used / capacity) * 100 : 0;
    const monthlyRate = monthlyRateMap[String(s.id)] ?? 0;
    const remaining = capacity - used;
    const yearsUntilFull = monthlyRate > 0 ? remaining / monthlyRate / 12 : Infinity;
    return { id: String(s.id), name: String(s.name), capacity, used, pctUsed, yearsUntilFull };
  });

  const criticalSites = siteCapacityDetails.filter((s) => s.pctUsed >= 80);
  const warningSites = siteCapacityDetails.filter((s) => s.pctUsed >= 60 && s.pctUsed < 80);
  const capacitySeverity = criticalSites.length > 0 ? "critical" : warningSites.length > 0 ? "warning" : "info";

  const totalCapacity = siteCapacityDetails.reduce((s, r) => s + r.capacity, 0);
  const totalUsed = siteCapacityDetails.reduce((s, r) => s + r.used, 0);
  const overallPct = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

  const insights = [
    // 1. Factures impayées — severity relative to total revenue
    {
      category: "finance",
      severity: financeSeverity,
      title: outstandingAmt > 0
        ? `${outstandingAmt.toLocaleString("fr-DZ")} DZD en attente de règlement (${outstandingPct.toFixed(1)}% du CA)`
        : "Toutes les factures sont réglées",
      metric: outstandingAmt > 0 ? `${outstandingAmt.toLocaleString("fr-DZ")} DZD` : "0 DZD",
      description: outstandingAmt > 0
        ? `${overdueCount} facture(s) en retard représentant ${outstandingPct.toFixed(1)}% du chiffre d'affaires total (${totalRev.toLocaleString("fr-DZ")} DZD). Clients avec soldes impayés : ${debtorList || "voir tableau de facturation"}. ${outstandingPct > 10 ? "Seuil critique dépassé — escalader immédiatement à la direction financière." : "Surveiller et relancer les clients concernés."}`
        : "Toutes les factures clients sont réglées. Aucun solde impayé détecté.",
      action: outstandingAmt > 0
        ? `Bloquer les décharges pour les clients en retard & escalader à la direction financière (${outstandingPct.toFixed(1)}% du CA impayé)`
        : "Aucune action requise",
    },
    // 2. Taux d'annulation — dynamic threshold vs 90-day baseline, with top correction reason
    {
      category: "operations",
      severity: cancelThresholdExceeded ? "warning" : "info",
      title: cancelThresholdExceeded
        ? `Taux d'annulation ${cancellationRate.toFixed(1)}% — Au-dessus de la moyenne (${baselineRate.toFixed(1)}% sur 90j)`
        : `Taux d'annulation : ${cancellationRate.toFixed(1)}% (base 90j : ${baselineRate.toFixed(1)}%)`,
      metric: `${cancellationRate.toFixed(1)}% annulés (30j)`,
      description: cancelThresholdExceeded
        ? `${cancelledCount} sur ${totalCount} bons de décharge annulés ces 30 derniers jours — au-dessus de la référence 90j de ${baselineRate.toFixed(1)}%.${topCorrectionReason ? ` Motif de correction le plus fréquent : "${topCorrectionReason}" (${topCorrectionCount} occurrences).` : ""} ${opCancelId ? `L'opérateur ${opCancelId} affiche le taux le plus élevé à ${opCancelRate}%.` : ""} Ajouter des codes de raison obligatoires pour réduire les erreurs de saisie.`
        : `${cancelledCount} sur ${totalCount} décharges annulées. Taux dans la plage normale (référence 90j : ${baselineRate.toFixed(1)}%).${topCorrectionReason ? ` Motif principal signalé : "${topCorrectionReason}" (${topCorrectionCount} cas).` : ""}${opCancelId && opCancelRate > 30 ? ` Surveiller l'opérateur ${opCancelId} (taux : ${opCancelRate}%).` : ""}`,
      action: cancelThresholdExceeded
        ? `Auditer les saisies des opérateurs — réviser les ${cancelledCount} bons annulés${topCorrectionReason ? ` (motif principal : "${topCorrectionReason}")` : ""}`
        : "Surveiller mensuellement",
    },
    // 3. Limites de tonnage — proactive recommendation when clear
    {
      category: "compliance",
      severity: weightLimitClients.length > 0 ? "warning" : "info",
      title: weightLimitClients.length > 0
        ? `${weightLimitClients.length} client(s) proche(s) de la limite de tonnage annuel`
        : "Tous les clients dans les limites de tonnage annuel",
      metric: weightLimitClients.length > 0
        ? `${weightLimitClients.map((c) => `${String(c.name).split(" ")[0]}: ${parseFloat(String(c.discharged_t ?? 0)).toFixed(0)}/${parseFloat(String(c.weight_limit_year ?? 0)).toFixed(0)} t`).join(" · ")}`
        : "Aucun dépassement",
      description: weightLimitClients.length > 0
        ? `Les clients suivants ont consommé ≥70% de leur limite de tonnage annuel : ${weightLimitClients.map((c) => `${c.name} (${parseFloat(String(c.discharged_t ?? 0)).toFixed(0)} t sur ${parseFloat(String(c.weight_limit_year ?? 0)).toFixed(0)} t autorisées, soit ${((parseFloat(String(c.discharged_t ?? 0)) / parseFloat(String(c.weight_limit_year ?? 1))) * 100).toFixed(0)}%)`).join(" ; ")}. Contacter ces clients pour renégocier les termes contractuels ou réduire la fréquence hebdomadaire de décharge avant d'atteindre la limite.`
        : "Aucun client n'approche ses limites de tonnage annuelles. Recommandation proactive : planifier les révisions contractuelles avant la fin de l'année civile pour ajuster les quotas selon l'évolution des volumes et prévenir tout litige en début d'exercice.",
      action: weightLimitClients.length > 0
        ? "Contacter les clients pour renégocier les limites avant dépassement"
        : "Planifier les révisions de contrats avant fin d'année pour ajuster les quotas tonnage",
    },
    // 4. Performance financière par site — includes rev/tonne gap %
    {
      category: "revenue",
      severity: rptGapPct > 40 ? "warning" : "info",
      title: topSiteByRpt
        ? `${String(topSiteByRpt.name)} — Meilleur tarif au tonne (${parseFloat(String(topSiteByRpt.rev_per_t ?? 0)).toLocaleString()} DZD/t)`
        : "Aperçu des revenus par site",
      metric: topRevSite ? `${parseFloat(String(topRevSite.total_rev ?? 0)).toLocaleString("fr-DZ")} DZD · ${parseFloat(String(topRevSite.rev_per_t ?? 0)).toLocaleString()} DZD/t` : "N/D",
      description: topSiteByRpt
        ? `${String(topSiteByRpt.name)} génère ${parseFloat(String(topSiteByRpt.rev_per_t ?? 0)).toLocaleString()} DZD/t — le meilleur tarif parmi les sites actifs.${bottomSiteByRpt && bottomSiteByRpt.site_id !== topSiteByRpt.site_id ? ` ${String(bottomSiteByRpt.name)} affiche le tarif le plus bas à ${parseFloat(String(bottomSiteByRpt.rev_per_t ?? 0)).toLocaleString()} DZD/t — un écart de ${rptGapPct}% entre le meilleur et le moins performant. ${rptGapPct > 40 ? "Cet écart important justifie une révision tarifaire urgente sur les sites sous-performants." : "Envisager une harmonisation tarifaire ou une redirection des flux industriels vers les sites à fort rendement."}` : ""}`
        : "Données insuffisantes pour la comparaison des revenus par site.",
      action: rptGapPct > 0
        ? `Réviser la grille tarifaire de ${String(bottomSiteByRpt?.name ?? "site sous-performant")} — écart de ${rptGapPct}% vs meilleur site`
        : "Réviser les grilles tarifaires des sites les moins performants",
    },
    // 5. Revenus par type de déchet — specific waste type recommendation with gap
    {
      category: "revenue",
      severity: wasteRptGap > 1000 ? "warning" : "info",
      title: topWaste
        ? `${String(topWaste.label ?? topWaste.waste_type)} — Type de déchet le plus rentable`
        : "Analyse des revenus par type de déchet",
      metric: topWaste ? `${parseFloat(String(topWaste.rev_per_t ?? 0)).toLocaleString()} DZD/t` : "N/D",
      description: wasteRevRows.length > 0
        ? `Tarifs par type de déchet : ${wasteRevRows.map((w) => `${String(w.label ?? w.waste_type)} : ${parseFloat(String(w.rev_per_t ?? 0)).toLocaleString()} DZD/t (${parseFloat(String(w.total_t ?? 0)).toFixed(0)} t)`).join(" · ")}.${wasteRptGap > 0 ? ` Prioriser l'attraction de ${String(topWaste?.label ?? "flux à haute valeur")} : il génère ${wasteRptGap.toLocaleString("fr-DZ")} DZD/t de plus que ${String(bottomWaste?.label ?? "le flux le moins rentable")}. Cibler les industriels et collectivités produisant ce type de déchet pour maximiser le revenu par décharge.` : ""}`
        : "Aucune donnée de revenus par type de déchet disponible.",
      action: topWaste
        ? `Cibler l'attraction de "${String(topWaste.label ?? topWaste.waste_type)}" — ${parseFloat(String(topWaste.rev_per_t ?? 0)).toLocaleString()} DZD/t (écart de +${wasteRptGap.toLocaleString()} DZD/t vs type le moins rentable)`
        : "Cibler les clients industriels pour augmenter le revenu moyen par tonne",
    },
    // 6. Capacité — fully dynamic, no hardcoded conclusions
    {
      category: "capacity",
      severity: capacitySeverity,
      title: criticalSites.length > 0
        ? `${criticalSites.length} site(s) à capacité critique (≥80% utilisée)`
        : warningSites.length > 0
          ? `${warningSites.length} site(s) approchant la saturation (≥60% utilisée)`
          : `Capacité globale saine — ${overallPct.toFixed(1)}% utilisée`,
      metric: `${overallPct.toFixed(1)}% capacité globale utilisée (${totalUsed.toLocaleString("fr-DZ")} / ${totalCapacity.toLocaleString("fr-DZ")} t)`,
      description: siteCapacityDetails.length > 0
        ? `État des sites : ${siteCapacityDetails.map((s) => `${s.name} : ${s.pctUsed.toFixed(1)}% utilisée${s.yearsUntilFull !== Infinity ? `, ~${s.yearsUntilFull.toFixed(1)} ans restants` : ", débit insuffisant pour estimer"}`).join(" · ")}.${criticalSites.length > 0 ? ` CRITIQUE : ${criticalSites.map((s) => `${s.name} (${s.pctUsed.toFixed(1)}%)`).join(", ")} nécessite une planification d'extension ou de redirection des flux immédiate.` : warningSites.length > 0 ? ` Surveiller : ${warningSites.map((s) => `${s.name} (${s.pctUsed.toFixed(1)}%)`).join(", ")} — planifier une extension dans les 12 prochains mois.` : " Tous les sites disposent d'une capacité résiduelle confortable. Maintenir les audits infrastructurels annuels et la gestion du lixiviat."}`
        : "Données de capacité insuffisantes.",
      action: criticalSites.length > 0
        ? `Planifier extension ou redirection de flux pour : ${criticalSites.map((s) => `${s.name} (${s.pctUsed.toFixed(1)}%)`).join(", ")}`
        : warningSites.length > 0
          ? `Préparer plan d'extension pour : ${warningSites.map((s) => s.name).join(", ")}`
          : "Planifier les audits de conformité environnementale annuels par site",
    },
  ];

  res.json({ insights, generatedAt: new Date().toISOString() });
});

// GET /api/dashboard/filters/options
router.get("/filters/options", async (_req: Request, res: Response): Promise<void> => {
  const [sitesResult, wasteTypesResult] = await Promise.all([
    db.execute(sql`SELECT id, name FROM sites WHERE status = 'active' ORDER BY name`),
    db.execute(sql`SELECT id, label FROM waste_types ORDER BY label`),
  ]);

  res.json({
    sites: sitesResult.rows.map((s: Record<string, unknown>) => ({ id: s.id, name: s.name })),
    wasteTypes: wasteTypesResult.rows.map((w: Record<string, unknown>) => ({ id: w.id, label: w.label })),
  });
});

export { router as dashboardRouter };
export default router;
