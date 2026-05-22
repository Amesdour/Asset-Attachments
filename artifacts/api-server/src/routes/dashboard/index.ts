import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

function parseFilters(query: Request["query"]) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const { dateFrom, dateTo, wasteType, site } = query;

  if (dateFrom && typeof dateFrom === "string") {
    conditions.push(`d.ts >= $${idx++}`);
    values.push(new Date(dateFrom));
  }
  if (dateTo && typeof dateTo === "string") {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(`d.ts <= $${idx++}`);
    values.push(end);
  }
  if (wasteType && typeof wasteType === "string" && wasteType !== "All") {
    conditions.push(`d.waste_type = $${idx++}`);
    values.push(wasteType);
  }
  if (site && typeof site === "string" && site !== "All") {
    conditions.push(`d.site_id = $${idx++}`);
    values.push(site);
  }

  return { conditions, values };
}

function buildWhere(conditions: string[], baseCondition = "d.status != 'cancelled'") {
  const all = [baseCondition, ...conditions];
  return all.length ? `WHERE ${all.join(" AND ")}` : "";
}

// GET /api/dashboard/kpis
router.get("/kpis", async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [curMonth, prevMonth, todayOps, capacityRow, settlementRow] = await Promise.all([
    db.execute(sql`
      SELECT COALESCE(SUM(net), 0) AS total
      FROM discharges
      WHERE status != 'cancelled' AND ts >= ${curMonthStart}
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(net), 0) AS total
      FROM discharges
      WHERE status != 'cancelled' AND ts >= ${prevMonthStart} AND ts <= ${prevMonthEnd}
    `),
    db.execute(sql`
      SELECT COUNT(DISTINCT truck) AS cnt
      FROM discharges
      WHERE ts >= ${todayStart}
    `),
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
      WHERE status != 'cancelled' AND ts >= ${curMonthStart}
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

  const prevSettlement = 72.4; // baseline for trend comparison

  res.json({
    totalWasteCurrentMonth: parseFloat(curMon.toFixed(2)),
    totalWasteLastMonth: parseFloat(prevMon.toFixed(2)),
    wasteTrend: parseFloat(wasteTrend.toFixed(1)),
    activeOperationsToday: parseInt(String(todayOps.rows[0]?.cnt ?? 0)),
    capacityUsedPercent: parseFloat(capacityUsedPercent.toFixed(4)),
    diversionRate: parseFloat(settlementRate.toFixed(1)),
    diversionRateTrend: parseFloat((settlementRate - prevSettlement).toFixed(1)),
  });
});

// GET /api/dashboard/timeseries
router.get("/timeseries", async (req: Request, res: Response): Promise<void> => {
  const rawGranularity = req.query.granularity;
  const granularity = rawGranularity === "weekly" ? "week" : "day";
  const { conditions, values } = parseFilters(req.query);
  const where = buildWhere(conditions);

  const rows = await db.execute(
    sql.raw(`
      SELECT
        to_char(date_trunc('${granularity}', d.ts), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(d.net), 0) AS "weightMt"
      FROM discharges d
      ${where}
      GROUP BY date_trunc('${granularity}', d.ts)
      ORDER BY date_trunc('${granularity}', d.ts)
    `, values)
  );

  res.json(
    rows.rows.map((r: Record<string, unknown>) => ({
      date: r.date,
      weightMt: parseFloat(parseFloat(String(r.weightMt ?? 0)).toFixed(2)),
    }))
  );
});

// GET /api/dashboard/waste-categories
router.get("/waste-categories", async (req: Request, res: Response): Promise<void> => {
  const { conditions, values } = parseFilters(req.query);
  const where = buildWhere(conditions);

  const rows = await db.execute(
    sql.raw(`
      SELECT
        COALESCE(wt.label, d.waste_type) AS category,
        COALESCE(SUM(d.net), 0) AS collected,
        COALESCE(SUM(CASE WHEN d.status IN ('settled','paid') THEN d.net ELSE 0 END), 0) AS treated
      FROM discharges d
      LEFT JOIN waste_types wt ON wt.id = d.waste_type
      ${where}
      GROUP BY d.waste_type, wt.label
      ORDER BY d.waste_type
    `, values)
  );

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
  const { conditions, values } = parseFilters(req.query);
  const where = buildWhere(conditions);

  const rows = await db.execute(
    sql.raw(`
      SELECT
        d.pay_method AS method,
        COALESCE(SUM(d.net), 0) AS value
      FROM discharges d
      ${where}
      GROUP BY d.pay_method
      ORDER BY value DESC
    `, values)
  );

  const totalResult = await db.execute(
    sql.raw(`
      SELECT COALESCE(SUM(d.net), 0) AS total
      FROM discharges d
      ${where}
    `, values)
  );

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

  const [sitesRow, monthlyRows] = await Promise.all([
    db.execute(sql`
      SELECT COALESCE(SUM(used),0) AS used, COALESCE(SUM(capacity),0) AS capacity
      FROM sites WHERE status = 'active'
    `),
    db.execute(sql`
      SELECT
        to_char(date_trunc('month', ts), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(net), 0) AS volume
      FROM discharges
      WHERE status != 'cancelled'
      GROUP BY date_trunc('month', ts)
      ORDER BY date_trunc('month', ts)
    `),
  ]);

  const capacityMax = parseFloat(String(sitesRow.rows[0]?.capacity ?? 180000000));
  const usedBase = parseFloat(String(sitesRow.rows[0]?.used ?? 0));

  const monthlyData = monthlyRows.rows.map((r: Record<string, unknown>) => ({
    month: String(r.month),
    volume: parseFloat(String(r.volume ?? 0)),
  }));

  // Build cumulative historical (starting from actual sites.used)
  let cumulative = usedBase;
  const historical = monthlyData.map((m) => {
    cumulative += m.volume;
    return { date: m.month, cumulativeVolume: parseFloat(cumulative.toFixed(2)), isForecast: false };
  });

  // Linear regression on recent monthly volumes
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

  const forecast = [];
  const lastDate = historical.length > 0
    ? new Date(historical[historical.length - 1].date)
    : new Date();
  let forecastCumulative = cumulative;
  let warningMonths: number | null = null;
  let willExceed = false;

  for (let i = 1; i <= forecastMonths; i++) {
    const projectedMonthly = Math.max(0, avgMonthly + slope * i);
    forecastCumulative += projectedMonthly;
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    const dateStr = forecastDate.toISOString().slice(0, 10);
    forecast.push({ date: dateStr, cumulativeVolume: parseFloat(forecastCumulative.toFixed(2)), isForecast: true });
    if (!willExceed && forecastCumulative >= capacityMax) {
      willExceed = true;
      warningMonths = i;
    }
  }

  res.json({
    historicalPoints: historical,
    forecastPoints: forecast,
    capacityMaxMt: capacityMax,
    warningMonths,
    willExceedCapacity: willExceed,
  });
});

// GET /api/dashboard/logs
router.get("/logs", async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"));
  const pageSize = parseInt(String(req.query.pageSize ?? "20"));
  const offset = (page - 1) * pageSize;
  const { conditions, values } = parseFilters(req.query);

  const allConditions = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countResult, logsResult] = await Promise.all([
    db.execute(sql.raw(`SELECT COUNT(*) AS cnt FROM discharges d ${allConditions}`, values)),
    db.execute(
      sql.raw(
        `SELECT d.id, d.ts, d.site_id, d.client_name, d.truck, d.waste_type,
                wt.label AS waste_label, d.gross, d.tare, d.net, d.total,
                d.status, d.pay_method, d.op_type, d.correction_reason
         FROM discharges d
         LEFT JOIN waste_types wt ON wt.id = d.waste_type
         ${allConditions}
         ORDER BY d.ts DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        values
      )
    ),
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

  const [topSiteRow, cancellationRow, payMethodRow, topClientRow] = await Promise.all([
    db.execute(sql`
      SELECT d.site_id, s.name AS site_name, COALESCE(SUM(d.net), 0) AS vol
      FROM discharges d
      LEFT JOIN sites s ON s.id = d.site_id
      WHERE d.status != 'cancelled' AND d.ts >= ${thirtyDaysAgo}
      GROUP BY d.site_id, s.name
      ORDER BY vol DESC
      LIMIT 1
    `),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(*) AS total
      FROM discharges
      WHERE ts >= ${thirtyDaysAgo}
    `),
    db.execute(sql`
      SELECT pay_method, COUNT(*) AS cnt
      FROM discharges
      WHERE status != 'cancelled' AND ts >= ${thirtyDaysAgo}
      GROUP BY pay_method
      ORDER BY cnt DESC
      LIMIT 1
    `),
    db.execute(sql`
      SELECT client_name, COALESCE(SUM(net), 0) AS vol
      FROM discharges
      WHERE status != 'cancelled' AND ts >= ${thirtyDaysAgo}
      GROUP BY client_name
      ORDER BY vol DESC
      LIMIT 1
    `),
  ]);

  const topSite = topSiteRow.rows[0] as Record<string, unknown> | undefined;
  const cancellation = cancellationRow.rows[0] as Record<string, unknown> | undefined;
  const topPayMethod = payMethodRow.rows[0] as Record<string, unknown> | undefined;
  const topClient = topClientRow.rows[0] as Record<string, unknown> | undefined;

  const cancelledCount = parseInt(String(cancellation?.cancelled ?? 0));
  const totalCount = parseInt(String(cancellation?.total ?? 1));
  const cancellationRate = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;

  const topSiteVol = parseFloat(String(topSite?.vol ?? 0));
  const topSiteName = String(topSite?.site_name ?? topSite?.site_id ?? "N/A");
  const topClientName = String(topClient?.client_name ?? "N/A");
  const topClientVol = parseFloat(String(topClient?.vol ?? 0));
  const dominantPayMethod = String(topPayMethod?.pay_method ?? "convention");

  const insights = [
    {
      category: "volume",
      title: `${topSiteName} Leading in Discharge Volume`,
      description: `${topSiteName} recorded the highest net intake over the past 30 days (${topSiteVol.toFixed(1)} t). Monitor throughput capacity and schedule additional weighbridge shifts during peak hours to reduce queue times and improve operator efficiency.`,
      severity: "info",
    },
    {
      category: "billing",
      title: cancellationRate > 15 ? "High Cancellation Rate Detected" : "Cancellation Rate Within Range",
      description: cancellationRate > 15
        ? `${cancellationRate.toFixed(1)}% of discharge records in the last 30 days were cancelled — above the 15% acceptable threshold. Review correction logs for recurring reasons and consider adding a pre-entry validation step to reduce manual errors.`
        : `Cancellation rate is ${cancellationRate.toFixed(1)}% over the last 30 days — within acceptable limits. Continue monitoring for spikes linked to specific operators or sites.`,
      severity: cancellationRate > 15 ? "warning" : "info",
    },
    {
      category: "client",
      title: `Top Client: ${topClientName}`,
      description: `${topClientName} is the highest-volume client over the last 30 days with ${topClientVol.toFixed(1)} t discharged. Verify their annual weight limit and contract terms. Consider scheduling a review meeting to plan for next season's tonnage and adjust invoice cycles if needed.`,
      severity: "info",
    },
    {
      category: "payment",
      title: dominantPayMethod === "convention" ? "Convention Billing Dominant" : `${dominantPayMethod} Payment Method Dominant`,
      description: dominantPayMethod === "convention"
        ? "Most discharges are billed under convention agreements. Ensure all convention clients have up-to-date signed contracts, verified NIF/RC numbers, and that annual weight limits are being tracked. Flag any clients approaching their tonnage ceiling for renegotiation."
        : `The '${dominantPayMethod}' payment method accounts for the most transactions. Audit prepaid balances monthly to ensure no client is operating in deficit, and reconcile cash payments against daily shift reports to prevent discrepancies.`,
      severity: "info",
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
    sites: sitesResult.rows.map((s: Record<string, unknown>) => s.id),
    siteNames: Object.fromEntries(
      sitesResult.rows.map((s: Record<string, unknown>) => [s.id, s.name])
    ),
    wasteTypes: wasteTypesResult.rows.map((w: Record<string, unknown>) => w.id),
    wasteTypeLabels: Object.fromEntries(
      wasteTypesResult.rows.map((w: Record<string, unknown>) => [w.id, w.label])
    ),
  });
});

export default router;
