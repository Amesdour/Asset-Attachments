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
