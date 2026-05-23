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
const normalFitVol = volumes.length >= 2 ? fitNormal(volumes) : { mu: 0, sigma: 1, logLikelihood: 0 };
    const poissonFitDay = dailyCounts.length >= 1 ? fitPoisson(dailyCounts) : { lambda: 0, logLikelihood: 0 };
    const poissonFitMonth = counts.length >= 1 ? fitPoisson(counts) : { lambda: 0, logLikelihood: 0 };

    const netWeights = allDischarges.map(d => d.net);
    const histogram = netWeights.length >= 2 ? histogramBins(netWeights, 12).map(b => ({
      ...b,
      normalPdf: normalPDF(b.binStart + (b.binEnd - b.binStart) / 2, normalFitVol.mu, Math.max(normalFitVol.sigma, 0.01)),
      poissonPmf: 0,
    })) : [];

    const maxDailyCount = dailyCounts.length ? Math.max(...dailyCounts, 10) : 10;
    const poissonHistogram = Array.from({ length: maxDailyCount + 1 }, (_, k) => ({
      k, observed: dailyCounts.filter(c => c === k).length,
      poissonPmf: parseFloat(poissonPMF(k, poissonFitDay.lambda).toFixed(6)),
    })).filter(b => b.observed > 0 || b.poissonPmf > 0.01);

    const totalDischarges = allDischarges.length;
    const workingDaysEstimate = 250;
    const pBinom = Math.min(totalDischarges / workingDaysEstimate, 0.99);
    const binomialN = 5;
    const binomialDist = Array.from({ length: binomialN + 1 }, (_, k) => {
      const coeff = Array.from({ length: k }, (_, i) => (binomialN - i) / (i + 1)).reduce((a, b) => a * b, 1);
      const pmf2 = coeff * Math.pow(pBinom, k) * Math.pow(1 - pBinom, binomialN - k);
      return { k, pmf: parseFloat(pmf2.toFixed(6)), label: `${k} décharges` };
    });

    const corrVars = [
      { name: "Volume (t)", data: volumes },
      { name: "Revenus (DZD)", data: revenues },
      { name: "N° décharges", data: counts },
      { name: "Moy. net/décharge", data: monthly.map(m => m.avgNet) },
    ];

    const correlationMatrix: { var1: string; var2: string; r: number; pValue: number; tStat: number; df: number; significant: boolean }[] = [];
    if (volumes.length >= 3) {
      for (let i = 0; i < corrVars.length; i++) {
        for (let j = i + 1; j < corrVars.length; j++) {
          const { r, pValue, tStat, df } = pearsonCorr(corrVars[i].data, corrVars[j].data);
          correlationMatrix.push({ var1: corrVars[i].name, var2: corrVars[j].name, r, pValue, tStat, df, significant: pValue < 0.05 });
        }
      }
    }

    const corrNames = corrVars.map(v => v.name);
    const corrMatrix2D = corrVars.map(v1 => corrVars.map(v2 => {
      if (v1.name === v2.name) return 1;
      const found = correlationMatrix.find(c => (c.var1 === v1.name && c.var2 === v2.name) || (c.var1 === v2.name && c.var2 === v1.name));
      return found?.r ?? 0;
    }));

    const simpleRegressions = volumes.length >= 2 ? [
      { xVar: "Semaine (index)", yVar: "Volume (t)", ...simpleLinReg(volumes.map((_, i) => i), volumes) },
      { xVar: "Volume (t)", yVar: "Revenus (DZD)", ...simpleLinReg(volumes, revenues) },
      { xVar: "N° décharges", yVar: "Volume (t)", ...simpleLinReg(counts, volumes) },
      { xVar: "Semaine (index)", yVar: "Revenus (DZD)", ...simpleLinReg(revenues.map((_, i) => i), revenues) },
    ].map(r => ({ ...r, predicted: undefined })) : [];

    const X = monthly.map((m, i) => [m.cnt, m.avgNet, i]);
    const mulReg = monthly.length >= 4 ? multipleLinReg(X, volumes, ["N° décharges", "Moy. net/décharge", "Semaine"]) : { coefficients: [], rSquared: 0, adjRSquared: 0, fStatistic: 0, fPValue: 1 };
