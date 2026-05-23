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
  // ── Fetch raw data ────────────────────────────────────────────────────────
  const [monthlyRows, siteMonthlyRows, wasteRows, dischRows, dailyCountRows] = await Promise.all([
    db.execute(sql`
     SELECT to_char(date_trunc('week', ts), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(net),0) AS volume, COALESCE(SUM(total),0) AS revenue,
        COUNT(*) AS cnt, COALESCE(AVG(net),0) AS avg_net
      FROM discharges WHERE status != 'cancelled'
      GROUP BY date_trunc('month', ts) ORDER BY 1
    `),
    db.execute(sql`
      SELECT site_id, s.name AS site_name,
to_char(date_trunc('week', d.ts), 'YYYY-MM-DD') AS month
COALESCE(SUM(d.net),0) AS volume, COUNT(*) AS cnt
      FROM discharges d JOIN sites s ON s.id = d.site_id
      WHERE d.status != 'cancelled'
      GROUP BY d.site_id, s.name, date_trunc('week', d.ts) ORDER BY 1, 3
    `),
    db.execute(sql`
      SELECT d.waste_type, COALESCE(wt.label, d.waste_type) AS label, d.site_id,
        COUNT(*) AS cnt, COALESCE(SUM(d.net),0) AS volume
      FROM discharges d LEFT JOIN waste_types wt ON wt.id = d.waste_type
      WHERE d.status != 'cancelled'
      GROUP BY d.waste_type, wt.label, d.site_id
    `),
    db.execute(sql`
      SELECT d.net, d.total, d.site_id, d.waste_type, d.client_name,
        to_char(d.ts, 'YYYY-MM-DD') AS day,
to_char(date_trunc('week', d.ts), 'YYYY-MM-DD') AS month,
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

  // ── Descriptive stats ─────────────────────────────────────────────────────
  function descStats(xs: number[], label: string) {
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
    descStats(volumes, "Volume mensuel (t)"),
    descStats(revenues, "Revenus mensuels (DZD)"),
    descStats(counts, "Décharges / mois"),
    descStats(allDischarges.map(d => d.net), "Poids net par décharge (t)"),
    descStats(allDischarges.map(d => d.total), "Montant par décharge (DZD)"),
    descStats(dailyCounts, "Décharges par jour"),
  ];

  // ── Distribution fitting ──────────────────────────────────────────────────
  const normalFitVol = fitNormal(volumes);
  const poissonFitDay = fitPoisson(dailyCounts);
  const poissonFitMonth = fitPoisson(counts);

  // Histogram bins for net weight per discharge
  const netWeights = allDischarges.map(d => d.net);
  const histogram = histogramBins(netWeights, 12).map(b => ({
    ...b,
    normalPdf: normalPDF(b.binStart + (b.binEnd - b.binStart) / 2, normalFitVol.mu, Math.max(normalFitVol.sigma, 0.01)),
    poissonPmf: 0,
  }));

  // Daily count Poisson histogram
  const maxDailyCount = Math.max(...dailyCounts, 10);
  const poissonHistogram = Array.from({ length: maxDailyCount + 1 }, (_, k) => ({
    k, observed: dailyCounts.filter(c => c === k).length,
    poissonPmf: parseFloat(poissonPMF(k, poissonFitDay.lambda).toFixed(6)),
  })).filter(b => b.observed > 0 || b.poissonPmf > 0.01);

  // Binomial: P(X ≥ 1 discharge | n trucks, p=rate) → not directly applicable; use for: P(cancellation)
  const totalDischarges = allDischarges.length;
  // Use binomial for modelling: among all transactions, p = probability of a discharge on any given weekday
  const workingDaysEstimate = 250;
  const pBinom = Math.min(totalDischarges / workingDaysEstimate, 0.99);
  const binomialN = 5; // trucks per day
  const binomialDist = Array.from({ length: binomialN + 1 }, (_, k) => {
    let pmf = 1;
    for (let i = 0; i < k; i++) pmf *= (binomialN - i) / (i + 1) * pBinom / (1 - pBinom);
    pmf *= (1 - pBinom) ** binomialN;
    for (let i = 1; i <= k; i++) pmf *= (binomialN - i + 1) * pBinom / (i * (1 - pBinom));
    // recalculate cleanly
    const coeff = Array.from({ length: k }, (_, i) => (binomialN - i) / (i + 1)).reduce((a, b) => a * b, 1);
    const pmf2 = coeff * Math.pow(pBinom, k) * Math.pow(1 - pBinom, binomialN - k);
    return { k, pmf: parseFloat(pmf2.toFixed(6)), label: `${k} décharges` };
  });

  // ── Correlations ──────────────────────────────────────────────────────────
  const corrVars = [
    { name: "Volume (t)", data: volumes },
    { name: "Revenus (DZD)", data: revenues },
    { name: "N° décharges", data: counts },
    { name: "Moy. net/décharge", data: monthly.map(m => m.avgNet) },
  ];

  const correlationMatrix: { var1: string; var2: string; r: number; pValue: number; tStat: number; df: number; significant: boolean }[] = [];
  for (let i = 0; i < corrVars.length; i++) {
    for (let j = i + 1; j < corrVars.length; j++) {
      const { r, pValue, tStat, df } = pearsonCorr(corrVars[i].data, corrVars[j].data);
      correlationMatrix.push({ var1: corrVars[i].name, var2: corrVars[j].name, r, pValue, tStat, df, significant: pValue < 0.05 });
    }
  }

  // Full matrix (for heatmap) — include diagonal
  const corrNames = corrVars.map(v => v.name);
  const corrMatrix2D = corrVars.map(v1 => corrVars.map(v2 => {
    if (v1.name === v2.name) return 1;
    const found = correlationMatrix.find(c => (c.var1 === v1.name && c.var2 === v2.name) || (c.var1 === v2.name && c.var2 === v1.name));
    return found?.r ?? 0;
  }));

  // ── Simple regressions ────────────────────────────────────────────────────
  const simpleRegressions = [
    { xVar: "Mois (index)", yVar: "Volume (t)", ...simpleLinReg(volumes.map((_, i) => i), volumes) },
    { xVar: "Volume (t)", yVar: "Revenus (DZD)", ...simpleLinReg(volumes, revenues) },
    { xVar: "N° décharges", yVar: "Volume (t)", ...simpleLinReg(counts, volumes) },
    { xVar: "Mois (index)", yVar: "Revenus (DZD)", ...simpleLinReg(revenues.map((_, i) => i), revenues) },
  ].map(r => ({ ...r, predicted: undefined })); // strip predicted from response

  // ── Multiple regression ───────────────────────────────────────────────────
  // Predict monthly volume from: count, revenue, avg_net, month_index
  const n = monthly.length;
  const X = monthly.map((m, i) => [m.cnt, m.avgNet, i]);
  const mulReg = multipleLinReg(X, volumes, ["N° décharges", "Moy. net/décharge", "Mois"]);

  // ── Hypothesis tests ──────────────────────────────────────────────────────

  // ANOVA — monthly volume by site
  const siteMonthly = siteMonthlyRows.rows as Record<string, unknown>[];
  const siteMap: Record<string, { name: string; volumes: number[] }> = {};
  for (const r of siteMonthly) {
    const sid = String(r.site_id);
    if (!siteMap[sid]) siteMap[sid] = { name: String(r.site_name ?? sid), volumes: [] };
    siteMap[sid].volumes.push(parseFloat(String(r.volume ?? 0)));
  }
  const siteGroups = Object.values(siteMap).filter(s => s.volumes.length >= 2);
  const anova = siteGroups.length >= 2
    ? oneWayAnova(siteGroups.map(s => s.volumes), siteGroups.map(s => s.name))
    : null;

  // Pairwise T-tests between sites
  const siteList = Object.values(siteMap).filter(s => s.volumes.length >= 2);
  const tTests: { group1: string; group2: string; tStat: number; df: number; pValue: number; significant: boolean; mean1: number; mean2: number; cohensD: number }[] = [];
  for (let i = 0; i < siteList.length; i++) {
    for (let j = i + 1; j < siteList.length; j++) {
      const res = twoSampleTTest(siteList[i].volumes, siteList[j].volumes);
      tTests.push({ group1: siteList[i].name, group2: siteList[j].name, tStat: res.tStat, df: res.df, pValue: res.pValue, significant: res.pValue < 0.05, mean1: res.mean1, mean2: res.mean2, cohensD: res.cohensD });
    }
  }

  // Chi-square — waste type × site contingency table
  const wasteRows2 = wasteRows.rows as Record<string, unknown>[];
  const allSites = [...new Set(wasteRows2.map(r => String(r.site_id)))].sort();
  const allWasteTypes = [...new Set(wasteRows2.map(r => String(r.waste_type)))].sort();
  const contingency = allWasteTypes.map(wt =>
    allSites.map(sid => {
      const found = wasteRows2.find(r => String(r.waste_type) === wt && String(r.site_id) === sid);
      return found ? parseInt(String(found.cnt ?? 0)) : 0;
    })
  );
  const chiSq = allSites.length >= 2 && allWasteTypes.length >= 2
    ? chiSquareTest(contingency, allWasteTypes, allSites)
    : null;

  // ── PCA ───────────────────────────────────────────────────────────────────
  const pcaData = siteList
    .map(s => {
      const sRows = siteMonthly.filter(r => String(r.site_name) === s.name);
      return [
        mean(s.volumes),
        std(s.volumes),
        s.volumes.length,
        sRows.reduce((a, r) => a + parseInt(String(r.cnt ?? 0)), 0),
      ];
    })
    .filter(row => row.every(v => isFinite(v)));

  const pcaResult = pcaData.length >= 3
    ? pca(pcaData, ["Volume moyen", "Vol. σ", "N mois", "N décharges"], 2)
    : null;

  // PCA on waste type × site (cross-tabulation)
  const wasteTypePcaData = allWasteTypes.map(wt =>
    allSites.map(sid => {
      const found = wasteRows2.find(r => String(r.waste_type) === wt && String(r.site_id) === sid);
      return found ? parseFloat(String(found.volume ?? 0)) : 0;
    })
  );
  const wastePca = allWasteTypes.length >= 3 && allSites.length >= 2
    ? pca(wasteTypePcaData, allSites, 2)
    : null;

  // ── Time series decomposition ─────────────────────────────────────────────
  const tsd = monthly.length >= 6
    ? timeSeriesDecompose(monthly.map(m => ({ month: m.month, value: m.volume })), Math.min(6, monthly.length))
    : null;

  // Moving averages
  const ma3 = movingAverage(volumes, 3);
  const ma6 = movingAverage(volumes, Math.min(6, volumes.length));
  const movingAverages = monthly.map((m, i) => ({
    month: m.month, raw: m.volume,
    ma3: ma3[i] !== null ? parseFloat(ma3[i]!.toFixed(2)) : null,
    ma6: ma6[i] !== null ? parseFloat(ma6[i]!.toFixed(2)) : null,
    trend: tsd?.points[i]?.trend ?? null,
    seasonal: tsd?.points[i]?.seasonal ?? null,
    residual: tsd?.points[i]?.residual ?? null,
  }));

  // ── Bayesian updating ─────────────────────────────────────────────────────
  const avgVol = mean(volumes);
  const volVar = Math.max(std(volumes) ** 2, 1);
  // Prior: historical average ± 2σ, then update sequentially
  const bayesianUpdates = bayesianSequentialUpdates(
    avgVol * 0.8, // prior mean: 80% of observed average
    volVar * 4,   // prior var: very uncertain
    volVar,
    monthly.map(m => ({ month: m.month, value: m.volume }))
  );

  res.json({
    descriptiveStats,
    distributions: {
      normalFitVolume: normalFitVol,
      poissonFitDaily: poissonFitDay,
      poissonFitMonthly: poissonFitMonth,
      histogram,
      poissonHistogram,
      binomialDist,
      binomialN,
      binomialP: parseFloat(pBinom.toFixed(4)),
    },
    correlations: {
      pairs: correlationMatrix,
      variables: corrNames,
      matrix2D: corrMatrix2D,
    },
    regression: {
      simple: simpleRegressions,
      multiple: mulReg,
    },
    hypothesisTests: {
      anova,
      tTests,
      chiSquare: chiSq,
      chiSquareLabels: { rows: allWasteTypes, cols: allSites },
    },
    pca: {
      sitePca: pcaResult ? { ...pcaResult, labels: siteList.map(s => s.name) } : null,
      wastePca: wastePca ? { ...wastePca, labels: allWasteTypes } : null,
    },
    timeSeries: {
      decomposition: tsd,
      movingAverages,
    },
    bayesian: {
      prior: { mean: parseFloat((avgVol * 0.8).toFixed(4)), variance: parseFloat((volVar * 4).toFixed(4)) },
      updates: bayesianUpdates,
    },
  });
});

export default router;
