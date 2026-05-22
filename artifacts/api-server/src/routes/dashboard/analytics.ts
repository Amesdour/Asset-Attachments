import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

function parseFilters(query: Request["query"]) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  const { dateFrom, dateTo, site } = query;
  if (dateFrom && typeof dateFrom === "string") { conditions.push(`d.ts >= $${idx++}`); values.push(new Date(dateFrom)); }
  if (dateTo && typeof dateTo === "string") { const e = new Date(dateTo); e.setHours(23,59,59,999); conditions.push(`d.ts <= $${idx++}`); values.push(e); }
  if (site && typeof site === "string" && site !== "All") { conditions.push(`d.site_id = $${idx++}`); values.push(site); }
  return { conditions, values };
}

function buildWhere(conditions: string[], base = "d.status != 'cancelled'") {
  return `WHERE ${[base, ...conditions].join(" AND ")}`;
}

// GET /api/dashboard/sites-breakdown
router.get("/sites-breakdown", async (req: Request, res: Response): Promise<void> => {
  const { conditions, values } = parseFilters(req.query);
  const where = buildWhere(conditions);

  const [sitesRows, dischargeRows, wasteBreakRows] = await Promise.all([
    db.execute(sql`SELECT id, name, type, region, COALESCE(capacity,0) AS capacity, COALESCE(used,0) AS used, accepted_waste FROM sites WHERE status='active' ORDER BY name`),
    db.execute(sql.raw(`
      SELECT d.site_id,
        COUNT(*) AS discharge_count,
        COALESCE(SUM(d.net), 0) AS total_weight,
        COALESCE(SUM(d.total), 0) AS total_revenue
      FROM discharges d ${where}
      GROUP BY d.site_id
    `, values)),
    db.execute(sql.raw(`
      SELECT d.site_id, d.waste_type, COALESCE(wt.label, d.waste_type) AS label,
        COALESCE(SUM(d.net),0) AS weight_mt,
        COALESCE(SUM(d.total),0) AS revenue
      FROM discharges d
      LEFT JOIN waste_types wt ON wt.id = d.waste_type
      ${where}
      GROUP BY d.site_id, d.waste_type, wt.label
      ORDER BY d.site_id, revenue DESC
    `, values)),
  ]);

  const dischargeMap: Record<string, Record<string, unknown>> = {};
  for (const r of dischargeRows.rows as Record<string, unknown>[]) {
    dischargeMap[String(r.site_id)] = r;
  }

  const wasteMap: Record<string, {wasteType: string; label: string; weightMt: number; revenue: number}[]> = {};
  for (const r of wasteBreakRows.rows as Record<string, unknown>[]) {
    const sid = String(r.site_id);
    if (!wasteMap[sid]) wasteMap[sid] = [];
    wasteMap[sid].push({
      wasteType: String(r.waste_type),
      label: String(r.label),
      weightMt: parseFloat(String(r.weight_mt ?? 0)),
      revenue: parseFloat(String(r.revenue ?? 0)),
    });
  }

  const result = (sitesRows.rows as Record<string, unknown>[]).map((s) => {
    const siteId = String(s.id);
    const d = dischargeMap[siteId] ?? {};
    const capacityMt = parseFloat(String(s.capacity ?? 0));
    const usedMt = parseFloat(String(s.used ?? 0));
    const totalWeightMt = parseFloat(String(d.total_weight ?? 0));
    const totalRevenue = parseFloat(String(d.total_revenue ?? 0));
    const dischargeCount = parseInt(String(d.discharge_count ?? 0));
    const revPerTonne = totalWeightMt > 0 ? parseFloat((totalRevenue / totalWeightMt).toFixed(0)) : 0;
    let acceptedWaste: string[] = [];
    try { acceptedWaste = JSON.parse(String(s.accepted_waste ?? "[]")); } catch {}
    return {
      siteId,
      siteName: String(s.name),
      siteType: String(s.type ?? ""),
      region: String(s.region ?? ""),
      capacityMt,
      usedMt,
      pctUsed: capacityMt > 0 ? parseFloat(((usedMt / capacityMt) * 100).toFixed(4)) : 0,
      dischargeCount,
      totalWeightMt: parseFloat(totalWeightMt.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(0)),
      revPerTonne,
      acceptedWaste,
      wasteBreakdown: wasteMap[siteId] ?? [],
    };
  });

  res.json(result);
});

// GET /api/dashboard/clients-ranking
router.get("/clients-ranking", async (req: Request, res: Response): Promise<void> => {
  const { conditions, values } = parseFilters(req.query);
  const where = buildWhere(conditions);

  const [dischargeRows, invoiceRows, clientRows] = await Promise.all([
    db.execute(sql.raw(`
      SELECT d.client_id, d.client_name,
        COUNT(*) AS discharge_count,
        COALESCE(SUM(d.net),0) AS total_weight,
        COALESCE(SUM(d.total),0) AS total_revenue,
        MAX(d.ts) AS last_discharge
      FROM discharges d ${where}
      GROUP BY d.client_id, d.client_name
      ORDER BY total_revenue DESC
    `, values)),
    db.execute(sql`
      SELECT client_id,
        COALESCE(SUM(total_amount - paid_amount),0) AS outstanding,
        MAX(status) AS latest_status
      FROM invoices
      GROUP BY client_id
    `),
    db.execute(sql`SELECT id, name, client_type, type AS pay_type, credit_limit, consumed, weight_limit_year FROM clients`),
  ]);

  const invoiceMap: Record<string, {outstanding: number; status: string}> = {};
  for (const r of invoiceRows.rows as Record<string, unknown>[]) {
    invoiceMap[String(r.client_id)] = {
      outstanding: parseFloat(String(r.outstanding ?? 0)),
      status: String(r.latest_status ?? ""),
    };
  }

  const clientMap: Record<string, Record<string, unknown>> = {};
  for (const r of clientRows.rows as Record<string, unknown>[]) {
    clientMap[String(r.id)] = r;
  }

  const result = (dischargeRows.rows as Record<string, unknown>[]).map((d) => {
    const clientId = String(d.client_id ?? "");
    const inv = invoiceMap[clientId] ?? { outstanding: 0, status: "none" };
    const cli = clientMap[clientId] ?? {};
    const totalWeightMt = parseFloat(String(d.total_weight ?? 0));
    const totalRevenue = parseFloat(String(d.total_revenue ?? 0));
    const creditLimit = parseFloat(String(cli.credit_limit ?? 0));
    const consumed = parseFloat(String(cli.consumed ?? 0));
    const weightLimitYear = parseFloat(String(cli.weight_limit_year ?? 0));
    return {
      clientId,
      clientName: String(d.client_name ?? cli.name ?? "Inconnu"),
      clientType: String(cli.client_type ?? ""),
      payType: String(cli.pay_type ?? ""),
      totalWeightMt: parseFloat(totalWeightMt.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(0)),
      dischargeCount: parseInt(String(d.discharge_count ?? 0)),
      invoiceStatus: inv.status,
      outstandingBalance: parseFloat(inv.outstanding.toFixed(0)),
      creditLimit: parseFloat(creditLimit.toFixed(0)),
      creditUsed: parseFloat(consumed.toFixed(0)),
      weightLimitYear: parseFloat(weightLimitYear.toFixed(0)),
      weightUsedYear: parseFloat(totalWeightMt.toFixed(2)),
      lastDischarge: d.last_discharge ? String(d.last_discharge) : null,
    };
  });

  res.json(result);
});

// GET /api/dashboard/operators-performance
router.get("/operators-performance", async (req: Request, res: Response): Promise<void> => {
  const { conditions, values } = parseFilters(req.query);
  const baseWhere = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [opRows, userRows] = await Promise.all([
    db.execute(sql.raw(`
      SELECT
        d.op_id,
        d.site_id,
        COUNT(*) AS discharge_count,
        COUNT(*) FILTER (WHERE d.status = 'cancelled') AS cancelled_count,
        COUNT(*) FILTER (WHERE d.correction_reason IS NOT NULL AND d.correction_reason != '') AS correction_count,
        COALESCE(SUM(CASE WHEN d.status != 'cancelled' THEN d.net ELSE 0 END),0) AS total_weight,
        COALESCE(SUM(CASE WHEN d.status != 'cancelled' THEN d.total ELSE 0 END),0) AS total_revenue,
        COALESCE(AVG(CASE WHEN d.status != 'cancelled' THEN d.net END),0) AS avg_net
      FROM discharges d ${baseWhere}
      WHERE d.op_id IS NOT NULL
      GROUP BY d.op_id, d.site_id
      ORDER BY total_weight DESC
    `, values)),
    db.execute(sql`SELECT id, name, site_id FROM users`),
  ]);

  const userMap: Record<string, string> = {};
  const userSiteMap: Record<string, string> = {};
  for (const u of userRows.rows as Record<string, unknown>[]) {
    userMap[String(u.id)] = String(u.name ?? "");
    userSiteMap[String(u.id)] = String(u.site_id ?? "");
  }

  const siteRows = await db.execute(sql`SELECT id, name FROM sites`);
  const siteMap: Record<string, string> = {};
  for (const s of siteRows.rows as Record<string, unknown>[]) { siteMap[String(s.id)] = String(s.name); }

  const result = (opRows.rows as Record<string, unknown>[]).map((r) => {
    const opId = String(r.op_id);
    const totalCount = parseInt(String(r.discharge_count ?? 0));
    const cancelledCount = parseInt(String(r.cancelled_count ?? 0));
    const siteId = String(r.site_id ?? userSiteMap[opId] ?? "");
    return {
      operatorId: opId,
      operatorName: userMap[opId] || null,
      siteName: siteMap[siteId] || siteId || null,
      dischargeCount: totalCount,
      totalWeightMt: parseFloat(parseFloat(String(r.total_weight ?? 0)).toFixed(2)),
      totalRevenue: parseFloat(parseFloat(String(r.total_revenue ?? 0)).toFixed(0)),
      cancelledCount,
      correctionCount: parseInt(String(r.correction_count ?? 0)),
      cancelRate: totalCount > 0 ? parseFloat(((cancelledCount / totalCount) * 100).toFixed(1)) : 0,
      avgNetMt: parseFloat(parseFloat(String(r.avg_net ?? 0)).toFixed(2)),
    };
  });

  res.json(result);
});

// GET /api/dashboard/revenue-breakdown
router.get("/revenue-breakdown", async (req: Request, res: Response): Promise<void> => {
  const { conditions, values } = parseFilters(req.query);
  const where = buildWhere(conditions);

  const [bySiteRows, byWasteRows, byPayRows, byClientRows, invoiceSummary] = await Promise.all([
    db.execute(sql.raw(`
      SELECT d.site_id, s.name AS site_name,
        COALESCE(SUM(d.total),0) AS revenue,
        COALESCE(SUM(d.net),0) AS weight_mt,
        COUNT(*) AS discharge_count
      FROM discharges d
      LEFT JOIN sites s ON s.id = d.site_id
      ${where}
      GROUP BY d.site_id, s.name
      ORDER BY revenue DESC
    `, values)),
    db.execute(sql.raw(`
      SELECT d.waste_type, COALESCE(wt.label, d.waste_type) AS label,
        COALESCE(SUM(d.total),0) AS revenue,
        COALESCE(SUM(d.net),0) AS weight_mt
      FROM discharges d
      LEFT JOIN waste_types wt ON wt.id = d.waste_type
      ${where}
      GROUP BY d.waste_type, wt.label
      ORDER BY revenue DESC
    `, values)),
    db.execute(sql.raw(`
      SELECT d.pay_method AS method,
        COALESCE(SUM(d.total),0) AS revenue,
        COUNT(*) AS cnt
      FROM discharges d ${where}
      GROUP BY d.pay_method
      ORDER BY revenue DESC
    `, values)),
    db.execute(sql.raw(`
      SELECT d.client_name,
        COALESCE(SUM(d.total),0) AS revenue,
        COALESCE(SUM(d.net),0) AS weight_mt,
        COUNT(*) AS cnt
      FROM discharges d ${where}
      GROUP BY d.client_name
      ORDER BY revenue DESC
      LIMIT 10
    `, values)),
    db.execute(sql`
      SELECT
        COALESCE(SUM(total_amount),0) AS total_billed,
        COALESCE(SUM(paid_amount),0) AS total_paid,
        COALESCE(SUM(total_amount - paid_amount),0) AS total_outstanding,
        COUNT(*) FILTER (WHERE status='overdue') AS overdue_count,
        COUNT(*) FILTER (WHERE status='pending') AS pending_count,
        COUNT(*) FILTER (WHERE status='paid') AS paid_count
      FROM invoices
    `),
  ]);

  const totalRevPay = (byPayRows.rows as Record<string, unknown>[]).reduce((s, r) => s + parseFloat(String(r.revenue ?? 0)), 0) || 1;

  const invSum = (invoiceSummary.rows[0] as Record<string, unknown>) ?? {};

  res.json({
    bySite: (bySiteRows.rows as Record<string, unknown>[]).map((r) => {
      const w = parseFloat(String(r.weight_mt ?? 0));
      const rev = parseFloat(String(r.revenue ?? 0));
      return { siteId: String(r.site_id), siteName: String(r.site_name ?? r.site_id), revenue: parseFloat(rev.toFixed(0)), weightMt: parseFloat(w.toFixed(2)), revPerTonne: w > 0 ? parseFloat((rev / w).toFixed(0)) : 0, dischargeCount: parseInt(String(r.discharge_count ?? 0)) };
    }),
    byWasteType: (byWasteRows.rows as Record<string, unknown>[]).map((r) => {
      const w = parseFloat(String(r.weight_mt ?? 0));
      const rev = parseFloat(String(r.revenue ?? 0));
      return { wasteType: String(r.waste_type), label: String(r.label), revenue: parseFloat(rev.toFixed(0)), weightMt: parseFloat(w.toFixed(2)), revPerTonne: w > 0 ? parseFloat((rev / w).toFixed(0)) : 0 };
    }),
    byPayMethod: (byPayRows.rows as Record<string, unknown>[]).map((r) => {
      const rev = parseFloat(String(r.revenue ?? 0));
      return { method: String(r.method ?? ""), revenue: parseFloat(rev.toFixed(0)), percent: parseFloat(((rev / totalRevPay) * 100).toFixed(1)), count: parseInt(String(r.cnt ?? 0)) };
    }),
    byClient: (byClientRows.rows as Record<string, unknown>[]).map((r) => ({ clientName: String(r.client_name ?? ""), revenue: parseFloat(parseFloat(String(r.revenue ?? 0)).toFixed(0)), weightMt: parseFloat(parseFloat(String(r.weight_mt ?? 0)).toFixed(2)), count: parseInt(String(r.cnt ?? 0)) })),
    invoiceSummary: {
      totalBilled: parseFloat(parseFloat(String(invSum.total_billed ?? 0)).toFixed(0)),
      totalPaid: parseFloat(parseFloat(String(invSum.total_paid ?? 0)).toFixed(0)),
      totalOutstanding: parseFloat(parseFloat(String(invSum.total_outstanding ?? 0)).toFixed(0)),
      overdueCount: parseInt(String(invSum.overdue_count ?? 0)),
      pendingCount: parseInt(String(invSum.pending_count ?? 0)),
      paidCount: parseInt(String(invSum.paid_count ?? 0)),
    },
  });
});

export default router;
