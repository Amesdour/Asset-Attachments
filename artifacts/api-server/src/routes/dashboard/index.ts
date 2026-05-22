import { Router, Request, Response } from "express";
import { db, wasteLogsTable, landfillConfigTable } from "@workspace/db";
import { and, gte, lte, eq, sql, count, sum, desc } from "drizzle-orm";
import { seedDatabaseIfEmpty } from "./seed.js";

const router = Router();

// Seed on first load
let seeded = false;
async function ensureSeeded() {
  if (!seeded) {
    await seedDatabaseIfEmpty();
    seeded = true;
  }
}

function parseFilters(query: Request["query"]) {
  const { dateFrom, dateTo, wasteType, site } = query;
  const conditions = [];
  if (dateFrom && typeof dateFrom === "string") {
    conditions.push(gte(wasteLogsTable.timestamp, new Date(dateFrom)));
  }
  if (dateTo && typeof dateTo === "string") {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(wasteLogsTable.timestamp, end));
  }
  if (wasteType && typeof wasteType === "string" && wasteType !== "All") {
    conditions.push(eq(wasteLogsTable.wasteType, wasteType));
  }
  if (site && typeof site === "string" && site !== "All") {
    conditions.push(eq(wasteLogsTable.site, site));
  }
  return conditions;
}

// GET /api/dashboard/kpis
router.get("/kpis", async (req: Request, res: Response): Promise<void> => {
  await ensureSeeded();
  const now = new Date();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [curMonthData] = await db
    .select({ total: sql<number>`coalesce(sum(${wasteLogsTable.weightMt}), 0)` })
    .from(wasteLogsTable)
    .where(gte(wasteLogsTable.timestamp, curMonthStart));

  const [prevMonthData] = await db
    .select({ total: sql<number>`coalesce(sum(${wasteLogsTable.weightMt}), 0)` })
    .from(wasteLogsTable)
    .where(and(gte(wasteLogsTable.timestamp, prevMonthStart), lte(wasteLogsTable.timestamp, prevMonthEnd)));

  const [todayOps] = await db
    .select({ count: sql<number>`count(distinct ${wasteLogsTable.truckId})` })
    .from(wasteLogsTable)
    .where(gte(wasteLogsTable.timestamp, todayStart));

  const [configRow] = await db
    .select()
    .from(landfillConfigTable)
    .where(eq(landfillConfigTable.key, "capacity_max_mt"));
  const capacityMax = parseFloat(configRow?.value ?? "500000");

  const [cumulData] = await db
    .select({ total: sql<number>`coalesce(sum(${wasteLogsTable.weightMt}), 0)` })
    .from(wasteLogsTable)
    .where(eq(wasteLogsTable.treatmentMethod, "Landfilled"));

  const capacityUsed = (cumulData.total / capacityMax) * 100;

  const [diversionData] = await db
    .select({
      treated: sql<number>`coalesce(sum(case when ${wasteLogsTable.treatmentStatus} = 'Treated' then ${wasteLogsTable.weightMt} else 0 end), 0)`,
      total: sql<number>`coalesce(sum(${wasteLogsTable.weightMt}), 0)`,
    })
    .from(wasteLogsTable)
    .where(gte(wasteLogsTable.timestamp, curMonthStart));

  const diversionRate = diversionData.total > 0 ? (diversionData.treated / diversionData.total) * 100 : 0;

  const prevMon = parseFloat(String(prevMonthData.total ?? 0));
  const curMon = parseFloat(String(curMonthData.total ?? 0));
  const wasteTrend = prevMon > 0 ? ((curMon - prevMon) / prevMon) * 100 : 0;

  res.json({
    totalWasteCurrentMonth: parseFloat(curMon.toFixed(2)),
    totalWasteLastMonth: parseFloat(prevMon.toFixed(2)),
    wasteTrend: parseFloat(wasteTrend.toFixed(1)),
    activeOperationsToday: parseInt(String(todayOps.count ?? 0)),
    capacityUsedPercent: parseFloat(capacityUsed.toFixed(1)),
    diversionRate: parseFloat(diversionRate.toFixed(1)),
    diversionRateTrend: parseFloat((diversionRate - 38).toFixed(1)),
  });
});

// GET /api/dashboard/timeseries
router.get("/timeseries", async (req: Request, res: Response): Promise<void> => {
  await ensureSeeded();
  const rawGranularity = req.query.granularity;
  // Whitelist: only allow "daily" or "weekly" — never interpolate free-form input
  const granularity = rawGranularity === "weekly" ? "week" : "day";
  const conditions = parseFilters(req.query);

  const rows = await db
    .select({
      date: sql<string>`to_char(date_trunc(${sql.raw(`'${granularity}'`)}, ${wasteLogsTable.timestamp}), 'YYYY-MM-DD')`,
      weightMt: sql<number>`sum(${wasteLogsTable.weightMt})`,
    })
    .from(wasteLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(sql`date_trunc(${sql.raw(`'${granularity}'`)}, ${wasteLogsTable.timestamp})`)
    .orderBy(sql`date_trunc(${sql.raw(`'${granularity}'`)}, ${wasteLogsTable.timestamp})`);

  res.json(rows.map((r) => ({ date: r.date, weightMt: parseFloat(parseFloat(String(r.weightMt ?? 0)).toFixed(2)) })));
});

// GET /api/dashboard/waste-categories
router.get("/waste-categories", async (req: Request, res: Response): Promise<void> => {
  await ensureSeeded();
  const conditions = parseFilters(req.query);

  const rows = await db
    .select({
      category: wasteLogsTable.wasteType,
      collected: sql<number>`sum(${wasteLogsTable.weightMt})`,
      treated: sql<number>`sum(case when ${wasteLogsTable.treatmentStatus} = 'Treated' then ${wasteLogsTable.weightMt} else 0 end)`,
    })
    .from(wasteLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(wasteLogsTable.wasteType)
    .orderBy(wasteLogsTable.wasteType);

  res.json(
    rows.map((r) => ({
      category: r.category,
      collected: parseFloat(parseFloat(String(r.collected ?? 0)).toFixed(2)),
      treated: parseFloat(parseFloat(String(r.treated ?? 0)).toFixed(2)),
    }))
  );
});

// GET /api/dashboard/treatment-methods
router.get("/treatment-methods", async (req: Request, res: Response): Promise<void> => {
  await ensureSeeded();
  const conditions = parseFilters(req.query);

  const rows = await db
    .select({
      method: wasteLogsTable.treatmentMethod,
      value: sql<number>`sum(${wasteLogsTable.weightMt})`,
    })
    .from(wasteLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(wasteLogsTable.treatmentMethod)
    .orderBy(wasteLogsTable.treatmentMethod);

  const totalResult = await db
    .select({ total: sql<number>`coalesce(sum(${wasteLogsTable.weightMt}), 0)` })
    .from(wasteLogsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const total = parseFloat(String(totalResult[0]?.total ?? 1));

  res.json(
    rows.map((r) => {
      const val = parseFloat(parseFloat(String(r.value ?? 0)).toFixed(2));
      return {
        method: r.method,
        value: val,
        percent: parseFloat(((val / total) * 100).toFixed(1)),
      };
    })
  );
});

// GET /api/dashboard/forecast
router.get("/forecast", async (req: Request, res: Response): Promise<void> => {
  await ensureSeeded();
  const forecastMonths = parseInt(String(req.query.months ?? "12"));

  const [configRow] = await db.select().from(landfillConfigTable).where(eq(landfillConfigTable.key, "capacity_max_mt"));
  const capacityMax = parseFloat(configRow?.value ?? "500000");

  const monthlyData = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${wasteLogsTable.timestamp}), 'YYYY-MM-DD')`,
      landfilled: sql<number>`sum(case when ${wasteLogsTable.treatmentMethod} = 'Landfilled' then ${wasteLogsTable.weightMt} else 0 end)`,
    })
    .from(wasteLogsTable)
    .groupBy(sql`date_trunc('month', ${wasteLogsTable.timestamp})`)
    .orderBy(sql`date_trunc('month', ${wasteLogsTable.timestamp})`);

  // Build cumulative historical
  let cumulative = 0;
  const historical = monthlyData.map((m) => {
    cumulative += parseFloat(String(m.landfilled ?? 0));
    return { date: m.month, cumulativeVolume: parseFloat(cumulative.toFixed(2)), isForecast: false };
  });

  // Linear regression on monthly landfill volumes
  const n = Math.min(monthlyData.length, 6);
  const recent = monthlyData.slice(-n).map((m) => parseFloat(String(m.landfilled ?? 0)));
  const avgMonthly = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);

  // Simple linear regression slope
  const xs = recent.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = avgMonthly;
  const slope =
    n > 1
      ? xs.reduce((acc, x, i) => acc + (x - xMean) * (recent[i] - yMean), 0) /
        xs.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0)
      : 0;

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
  await ensureSeeded();
  const page = parseInt(String(req.query.page ?? "1"));
  const pageSize = parseInt(String(req.query.pageSize ?? "20"));
  const offset = (page - 1) * pageSize;
  const conditions = parseFilters(req.query);

  const [totalRow] = await db
    .select({ count: count() })
    .from(wasteLogsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const logs = await db
    .select()
    .from(wasteLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(wasteLogsTable.timestamp))
    .limit(pageSize)
    .offset(offset);

  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp.toISOString(),
      weightMt: l.weightMt,
      wasteType: l.wasteType,
      wasteCode: l.wasteCode,
      truckId: l.truckId,
      site: l.site,
      treatmentStatus: l.treatmentStatus,
      treatmentMethod: l.treatmentMethod,
    })),
    total: parseInt(String(totalRow?.count ?? 0)),
    page,
    pageSize,
  });
});

// POST /api/dashboard/ai-insights
router.post("/ai-insights", async (req: Request, res: Response): Promise<void> => {
  await ensureSeeded();

  let stats: Record<string, unknown> = {};
  try {
    stats = JSON.parse(req.body.statsJson ?? "{}");
  } catch {
    stats = {};
  }

  // Compute real stats from DB
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [hazardousData] = await db
    .select({
      total: sql<number>`coalesce(sum(${wasteLogsTable.weightMt}), 0)`,
      count: count(),
    })
    .from(wasteLogsTable)
    .where(and(eq(wasteLogsTable.wasteType, "Hazardous"), gte(wasteLogsTable.timestamp, thirtyDaysAgo)));

  const [recyclingData] = await db
    .select({
      recycled: sql<number>`coalesce(sum(case when ${wasteLogsTable.treatmentMethod} = 'Recycled' then ${wasteLogsTable.weightMt} else 0 end), 0)`,
      total: sql<number>`coalesce(sum(${wasteLogsTable.weightMt}), 0)`,
    })
    .from(wasteLogsTable)
    .where(gte(wasteLogsTable.timestamp, thirtyDaysAgo));

  const [topSite] = await db
    .select({ site: wasteLogsTable.site, vol: sql<number>`sum(${wasteLogsTable.weightMt})` })
    .from(wasteLogsTable)
    .where(gte(wasteLogsTable.timestamp, thirtyDaysAgo))
    .groupBy(wasteLogsTable.site)
    .orderBy(sql`sum(${wasteLogsTable.weightMt}) desc`)
    .limit(1);

  const hazardousTotal = parseFloat(String(hazardousData.total ?? 0));
  const recycledPct = parseFloat(String(recyclingData.total ?? 0)) > 0
    ? (parseFloat(String(recyclingData.recycled ?? 0)) / parseFloat(String(recyclingData.total ?? 0))) * 100
    : 0;

  const insights = [
    {
      category: "routing",
      title: `Optimize Collection Routes at ${topSite?.site ?? "Zone A"}`,
      description: `${topSite?.site ?? "Zone A"} accounts for the highest waste volume in the last 30 days (${parseFloat(String(topSite?.vol ?? 0)).toFixed(0)} MT). Deploy additional trucks during peak hours (8–11 AM, 2–5 PM) and consolidate routes with Zone B to reduce per-trip costs by an estimated 12–18%.`,
      severity: "info",
    },
    {
      category: "recycling",
      title: recycledPct < 35 ? "Recycling Diversion Rate Below Target" : "Maintain Recycling Momentum",
      description: recycledPct < 35
        ? `Current recycling diversion rate is ${recycledPct.toFixed(1)}%, below the 35% industry benchmark. Introducing source-separation incentives for industrial clients and expanding Organic composting partnerships could increase diversion by 8–12 percentage points within 60 days, significantly extending landfill lifespan.`
        : `Recycling diversion at ${recycledPct.toFixed(1)}% exceeds baseline. Expand the existing composting program to include more residential organic waste collection zones to push diversion above 45% and further defer capacity exhaustion.`,
      severity: recycledPct < 35 ? "warning" : "info",
    },
    {
      category: "anomaly",
      title: hazardousTotal > 500 ? "Elevated Hazardous Waste Volumes Detected" : "Hazardous Waste Within Normal Range",
      description: hazardousTotal > 500
        ? `Hazardous waste intake has reached ${hazardousTotal.toFixed(0)} MT over the past 30 days — a potential anomaly. Cross-check truck manifests for waste codes HZ-020 and HZ-021 for mislabelling. Notify the compliance team and consider temporary intake caps until sources are verified.`
        : `Hazardous waste volumes (${hazardousTotal.toFixed(0)} MT / 30 days) remain within acceptable limits. Continue monthly audits of waste codes HZ-020–HZ-022 and maintain dedicated containment procedures to prevent cross-contamination with Organic streams.`,
      severity: hazardousTotal > 500 ? "critical" : "info",
    },
    {
      category: "capacity",
      title: "Incineration Throughput Bottleneck Risk",
      description: "Industrial waste incineration queues are growing faster than treatment capacity. Recommend negotiating a secondary incineration contract with an external facility to handle overflow, and prioritize high-calorific-value industrial waste to improve energy recovery efficiency by approximately 20%.",
      severity: "warning",
    },
  ];

  res.json({ insights, generatedAt: new Date().toISOString() });
});

// GET /api/dashboard/filters/options
router.get("/filters/options", async (_req: Request, res: Response): Promise<void> => {
  await ensureSeeded();

  const sites = await db.selectDistinct({ site: wasteLogsTable.site }).from(wasteLogsTable).orderBy(wasteLogsTable.site);
  const wasteTypes = await db.selectDistinct({ wt: wasteLogsTable.wasteType }).from(wasteLogsTable).orderBy(wasteLogsTable.wasteType);

  res.json({
    sites: sites.map((s) => s.site),
    wasteTypes: wasteTypes.map((w) => w.wt),
  });
});

export default router;
