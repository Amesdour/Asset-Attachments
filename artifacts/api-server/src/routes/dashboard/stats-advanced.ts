import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  mean, std, median, percentile, skewness, kurtosis,
  pearsonCorr, twoSampleTTest, oneWayAnova, chiSquareTest,
  simpleLinReg, multipleLinReg,
  pca, timeSeriesDecompose,
  bayesianSequentialUpdates,
  fitNormal, fitPoisson, histogramBins,
  movingAverage, normalPDF, poissonPMF,
} from "../../lib/stats.js";

const router = Router();

router.get("/stats-advanced", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [monthlyRows, siteMonthlyRows, wasteRows, dischRows, dailyCountRows] = await Promise.all([
      db.execute(sql`
        SELECT to_char(date_trunc('week', ts), 'YYYY-MM-DD') AS month,
          COALESCE(SUM(net),0) AS volume, COALESCE(SUM(total),0) AS revenue,
          COUNT(*) AS cnt, COALESCE(AVG(net),0) AS avg_net
        FROM discharges WHERE status != 'cancelled'
        GROUP BY date_trunc('week', ts) ORDER BY 1
      `),
      db.execute(sql`
        SELECT site_id, s.name AS site_name,
          to_char(date_trunc('week', d.ts), 'YYYY-MM-DD') AS month,
          COALESCE(SUM(d.net),0) AS volume, COUNT(*) AS cnt
        FROM discharges d JOIN sites s ON s.id = d.site_id
        WHERE d.status != 'cancelled'
        GROUP BY d.site_id, s.name, date_trunc('week', d.ts) ORDER BY 1, 3
      `),
      db.execute(sql`
        SELECT d.waste_type, COALESCE(wt.l
abel, d.waste_type) AS label, d.site_id,
          COUNT(*) AS cnt, COALESCE(SUM(d.net),0) AS volume
        FROM discharges d LEFT JOIN waste_types wt ON wt.id = d.waste_type
        WHERE d.status != 'cancelled'
        GROUP BY d.waste_type, wt.label, d.site_id
      `),
      db.execute(sql`
        SELECT d.net, d.total, d.site_id, d.waste_type, d.client_name,
          to_char(d.ts, 'YYYY-MM-DD') AS day,
          to_char(date_trunc('week', d.ts), 'YYYY-MM-DD') AS month
        FROM discharges d WHERE d.status != 'cancelled' ORDER BY d.ts
      `),
      db.execute(sql`
        SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day, COUNT(*) AS cnt
        FROM discharges WHERE status != 'cancelled'
        GROUP BY date_trunc('day', ts) ORDER BY 1
      `),
    ]);
const monthly = (monthlyRows.rows as Record<string, unknown>[]).map(r => ({
      month: String(r.month),
      volume: parseFloat(String(r.volume ?? 0)),
      revenue: parseFloat(String(r.revenue ?? 0)),
      cnt: parseInt(String(r.cnt ?? 0)),
      avgNet: parseFloat(String(r.avg_net ?? 0)),
    }));

    const allDischarges = (dischRows.rows as Record<string, unknown>[]).map(r => ({
      net: parseFloat(String(r.net ?? 0)),
      total: parseFloat(String(r.total ?? 0)),
      siteId: String(r.site_id ?? ""),
      wasteType: String(r.waste_type ?? ""),
      clientName: String(r.client_name ?? ""),
      day: String(r.day ?? ""),
      month: String(r.month ?? ""),
    }));

    const dailyCounts = (dailyCountRows.rows as Record<string, unknown>[]).map(r => parseInt(String(r.cnt ?? 0)));

    const volumes = monthly.map(m => m.volume);
    const revenues = monthly.map(m => m.revenue);
    const counts = monthly.map(m => m.cnt);

    function descStats(xs: number[], label: string) {
      if (!xs.length) return { variable: label, n: 0, mean: 0, median: 0, std: 0, min: 0, max: 0, q1: 0, q3: 0, skewness: 0, kurtosis: 0, cv: 0 };
      const s = std(xs);
      const cvResult = mean(xs) > 0 ? s / mean(xs) : 0;
      return {
        variable: label, n: xs.length,
        mean: parseFloat(mean(xs).toFixed(4)),
        median: parseFloat(median(xs).toFixed(4)),
        std: parseFloat(s.toFixed(4)),
        min: parseFloat(Math.min(...xs).toFixed(4)),
        max: parseFloat(Math.max(...xs).toFixed(4)),
        q1: parseFloat(percentile(xs, 25).toFixed(4)),
        q3: parseFloat(percentile(xs, 75).toFixed(4)),
        skewness: parseFloat(skewness(xs).toFixed(4)),
        kurtosis: parseFloat(kurtosis(xs).toFixed(4)),
        cv: parseFloat(cvResult.toFixed(4)),
      };
    }

    const descriptiveStats = [
      descStats(volumes, "Volume hebdomadaire (t)"),
      descStats(revenues, "Revenus hebdomadaires (DZD)"),
      descStats(counts, "Décharges / semaine"),
      descStats(allDischarges.map(d => d.net), "Poids net par décharge (t)"),
      descStats(allDischarges.map(d => d.total), "Montant par décharge (DZD)"),
      descStats(dailyCounts, "Décharges par jour"),
    ];
